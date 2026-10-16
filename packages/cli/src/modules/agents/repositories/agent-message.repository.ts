import { stripHydratedFileData, type AgentDbMessage, type AgentMessage } from '@n8n/agents';
import type { AgentMessageAuthor } from '@n8n/api-types';
import {
	BaseRepository,
	chunkIds,
	isUniqueConstraintError,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { AgentExecutionMessageLink } from '../entities/agent-execution-message-link.entity';
import { AgentExecution } from '../entities/agent-execution.entity';
import { AgentMessageEntity, type AgentMessageOrigin } from '../entities/agent-message.entity';
import { AgentResourceEntity } from '../entities/agent-resource.entity';
import { AgentThreadEntity } from '../entities/agent-thread.entity';

interface RuntimeMessageScope {
	threadId: string;
	resourceId?: string;
}

export class AgentMessageIdConflictError extends UserError {
	constructor(readonly messageId: string) {
		super('A message with this ID already exists');
	}
}

@Service()
export class AgentMessageRepository extends BaseRepository<AgentMessageEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentMessageEntity, dataSource.manager, transactionRunner);
	}

	async createInput(
		params: {
			id?: string;
			threadId: string;
			resourceId: string;
			content: AgentMessage;
			modelContent?: AgentMessage;
			author?: AgentMessageAuthor;
			origin: AgentMessageOrigin;
		},
		ctx: OperationContext,
	): Promise<AgentMessageEntity> {
		const manager = this.managerFor(ctx);
		await manager
			.createQueryBuilder()
			.insert()
			.into(AgentResourceEntity)
			.values({ id: params.resourceId, metadata: null })
			.orIgnore()
			.execute();
		await manager
			.createQueryBuilder()
			.insert()
			.into(AgentThreadEntity)
			.values({ id: params.threadId, resourceId: params.resourceId, title: null, metadata: null })
			.orIgnore()
			.execute();
		const message = manager.create(AgentMessageEntity, {
			id: params.id ?? randomUUID(),
			threadId: params.threadId,
			resourceId: params.resourceId,
			role: 'user',
			type: null,
			content: params.content,
			author: params.author ?? null,
			origin: params.origin,
			modelContent:
				params.modelContent && !isDeepStrictEqual(params.content, params.modelContent)
					? params.modelContent
					: null,
			modelContextAt: null,
		});
		try {
			// TypeORM's partial type cannot represent unknown values in JSON message content.
			await manager.insert(
				AgentMessageEntity,
				message as QueryDeepPartialEntity<AgentMessageEntity>,
			);
		} catch (error) {
			if (isUniqueConstraintError(error)) throw new AgentMessageIdConflictError(message.id);
			throw error;
		}
		return await manager.findOneByOrFail(AgentMessageEntity, { id: message.id });
	}

	/** The caller holds the session lock so concurrent input cannot take the same position. */
	async linkExecutionInput(
		executionId: string,
		messageId: string,
		scope: { threadId: string; resourceId: string },
		ctx: OperationContext,
	): Promise<void> {
		const manager = this.managerFor(ctx);
		if (
			!(await manager.existsBy(AgentMessageEntity, {
				id: messageId,
				threadId: scope.threadId,
				resourceId: scope.resourceId,
			}))
		) {
			throw new UnexpectedError('The input message does not belong to this session and resource');
		}
		const inputs = await manager.find(AgentExecutionMessageLink, {
			select: ['messageId', 'position'],
			where: { executionId, direction: 'input' },
			order: { position: 'DESC' },
		});
		if (inputs.some((input) => input.messageId === messageId)) return;
		await manager.insert(AgentExecutionMessageLink, {
			executionId,
			messageId,
			direction: 'input',
			position: (inputs[0]?.position ?? -1) + 1,
		});
	}

	async updatePendingInput(
		id: string,
		content: AgentMessage,
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).save(this.create({ id, content, modelContent: null }));
	}

	async clearPendingInput(id: string, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).update(AgentMessageEntity, id, {
			content: { role: 'user', content: [] },
			author: null,
			modelContent: null,
			modelContextAt: null,
		});
	}

	async copyExecutionInputs(
		executionId: string,
		predecessorId: string,
		threadId: string,
		ctx: OperationContext,
	): Promise<string[]> {
		const manager = this.managerFor(ctx);
		const inputs = await manager.find(AgentExecutionMessageLink, {
			where: { executionId: predecessorId, direction: 'input' },
			order: { position: 'ASC' },
		});
		if (inputs.length === 0) return [];
		if (!(await manager.existsBy(AgentExecution, { id: predecessorId, threadId }))) {
			throw new UnexpectedError('The preceding execution does not belong to this session');
		}
		await manager.insert(
			AgentExecutionMessageLink,
			inputs.map(({ messageId, position }) => ({
				executionId,
				messageId,
				position,
				direction: 'input' as const,
			})),
		);
		return inputs.map(({ messageId }) => messageId);
	}

	async findExecutionInputs(executionIds: string[]): Promise<Map<string, AgentMessageEntity[]>> {
		const inputs = new Map<string, AgentMessageEntity[]>();
		for (const ids of chunkIds(executionIds)) {
			const links = await this.manager.find(AgentExecutionMessageLink, {
				where: { executionId: In(ids), direction: 'input' },
				relations: { message: true },
				order: { position: 'ASC' },
			});
			for (const link of links) {
				const messages = inputs.get(link.executionId) ?? [];
				messages.push(link.message);
				inputs.set(link.executionId, messages);
			}
		}
		return inputs;
	}

	async saveRuntimeMessages(
		params: RuntimeMessageScope & {
			resourceId: string;
			messages: AgentDbMessage[];
			executionId?: string;
		},
		ctx: OperationContext = {},
	): Promise<void> {
		if (params.messages.length === 0) return;
		await this.runInTransaction(ctx, async (manager) => {
			const now = new Date();
			if (params.executionId) {
				const ownership = await manager.update(
					AgentExecution,
					{ id: params.executionId, threadId: params.threadId, status: 'running' },
					{ updatedAt: now },
				);
				if (ownership.affected !== 1)
					throw new OperationalError('Execution no longer owns message persistence');
			}
			const ids = params.messages.map(({ id }) => id);
			const existing = new Map(
				(await manager.findBy(AgentMessageEntity, { id: In(ids) })).map((message) => [
					message.id,
					message,
				]),
			);
			const inputLinks = await manager.findBy(AgentExecutionMessageLink, {
				messageId: In(ids),
				direction: 'input',
			});
			const inputIds = new Set(inputLinks.map(({ messageId }) => messageId));
			const messages = params.messages.map((message) =>
				this.runtimeMessageEntity(
					message,
					existing.get(message.id),
					inputIds.has(message.id),
					params,
					now,
				),
			);
			// TypeORM's partial type does not accept open JSON metadata.
			await manager.upsert(
				AgentMessageEntity,
				messages as Array<QueryDeepPartialEntity<AgentMessageEntity>>,
				['id'],
			);
			if (!params.executionId) return;
			const executionLinks = await manager.find(AgentExecutionMessageLink, {
				where: { executionId: params.executionId },
				order: { position: 'ASC' },
			});
			// A legacy continuation has no canonical input. Keep its legacy representation.
			if (!executionLinks.some(({ direction }) => direction === 'input')) return;
			const outputs = executionLinks.filter(({ direction }) => direction === 'output');
			const outputIds = new Set(outputs.map(({ messageId }) => messageId));
			let position = (outputs.at(-1)?.position ?? -1) + 1;
			const links: Array<
				Pick<AgentExecutionMessageLink, 'executionId' | 'messageId' | 'direction' | 'position'>
			> = [];
			// SQLite upserts can reorder IDs on the entity objects.
			for (const id of ids) {
				if (inputIds.has(id) || outputIds.has(id)) continue;
				links.push({
					executionId: params.executionId,
					messageId: id,
					direction: 'output',
					position: position++,
				});
				outputIds.add(id);
			}
			if (links.length > 0) await manager.insert(AgentExecutionMessageLink, links);
		});
	}

	private runtimeMessageEntity(
		message: AgentDbMessage,
		existing: AgentMessageEntity | undefined,
		isInput: boolean,
		scope: RuntimeMessageScope & { resourceId: string },
		now: Date,
	): AgentMessageEntity {
		if (existing && existing.threadId !== scope.threadId) {
			throw new UnexpectedError('The message does not belong to this session');
		}
		const { id, createdAt, ...content } = stripHydratedFileData(message);
		if (existing && isInput) {
			existing.modelContent = isDeepStrictEqual(existing.content, content) ? null : content;
			existing.modelContextAt = existing.modelContextAt ?? createdAt;
			existing.updatedAt = now;
			return existing;
		}
		return this.create({
			id,
			threadId: scope.threadId,
			resourceId: scope.resourceId,
			role: 'role' in content ? content.role : 'custom',
			type: content.type ?? null,
			content,
			createdAt: existing?.createdAt ?? createdAt,
			updatedAt: now,
			modelContextAt: existing?.modelContextAt ?? createdAt,
			modelContent: null,
			author: existing?.author ?? null,
			origin: existing?.origin ?? null,
		});
	}

	async discardRuntimeInput(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		await this.runInTransaction({}, async (manager) => {
			const inputs = await manager.findBy(AgentExecutionMessageLink, {
				messageId: In(ids),
				direction: 'input',
			});
			const retainedIds = new Set(inputs.map(({ messageId }) => messageId));
			if (retainedIds.size > 0) {
				await manager.update(
					AgentMessageEntity,
					{ id: In([...retainedIds]) },
					{ modelContextAt: null, modelContent: null },
				);
			}
			const deletedIds = ids.filter((id) => !retainedIds.has(id));
			if (deletedIds.length > 0) await manager.delete(AgentMessageEntity, deletedIds);
		});
	}

	async findRuntimeMessages(
		scope: RuntimeMessageScope,
		opts?: {
			limit?: number;
			before?: Date;
			since?: { sinceCreatedAt: Date; sinceMessageId: string };
		},
	): Promise<AgentMessageEntity[]> {
		const query = this.createQueryBuilder('message').where('message.threadId = :threadId', scope);
		// Old SDK writers have no origin metadata and retain their existing ordering.
		query.andWhere('(message.modelContextAt IS NOT NULL OR message.origin IS NULL)');
		const timestamp = 'COALESCE(message.modelContextAt, message.createdAt)';
		if (scope.resourceId !== undefined) query.andWhere('message.resourceId = :resourceId', scope);
		if (opts?.before) query.andWhere(`${timestamp} < :before`, { before: opts.before });
		if (opts?.since) {
			query.andWhere(
				`(${timestamp} > :sinceCreatedAt OR (${timestamp} = :sinceCreatedAt AND message.id > :sinceMessageId))`,
				opts.since,
			);
		}
		const direction = opts?.limit !== undefined ? 'DESC' : 'ASC';
		query.orderBy(timestamp, direction).addOrderBy('message.id', direction);
		if (opts?.limit !== undefined) query.take(opts.limit);
		const messages = await query.getMany();
		return opts?.limit !== undefined ? messages.reverse() : messages;
	}

	/** Threads the resource has posted in, most recent activity first. */
	async findRecentThreadIdsByResourceId(
		agentId: string,
		resourceId: string,
		limit: number,
	): Promise<string[]> {
		// Thread IDs start with the agent ID because this table has no agent column.
		const rows = await this.createQueryBuilder('message')
			.select('message.threadId', 'threadId')
			.where('message.resourceId = :resourceId', { resourceId })
			.andWhere('message.threadId LIKE :threadPrefix', { threadPrefix: `${agentId}:%` })
			.groupBy('message.threadId')
			.orderBy('MAX(message.createdAt)', 'DESC')
			.limit(limit)
			.getRawMany<{ threadId: string }>();

		return rows.map(({ threadId }) => threadId);
	}
}
