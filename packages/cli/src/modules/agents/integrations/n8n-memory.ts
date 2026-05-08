import type {
	AgentDbMessage,
	AgentMessage,
	BuiltMemory,
	MemoryDescriptor,
	Thread,
} from '@n8n/agents';
import { Service } from '@n8n/di';
import type { FindOptionsWhere } from '@n8n/typeorm';
import { LessThan, Like } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import type { AgentMessageEntity } from '../entities/agent-message.entity';
import { AgentThreadEntity } from '../entities/agent-thread.entity';
import { AgentMessageRepository } from '../repositories/agent-message.repository';
import { AgentResourceRepository } from '../repositories/agent-resource.repository';
import { AgentThreadRepository } from '../repositories/agent-thread.repository';

/** Key inside the metadata JSON where working memory content is stored. */
const WORKING_MEMORY_KEY = 'workingMemory';

@Service()
export class N8nMemory implements BuiltMemory {
	constructor(
		private readonly threadRepository: AgentThreadRepository,
		private readonly messageRepository: AgentMessageRepository,
		private readonly resourceRepository: AgentResourceRepository,
	) {}

	// ── Thread management ────────────────────────────────────────────────

	async getThread(threadId: string): Promise<Thread | null> {
		const entity = await this.threadRepository.findOneBy({ id: threadId });
		if (!entity) return null;
		return this.toThread(entity);
	}

	async saveThread(thread: Omit<Thread, 'createdAt' | 'updatedAt'>): Promise<Thread> {
		await this.ensureResource(thread.resourceId);

		const existing = await this.threadRepository.findOneBy({ id: thread.id });

		if (existing) {
			// `resourceId` is treated as immutable on existing threads. Some thread
			// IDs can receive messages from more than one resource; overwriting the
			// column on each save would make ownership depend on the last writer.
			// Per-user scoping is enforced at the message level via resourceId.
			if (thread.title !== undefined) existing.title = thread.title;
			if (thread.metadata !== undefined) {
				existing.metadata = thread.metadata ? JSON.stringify(thread.metadata) : null;
			}
			const saved = await this.threadRepository.save(existing);
			return this.toThread(saved);
		}

		const entity = this.threadRepository.create({
			id: thread.id,
			resourceId: thread.resourceId,
			title: thread.title ?? null,
			metadata: thread.metadata ? JSON.stringify(thread.metadata) : null,
		});
		const saved = await this.threadRepository.save(entity);
		return this.toThread(saved);
	}

	private async ensureResource(resourceId: string): Promise<void> {
		const exists = await this.resourceRepository.existsBy({ id: resourceId });
		if (!exists) {
			await this.resourceRepository.save(
				this.resourceRepository.create({ id: resourceId, metadata: null }),
			);
		}
	}

	async deleteThread(threadId: string): Promise<void> {
		await this.threadRepository.delete({ id: threadId });
	}

	async deleteThreadsByPrefix(threadIdPrefix: string): Promise<void> {
		await this.threadRepository.delete({ id: Like(`${threadIdPrefix}%`) });
	}

	// ── Message persistence ──────────────────────────────────────────────

	async getMessages(
		threadId: string,
		opts?: { limit?: number; before?: Date; resourceId?: string },
	): Promise<AgentDbMessage[]> {
		// `resourceId` is the per-user scope for any thread that carries messages
		// for more than one resource. Use an explicit `!== undefined` check — a
		// falsy (empty-string) value would otherwise drop the filter and leak other
		// users' messages.
		const where: FindOptionsWhere<AgentMessageEntity> = {
			threadId,
			...(opts?.before && { createdAt: LessThan(opts.before) }),
			...(opts?.resourceId !== undefined && { resourceId: opts.resourceId }),
		};

		const entities = await this.messageRepository.find({
			where,
			order: { createdAt: opts?.limit !== undefined ? 'DESC' : 'ASC' },
			...(opts?.limit !== undefined && { take: opts.limit }),
		});
		if (opts?.limit !== undefined) {
			entities.reverse();
		}

		return entities.map((e) => {
			const msg = e.content as AgentMessage & { id?: string };
			msg.id = e.id;
			return msg as AgentDbMessage;
		});
	}

	async saveMessages(args: {
		threadId: string;
		resourceId: string;
		messages: AgentDbMessage[];
	}): Promise<void> {
		if (args.messages.length === 0) return;

		// Upsert by id — bulk INSERT … ON CONFLICT (id) DO UPDATE avoids the
		// per-row SELECT that save() performs. createdAt is passed explicitly so
		// the column is preserved on conflict; updatedAt is set manually because
		// the @BeforeUpdate hook does not fire during upsert.
		const now = new Date();
		const entities = args.messages.map((dbMsg) => {
			const role = 'role' in dbMsg ? (dbMsg.role as string) : 'custom';
			const type = 'type' in dbMsg ? (dbMsg.type as string) : null;
			return {
				id: dbMsg.id,
				threadId: args.threadId,
				resourceId: args.resourceId,
				role,
				type: type ?? null,
				content: dbMsg as unknown as Record<string, unknown>,
				createdAt: dbMsg.createdAt,
				updatedAt: now,
			} as QueryDeepPartialEntity<AgentMessageEntity>;
		});

		await this.messageRepository.upsert(entities, ['id']);
	}

	async deleteMessages(messageIds: string[]): Promise<void> {
		if (messageIds.length === 0) return;
		await this.messageRepository.delete(messageIds);
	}

	async deleteMessagesByThread(threadId: string, resourceId?: string): Promise<void> {
		// Mirrors `getMessages`: explicit `!== undefined` check so that a falsy
		// (empty-string) `resourceId` cannot accidentally delete every user's
		// messages on a shared thread.
		await this.messageRepository.delete({
			threadId,
			...(resourceId !== undefined && { resourceId }),
		});
	}

	// ── Working memory ───────────────────────────────────────────────────

	async getWorkingMemory(params: {
		threadId: string;
		resourceId: string;
		scope: 'resource' | 'thread';
	}): Promise<string | null> {
		if (params.scope === 'resource') {
			const resource = await this.resourceRepository.findOneBy({ id: params.resourceId });
			return this.extractWorkingMemory(resource?.metadata ?? null);
		}

		const thread = await this.threadRepository.findOneBy({ id: params.threadId });
		return this.extractWorkingMemory(thread?.metadata ?? null);
	}

	async saveWorkingMemory(
		params: { threadId: string; resourceId: string; scope: 'resource' | 'thread' },
		content: string,
	): Promise<void> {
		if (params.scope === 'resource') {
			await this.upsertResourceMetadata(params.resourceId, content);
		} else {
			await this.upsertThreadMetadata(params.threadId, params.resourceId, content);
		}
	}

	// ── Descriptor ───────────────────────────────────────────────────────

	describe(): MemoryDescriptor {
		return { name: 'n8n', connectionParams: {}, constructorName: this.constructor.name };
	}

	// ── Helpers ──────────────────────────────────────────────────────────

	private toThread(entity: AgentThreadEntity): Thread {
		let metadata: Record<string, unknown> | undefined;
		if (entity.metadata) {
			try {
				metadata = JSON.parse(entity.metadata) as Record<string, unknown>;
			} catch {
				metadata = undefined;
			}
		}
		return {
			id: entity.id,
			resourceId: entity.resourceId,
			title: entity.title ?? undefined,
			metadata,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}

	private extractWorkingMemory(metadataJson: string | null): string | null {
		if (!metadataJson) return null;
		try {
			const parsed = JSON.parse(metadataJson) as Record<string, unknown>;
			const wm = parsed[WORKING_MEMORY_KEY];
			return typeof wm === 'string' ? wm : null;
		} catch {
			return null;
		}
	}

	private mergeWorkingMemory(existingJson: string | null, content: string): string {
		let parsed: Record<string, unknown> = {};
		if (existingJson) {
			try {
				parsed = JSON.parse(existingJson) as Record<string, unknown>;
			} catch {
				// start fresh on corrupt JSON
			}
		}
		parsed[WORKING_MEMORY_KEY] = content;
		return JSON.stringify(parsed);
	}

	private async upsertResourceMetadata(resourceId: string, content: string): Promise<void> {
		const existing = await this.resourceRepository.findOneBy({ id: resourceId });
		if (existing) {
			existing.metadata = this.mergeWorkingMemory(existing.metadata, content);
			await this.resourceRepository.save(existing);
		} else {
			const entity = this.resourceRepository.create({
				id: resourceId,
				metadata: this.mergeWorkingMemory(null, content),
			});
			await this.resourceRepository.save(entity);
		}
	}

	private async upsertThreadMetadata(
		threadId: string,
		resourceId: string,
		content: string,
	): Promise<void> {
		const existing = await this.threadRepository.findOneBy({ id: threadId });
		if (existing) {
			existing.metadata = this.mergeWorkingMemory(existing.metadata, content);
			await this.threadRepository.save(existing);
			return;
		}

		await this.ensureResource(resourceId);
		await this.threadRepository.save(
			this.threadRepository.create({
				id: threadId,
				resourceId,
				title: null,
				metadata: this.mergeWorkingMemory(null, content),
			}),
		);
	}
}
