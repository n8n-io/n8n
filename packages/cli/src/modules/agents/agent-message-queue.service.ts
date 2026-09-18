import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { createDeferredPromise, type IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { UserError } from 'n8n-workflow';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import {
	AgentConversationLeaseService,
	type AgentConversationOwner,
} from './agent-conversation-lease.service';
import { AgentConversationLeaseTimeoutError } from './agent-conversation-lease.types';
import { AgentExecutionService } from './agent-execution.service';
import { type AgentQueueInput, type QueueExecutionContext } from './agent-message-queue.types';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';
import { AgentRepository } from './repositories/agent.repository';

type PreviewWaiter = {
	threadId: string;
	execute: (context: QueueExecutionContext) => Promise<void>;
	signal: AbortSignal;
	done: IDeferredPromise<void>;
};

@Service()
export class AgentMessageQueueService {
	static readonly LIVENESS_GRACE_MS = 2 * 60_000;
	private readonly previews = new Map<string, PreviewWaiter>();
	private readonly processing = new Map<string, AgentConversationOwner>();
	private readonly drains = new Map<string, Promise<void>>();
	private readonly requested = new Set<string>();
	private readonly stopping = new AbortController();
	private heartbeatTimer?: NodeJS.Timeout;

	constructor(
		private readonly logger: Logger,
		private readonly repository: AgentMessageQueueRepository,
		private readonly leases: AgentConversationLeaseService,
		private readonly checkpoints: N8NCheckpointStorage,
		private readonly integrations: ChatIntegrationService,
		private readonly agents: AgentRepository,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly executionService: AgentExecutionService,
		private readonly attachments: AgentChatAttachmentService,
		private readonly publisher: Publisher,
	) {
		this.logger = this.logger.scoped('agents');
	}

	start(): void {
		if (this.heartbeatTimer) return;
		this.heartbeatTimer = setInterval(() => {
			void this.heartbeat().catch((error: unknown) =>
				this.logger.warn('Agent queue heartbeat failed', { error }),
			);
		}, 30_000);
		this.heartbeatTimer.unref();
	}

	async enqueue(input: AgentQueueInput): Promise<string> {
		this.stopping.signal.throwIfAborted();
		const entry = await this.repository.enqueue(input);
		this.notify(input.threadId);
		return entry.id;
	}

	async enqueuePreview(
		input: AgentQueueInput,
		execute: PreviewWaiter['execute'],
		signal: AbortSignal,
	): Promise<void> {
		this.stopping.signal.throwIfAborted();
		signal.throwIfAborted();
		const entry = await this.repository.enqueue(input);
		const done = createDeferredPromise();
		this.previews.set(entry.id, { threadId: input.threadId, execute, signal, done });
		const cancel = () => {
			void this.cancelPreview(entry.id).catch((error: unknown) => {
				this.logger.warn('Failed to cancel queued preview', { id: entry.id, error });
				done.reject(ensureError(error));
			});
		};
		signal.addEventListener('abort', cancel, { once: true });
		if (signal.aborted || this.stopping.signal.aborted) cancel();
		else this.notify(input.threadId);
		try {
			await done.promise;
		} finally {
			signal.removeEventListener('abort', cancel);
			this.previews.delete(entry.id);
		}
	}

	async getResumeScope(agentId: string, runId: string, resourceId?: string) {
		const status = await this.checkpoints.getStatus(runId, agentId);
		if (status.status !== 'active' || status.checkpoint.status !== 'suspended') {
			throw new UserError('This action has already been handled or has expired');
		}
		const memory = status.checkpoint.persistence;
		if (
			!memory ||
			memory.delegated ||
			(resourceId !== undefined && memory.resourceId !== resourceId)
		) {
			throw new UserError(`Checkpoint ${runId} does not belong to this chat`);
		}
		return { threadId: memory.threadId, resourceId: memory.resourceId };
	}

	async cancelWaiting(threadId: string): Promise<void> {
		await this.repository.cancelWaiting(threadId);
		this.notify(threadId);
	}

	async hasEntries(threadId: string): Promise<boolean> {
		return await this.repository.hasEntries(threadId);
	}

	private async cancelPreview(id: string): Promise<void> {
		if (!(await this.repository.cancelQueued(id))) return;
		const preview = this.previews.get(id);
		preview?.done.reject(new UserError('Message was cancelled'));
		if (preview) this.notify(preview.threadId);
	}

	@OnPubSubEvent('drain-agent-message-queue', { instanceType: 'main' })
	handleDrainRequest({ threadId }: { threadId: string }): void {
		void this.drain(threadId).catch((error: unknown) => {
			this.logger.error('Failed to drain agent message queue', { threadId, error });
		});
	}

	notify(threadId: string): void {
		if (this.stopping.signal.aborted) return;
		this.handleDrainRequest({ threadId });
		this.notifyPeers(threadId);
	}

	private notifyPeers(threadId: string): void {
		void this.publisher
			.publishCommand({ command: 'drain-agent-message-queue', payload: { threadId } })
			.catch((error: unknown) =>
				this.logger.warn('Failed to signal agent message queue', { threadId, error }),
			);
	}

	async onConnectionReady(agentId: string): Promise<void> {
		for (const threadId of await this.repository.findWaitingThreads(agentId)) this.notify(threadId);
	}

	async drain(threadId: string): Promise<void> {
		if (this.stopping.signal.aborted) return;
		this.requested.add(threadId);
		const existing = this.drains.get(threadId);
		if (existing) return await existing;
		const drain = this.drainThread(threadId)
			.catch((error: unknown) => {
				if (!this.stopping.signal.aborted) throw error;
			})
			.finally(() => {
				this.drains.delete(threadId);
				// An enqueue can arrive after the loop's last check but before this cleanup.
				if (this.requested.has(threadId)) this.handleDrainRequest({ threadId });
			});
		this.drains.set(threadId, drain);
		await drain;
	}

	private async drainThread(threadId: string): Promise<void> {
		do {
			this.requested.delete(threadId);
			await this.settleRemovedPreviews(threadId);
			const next = await this.repository.findNext(threadId);
			if (!next) break;
			const processed = await this.leases.withLease(
				next.agentId,
				threadId,
				async (signal) => await this.processNext(threadId, signal),
				{ signal: this.stopping.signal },
			);
			if (processed) this.requested.add(threadId);
		} while (this.requested.has(threadId) && !this.stopping.signal.aborted);
	}

	private async processNext(threadId: string, leaseSignal: AbortSignal): Promise<boolean> {
		if (this.stopping.signal.aborted || leaseSignal.aborted) return false;
		if (await this.repository.hasProcessing(threadId)) return false;
		if (await this.executionRepository.existsRunningByThread(threadId)) return false;
		let entry = await this.repository.findNext(threadId);
		if (!entry) return false;
		const owner = this.leases.requireOwner(threadId);
		if (owner.lease.agentId !== entry.agentId) return true;

		const payload = entry.payload;
		const preview = this.previews.get(entry.id);
		let execute: PreviewWaiter['execute'];
		if (payload.source === 'preview') {
			// Only the HTTP owner has the response stream. A peer must keep its place.
			if (!preview) return false;
			execute = preview.execute;
		} else {
			const agent = await this.agents.findById(entry.agentId);
			if (
				!agent ||
				agent.projectId !== payload.projectId ||
				!agent.integrations.some(
					(integration) =>
						integration.type === payload.integrationType &&
						integration.credentialId === payload.credentialId,
				)
			) {
				this.logger.warn('Removed queued message for an unavailable agent connection', {
					id: entry.id,
					threadId,
				});
				const id = entry.id;
				await this.leases.write(owner, async (ctx) => await this.repository.removeEntry(id, ctx));
				return true;
			}
			const bridge = this.integrations.getBridge(
				entry.agentId,
				payload.integrationType,
				payload.credentialId,
			);
			if (!bridge) return false;
			execute = async (context) => {
				if (entry?.payload.source === 'integration') {
					await bridge.processQueuedInput(entry.payload, threadId, context);
				}
			};
		}
		if (
			entry.kind === 'message' &&
			(await this.checkpoints.findSuspendedForThread(entry.agentId, threadId))
		)
			return false;
		const selectedId = entry.id;
		entry = await this.leases.write(owner, async (ctx) => {
			if (!(await this.repository.markProcessing(selectedId, ctx))) return null;
			return await this.repository.findById(selectedId, ctx);
		});
		if (!entry) return true;
		const id = entry.id;
		this.processing.set(id, owner);
		const abortSignal = AbortSignal.any([
			leaseSignal,
			this.stopping.signal,
			...(preview ? [preview.signal] : []),
		]);
		try {
			abortSignal.throwIfAborted();
			await execute({
				abortSignal,
				onExecutionStarted: async (executionId) =>
					await this.leases.write(
						owner,
						async (ctx) => await this.repository.linkExecution(id, executionId, ctx),
					),
			});
			preview?.done.resolve();
		} catch (error) {
			preview?.done.reject(ensureError(error));
			this.logger.warn('Queued agent input ended with an error', { id: entry.id, threadId, error });
		} finally {
			this.processing.delete(id);
			await this.leases.write(owner, async (ctx) => await this.repository.removeEntry(id, ctx));
			this.notifyPeers(threadId);
		}
		return true;
	}

	private async settleRemovedPreviews(threadId: string): Promise<void> {
		const ids = [...this.previews]
			.filter(([, preview]) => preview.threadId === threadId)
			.map(([id]) => id);
		const present = new Set(await this.repository.findExistingIds(ids));
		for (const id of ids) {
			if (!present.has(id))
				this.previews.get(id)?.done.reject(new UserError('Message was cancelled'));
		}
	}

	private async heartbeat(): Promise<void> {
		for (const [id, owner] of this.processing) {
			if (owner.signal.aborted) continue;
			await this.leases.write(owner, async (ctx) => await this.repository.touchProcessing(id, ctx));
		}
		const ids = [...new Set([...this.processing.keys(), ...this.previews.keys()])];
		const present = new Set(await this.repository.touchLiveEntries(ids));
		for (const id of ids) {
			if (!present.has(id))
				this.previews.get(id)?.done.reject(new UserError('Message was cancelled'));
		}
	}

	async recover(): Promise<void> {
		const graceMs = AgentMessageQueueService.LIVENESS_GRACE_MS;
		for (const { agentId, threadId } of await this.repository.findStaleConversations(graceMs)) {
			try {
				await this.leases.withLease(
					agentId,
					threadId,
					async (leaseSignal) => {
						const owner = this.leases.requireOwner(threadId);
						for (const entry of await this.repository.findStale(threadId, graceMs)) {
							if (leaseSignal.aborted) return;
							if (entry.executionId) {
								const execution = await this.executionRepository.findRunningById(entry.executionId);
								if (execution) {
									if (leaseSignal.aborted) return;
									if (
										!(await this.executionService.finalizeInterruptedExecution(execution, graceMs))
									)
										continue;
								}
							}
							const attachmentIds =
								entry.status === 'queued' &&
								entry.payload.source === 'preview' &&
								entry.payload.kind === 'message'
									? (entry.payload.attachments?.map(({ id }) => id) ?? [])
									: [];
							const removedAttachments = await this.leases.write(
								owner,
								async (ctx) =>
									await this.repository.removeStale(entry.id, graceMs, attachmentIds, ctx),
							);
							if (removedAttachments === null) continue;
							await this.attachments.deleteStoredBytes(removedAttachments);
							if (leaseSignal.aborted) return;
							this.logger.info('Removed interrupted agent queue entry without replay', {
								id: entry.id,
								threadId,
							});
						}
					},
					{ waitTimeoutMs: 250, signal: this.stopping.signal },
				);
			} catch (error) {
				if (!(error instanceof AgentConversationLeaseTimeoutError))
					this.logger.warn('Agent queue recovery failed', { threadId, error });
			}
		}
		for (const threadId of await this.repository.findWaitingThreads()) this.notify(threadId);
	}

	@OnShutdown()
	async shutdown(): Promise<void> {
		if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
		this.stopping.abort();
		await Promise.all([...this.previews.keys()].map(async (id) => await this.cancelPreview(id)));
	}
}
