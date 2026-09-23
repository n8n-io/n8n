import type { ToolContext } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';

import type {
	IntegrationMessageContext,
	IntegrationMessageContextStore,
	SessionBinding,
} from './integration-tool-types';
import {
	isIntegrationMessageContext,
	readIntegrationMessageContext,
} from './integration-message-context';
import { AgentSessionLeaseService } from '../agent-session-lease.service';
import { AgentResourceRepository } from '../repositories/agent-resource.repository';
import { AgentThreadRepository } from '../repositories/agent-thread.repository';

const MESSAGE_CONTEXT_METADATA_KEY = 'currentMessageContext';
const CONTINUE_AS_METADATA_KEY = 'continueAs';
const BOUND_THREADS_METADATA_KEY = 'boundThreads';

/**
 * Each write is fenced by the session lease when a turn makes it, for example
 * an integration tool or the claim of a resume.
 */
@Service()
export class IntegrationMessageContextService implements IntegrationMessageContextStore {
	constructor(
		private readonly threadRepository: AgentThreadRepository,
		private readonly resourceRepository: AgentResourceRepository,
		private readonly logger: Logger,
		private readonly sessionLeases: AgentSessionLeaseService,
	) {}

	async getLatest(threadId: string): Promise<IntegrationMessageContext | null> {
		const thread = await this.threadRepository.findOneBy({ id: threadId });
		const value = this.parseMetadata(thread?.metadata)[MESSAGE_CONTEXT_METADATA_KEY];
		return isIntegrationMessageContext(value) ? value : null;
	}

	async getForResume(
		persistence: NonNullable<ToolContext['persistence']>,
	): Promise<IntegrationMessageContext | null> {
		const context = readIntegrationMessageContext(persistence);
		return context === undefined ? await this.getLatest(persistence.threadId) : context;
	}

	async getLatestForIncoming(threadId: string): Promise<IntegrationMessageContext | null> {
		try {
			return await this.getLatest(threadId);
		} catch (error) {
			this.logger.warn('Failed to read previous integration message context', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	async installIncoming(
		context: IntegrationMessageContext,
		memory: SessionBinding,
		conversation: SessionBinding,
	): Promise<void> {
		const scopes =
			conversation.threadId === memory.threadId ? [conversation] : [conversation, memory];
		for (const { threadId, resourceId } of scopes) {
			try {
				await this.setLatest(threadId, resourceId, context);
			} catch (error) {
				this.logger.warn('Failed to update integration message context', {
					threadId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	async setLatest(
		threadId: string,
		resourceId: string,
		context: IntegrationMessageContext,
	): Promise<void> {
		await this.sessionLeases.fencedWrite(
			{},
			async (ctx) =>
				await this.writeMetadata(
					threadId,
					resourceId,
					{ [MESSAGE_CONTEXT_METADATA_KEY]: context },
					ctx,
				),
		);
	}

	async bindSession(derivedThreadId: string, origin: SessionBinding): Promise<void> {
		if (derivedThreadId === origin.threadId) return;
		await this.sessionLeases.fencedWrite({}, async (ctx) => {
			if (await this.readSessionBinding(derivedThreadId, ctx)) return;
			await this.appendBoundThread(origin.threadId, derivedThreadId, ctx);
			await this.writeContinueAsIfAbsent(derivedThreadId, origin, ctx);
		});
	}

	async resolveSession(derivedThreadId: string): Promise<SessionBinding | null> {
		return await this.readSessionBinding(derivedThreadId, {});
	}

	async unbindSession(derivedThreadId: string): Promise<void> {
		await this.sessionLeases.fencedWrite(
			{},
			async (ctx) => await this.removeSessionBinding(derivedThreadId, ctx),
		);
	}

	async clearSessionBindings(originThreadId: string): Promise<void> {
		await this.sessionLeases.fencedWrite({}, async (ctx) => {
			const existing = await this.threadRepository.findByIdInContext(originThreadId, ctx);
			const metadata = this.parseMetadata(existing?.metadata);
			const bound = Array.isArray(metadata[BOUND_THREADS_METADATA_KEY])
				? (metadata[BOUND_THREADS_METADATA_KEY] as string[])
				: [];
			if (!existing || bound.length === 0) return;
			for (const id of bound) await this.removeSessionBinding(id, ctx);
			metadata[BOUND_THREADS_METADATA_KEY] = [];
			existing.metadata = JSON.stringify(metadata);
			await this.threadRepository.saveInContext(existing, ctx);
		});
	}

	private async readSessionBinding(
		derivedThreadId: string,
		ctx: OperationContext,
	): Promise<SessionBinding | null> {
		const thread = await this.threadRepository.findByIdInContext(derivedThreadId, ctx);
		const value = this.parseMetadata(thread?.metadata)[CONTINUE_AS_METADATA_KEY];
		return isSessionBinding(value) ? value : null;
	}

	private async removeSessionBinding(
		derivedThreadId: string,
		ctx: OperationContext,
	): Promise<void> {
		await this.writeMetadata(
			derivedThreadId,
			undefined,
			{ [CONTINUE_AS_METADATA_KEY]: undefined },
			ctx,
		);
	}

	private async writeContinueAsIfAbsent(
		derivedThreadId: string,
		origin: SessionBinding,
		ctx: OperationContext,
	): Promise<void> {
		const existing = await this.threadRepository.findByIdInContext(derivedThreadId, ctx);
		const metadata = this.parseMetadata(existing?.metadata);
		if (isSessionBinding(metadata[CONTINUE_AS_METADATA_KEY])) return;
		metadata[CONTINUE_AS_METADATA_KEY] = origin;
		if (existing) {
			existing.metadata = JSON.stringify(metadata);
			await this.threadRepository.saveInContext(existing, ctx);
			return;
		}
		await this.resourceRepository.ensureExists(origin.resourceId, ctx);
		await this.threadRepository.saveInContext(
			this.threadRepository.create({
				id: derivedThreadId,
				resourceId: origin.resourceId,
				title: null,
				metadata: JSON.stringify(metadata),
			}),
			ctx,
		);
	}

	private async appendBoundThread(
		originThreadId: string,
		derivedThreadId: string,
		ctx: OperationContext,
	): Promise<void> {
		const existing = await this.threadRepository.findByIdInContext(originThreadId, ctx);
		const metadata = this.parseMetadata(existing?.metadata);
		const bound = Array.isArray(metadata[BOUND_THREADS_METADATA_KEY])
			? (metadata[BOUND_THREADS_METADATA_KEY] as string[]).filter((id) => id !== derivedThreadId)
			: [];
		bound.push(derivedThreadId);
		metadata[BOUND_THREADS_METADATA_KEY] = bound;
		if (existing) {
			existing.metadata = JSON.stringify(metadata);
			await this.threadRepository.saveInContext(existing, ctx);
			return;
		}
		await this.resourceRepository.ensureExists(originThreadId, ctx);
		await this.threadRepository.saveInContext(
			this.threadRepository.create({
				id: originThreadId,
				resourceId: originThreadId,
				title: null,
				metadata: JSON.stringify(metadata),
			}),
			ctx,
		);
	}

	private async writeMetadata(
		threadId: string,
		resourceId: string | undefined,
		patch: Record<string, unknown>,
		ctx: OperationContext,
	): Promise<void> {
		const existing = await this.threadRepository.findByIdInContext(threadId, ctx);
		const metadata = {
			...this.parseMetadata(existing?.metadata),
			...patch,
		};

		if (existing) {
			existing.metadata = JSON.stringify(metadata);
			await this.threadRepository.saveInContext(existing, ctx);
			return;
		}

		await this.resourceRepository.ensureExists(resourceId ?? threadId, ctx);
		await this.threadRepository.saveInContext(
			this.threadRepository.create({
				id: threadId,
				resourceId: resourceId ?? threadId,
				title: null,
				metadata: JSON.stringify(metadata),
			}),
			ctx,
		);
	}

	private parseMetadata(value: string | null | undefined): Record<string, unknown> {
		if (!value) return {};
		try {
			const parsed = jsonParse<unknown>(value);
			return isRecord(parsed) ? parsed : {};
		} catch {
			return {};
		}
	}
}

function isSessionBinding(value: unknown): value is SessionBinding {
	return (
		isRecord(value) && typeof value.threadId === 'string' && typeof value.resourceId === 'string'
	);
}
