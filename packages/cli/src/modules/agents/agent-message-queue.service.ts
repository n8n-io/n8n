import { LockNamespace, LockService, Logger } from '@n8n/backend-common';
import {
	N8N_CHAT_INTEGRATION_TYPE,
	type AgentChatQueueItem,
	type PushPayload,
} from '@n8n/api-types';
import { UserRepository } from '@n8n/db';
import { OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { UserError, UnexpectedError, OperationalError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import {
	AgentConversationLeaseService,
	type AgentConversationOwner,
} from './agent-conversation-lease.service';
import { AgentConversationLeaseTimeoutError } from './agent-conversation-lease.types';
import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import {
	AgentExecutionRecordingError,
	AgentExecutionService,
	threadBelongsTo,
} from './agent-execution.service';
import {
	type AgentQueueInput,
	type AgentPreviewQueueInput,
	type PreviewQueueExecutionContext,
	type PreviewQueueScope,
} from './agent-message-queue.types';
import type { AgentMessageQueue } from './entities/agent-message-queue.entity';
import { ExecutionRecorder } from './execution-recorder';
import type { AgentChatBridge } from './integrations/agent-chat-bridge';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';
import { AgentRepository } from './repositories/agent.repository';
import { pumpChunks } from './agent-sse-stream';
import { draftChatMemoryResourceId } from './utils/agent-memory-scope';

type PreviewExecution = {
	entry: AgentMessageQueue;
	controller: AbortController;
	errorEmitted: boolean;
};

const previewAdmissionLockKey = (threadId: string) => `agent-preview-admission:${threadId}`;

@Service()
export class AgentMessageQueueService {
	static readonly LIVENESS_GRACE_MS = 2 * 60_000;
	private readonly previews = new Map<string, PreviewExecution>();
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
		private readonly broadcaster: AgentExecutionUpdateBroadcaster,
		private readonly orchestrator: AgentExecutionOrchestratorService,
		private readonly lockService: LockService,
		private readonly users: UserRepository,
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
		input: AgentPreviewQueueInput,
		clientRequestId: string,
		onPersisted?: () => void,
	): Promise<AgentChatQueueItem> {
		this.stopping.signal.throwIfAborted();
		const payload = { ...input.payload, clientRequestId };
		const submission = { ...input, payload };
		const entry = await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			previewAdmissionLockKey(input.threadId),
			async () => {
				if (payload.kind === 'hitl') {
					const memory = await this.getResumeScope(
						input.agentId,
						payload.runId,
						payload.resourceId,
						payload.toolCallId,
					);
					const duplicate = (
						await this.repository.findPreviewEntries(input.agentId, input.threadId)
					).some(
						(entry) =>
							entry.payload.kind === 'hitl' &&
							entry.payload.runId === payload.runId &&
							entry.payload.toolCallId === payload.toolCallId,
					);
					if (memory.threadId !== input.threadId || duplicate) {
						throw new UserError('This action has already been handled or has expired');
					}
				}
				const inserted = await this.repository.enqueue(submission);
				onPersisted?.();
				return inserted;
			},
		);
		this.notify(input.threadId);
		return this.toItem(entry);
	}

	private toItem(entry: AgentMessageQueue): AgentChatQueueItem {
		const { payload } = entry;
		if (payload.source !== 'preview') throw new UnexpectedError('Expected a preview queue entry');
		const base = {
			id: entry.id,
			status: entry.status,
			...(entry.executionId ? { executionId: entry.executionId } : {}),
		};
		return payload.kind === 'message'
			? {
					...base,
					kind: 'message',
					message: payload.message,
					attachments: payload.attachments ?? [],
				}
			: { ...base, kind: 'hitl', runId: payload.runId, toolCallId: payload.toolCallId };
	}

	private owns(entry: AgentMessageQueue, scope: PreviewQueueScope): boolean {
		return (
			entry.agentId === scope.agentId &&
			entry.threadId === scope.threadId &&
			entry.payload.source === 'preview' &&
			entry.payload.projectId === scope.projectId &&
			entry.payload.userId === scope.userId &&
			entry.payload.resourceId === scope.resourceId
		);
	}

	async listPreview(scope: PreviewQueueScope): Promise<AgentChatQueueItem[]> {
		const entries = await this.repository.findPreviewEntries(scope.agentId, scope.threadId);
		return entries.filter((entry) => this.owns(entry, scope)).map((entry) => this.toItem(entry));
	}

	private async getPreview(scope: PreviewQueueScope, id: string): Promise<AgentMessageQueue> {
		const entry = await this.repository.findById(id);
		if (!entry || !this.owns(entry, scope)) throw new NotFoundError('Queued message not found');
		return entry;
	}

	async editPreview(
		scope: PreviewQueueScope,
		id: string,
		message: string,
	): Promise<AgentChatQueueItem> {
		const entry = await this.getPreview(scope, id);
		if (entry.payload.source !== 'preview' || entry.payload.kind !== 'message') {
			throw new BadRequestError('Only waiting messages can be edited');
		}
		if (!message.trim() && !entry.payload.attachments?.length) {
			throw new BadRequestError('Message text or at least one attachment is required');
		}
		const payload = { ...entry.payload, message };
		if (!(await this.repository.editQueuedPreview(id, payload))) {
			throw new ConflictError('This message is no longer waiting');
		}
		entry.payload = payload;
		return this.toItem(entry);
	}

	async removePreview(scope: PreviewQueueScope, id: string): Promise<void> {
		const entry = await this.getPreview(scope, id);
		if (entry.kind !== 'message' || !(await this.repository.cancelQueued(id))) {
			throw new ConflictError('This message is no longer waiting');
		}
		await this.deleteUnusedAttachments(entry);
		this.sendPreviewEvent(entry, { type: 'removed' });
		this.notify(entry.threadId);
	}

	async stopPreview(scope: PreviewQueueScope, id: string): Promise<boolean> {
		await this.getPreview(scope, id);
		const cancelled = await this.repository.requestCancellation(id);
		if (cancelled) this.notify(scope.threadId);
		return cancelled;
	}

	async cancelPreviewResumes(
		scope: Omit<PreviewQueueScope, 'threadId'>,
		runId: string,
	): Promise<boolean> {
		let cancelled = false;
		for (const entry of await this.repository.findPreviewEntries(scope.agentId)) {
			if (
				!this.owns(entry, { ...scope, threadId: entry.threadId }) ||
				entry.payload.kind !== 'hitl' ||
				entry.payload.runId !== runId
			)
				continue;
			if (await this.repository.cancelQueued(entry.id)) {
				cancelled = true;
				this.sendPreviewEvent(entry, { type: 'cancelled' });
			} else {
				cancelled = (await this.repository.requestCancellation(entry.id)) || cancelled;
			}
			this.notify(entry.threadId);
		}
		return cancelled;
	}

	async getResumeScope(agentId: string, runId: string, resourceId?: string, toolCallId?: string) {
		const status = await this.checkpoints.getStatus(runId, agentId);
		const pendingToolCall =
			status.status === 'active' && toolCallId !== undefined
				? status.checkpoint.pendingToolCalls[toolCallId]
				: undefined;
		if (
			status.status !== 'active' ||
			status.checkpoint.status !== 'suspended' ||
			(toolCallId !== undefined &&
				(!pendingToolCall?.suspended ||
					pendingToolCall.runId !== runId ||
					pendingToolCall.toolCallId !== toolCallId))
		) {
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
		for (const entry of await this.repository.cancelWaiting(threadId)) {
			await this.deleteUnusedAttachments(entry);
			this.sendPreviewEvent(entry, { type: 'cancelled' });
		}
		this.notify(threadId);
	}

	async hasEntries(threadId: string): Promise<boolean> {
		return await this.repository.hasEntries(threadId);
	}

	private async deleteUnusedAttachments(entry: AgentMessageQueue): Promise<void> {
		if (entry.payload.source === 'preview' && entry.payload.kind === 'message') {
			try {
				await this.attachments.deleteByIds(entry.payload.attachments?.map(({ id }) => id) ?? []);
			} catch (error) {
				this.logger.warn('Failed to delete unused agent chat attachments', {
					id: entry.id,
					error,
				});
			}
		}
	}

	private sendPreviewEvent(
		entry: AgentMessageQueue,
		event: PushPayload<'agentChatEvent'>['event'],
	): void {
		const preview = this.previews.get(entry.id);
		if (event.type === 'error' && preview) preview.errorEmitted = true;
		this.broadcaster.sendQueuedChatEvent(entry, event);
	}

	@OnPubSubEvent('drain-agent-message-queue', { instanceType: 'main' })
	handleDrainRequest({ threadId }: { threadId: string }): void {
		void this.drain(threadId).catch((error: unknown) => {
			this.logger.error('Failed to drain agent message queue', { threadId, error });
		});
	}

	notify(threadId: string): void {
		if (!this.stopping.signal.aborted) this.handleDrainRequest({ threadId });
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
		// Check cancellation before waiting for the drain that owns the active run.
		await this.reconcilePreviews(threadId);
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
		const selected = await this.repository.findNext(threadId);
		if (!selected) return false;
		const owner = this.leases.requireOwner(threadId);
		if (owner.lease.agentId !== selected.agentId) return true;
		let bridge: AgentChatBridge | undefined;
		if (selected.payload.source === 'integration') {
			const payload = selected.payload;
			const agent = await this.agents.findById(selected.agentId);
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
					id: selected.id,
					threadId,
				});
				await this.leases.write(
					owner,
					async (ctx) => await this.repository.removeEntry(selected.id, ctx),
				);
				return true;
			}
			bridge = this.integrations.getBridge(
				selected.agentId,
				payload.integrationType,
				payload.credentialId,
			);
			if (!bridge) return false;
		}
		if (
			selected.kind === 'message' &&
			(await this.checkpoints.findSuspendedForThread(selected.agentId, threadId))
		)
			return false;
		let entry: AgentMessageQueue | null;
		try {
			entry = await this.leases.write(owner, async (ctx) => {
				if (!(await this.repository.markProcessing(selected.id, ctx))) return null;
				return await this.repository.findById(selected.id, ctx);
			});
		} catch (error) {
			// A failed payload read rolls the claim back with its transaction.
			if (!owner.signal.aborted) this.requested.add(threadId);
			throw error;
		}
		if (!entry) return true;
		const preview: PreviewExecution | undefined =
			entry.payload.source === 'preview'
				? { entry, controller: new AbortController(), errorEmitted: false }
				: undefined;
		if (preview) this.previews.set(entry.id, preview);
		this.processing.set(entry.id, owner);
		const abortSignal = AbortSignal.any([
			leaseSignal,
			this.stopping.signal,
			...(preview ? [preview.controller.signal] : []),
		]);
		if (entry.status === 'cancelling') preview?.controller.abort();
		let executionId: string | undefined;
		const onExecutionStarted = async (id: string) => {
			executionId = id;
			if (preview) {
				this.sendPreviewEvent(entry, { type: 'execution-started', executionId: id });
			} else {
				await this.leases.write(
					owner,
					async (ctx) => await this.repository.linkExecution(entry.id, id, ctx),
				);
			}
		};
		try {
			if (preview && entry.payload.source === 'preview') {
				this.sendPreviewEvent(entry, { type: 'processing', item: this.toItem(entry) });
				abortSignal.throwIfAborted();
				await this.executePreview(entry, {
					abortSignal,
					onExecutionStarted,
					send: (event) => {
						if (!abortSignal.aborted) this.sendPreviewEvent(entry, event);
					},
				});
			} else if (bridge && entry.payload.source === 'integration') {
				abortSignal.throwIfAborted();
				await bridge.processQueuedInput(entry.payload, threadId, {
					abortSignal,
					onExecutionStarted,
				});
			}
		} catch (error) {
			if (preview) {
				if (
					!executionId &&
					!owner.signal.aborted &&
					!(error instanceof AgentExecutionRecordingError)
				) {
					try {
						// The execution can commit before its start callback reaches this process.
						executionId = (await this.repository.findById(entry.id))?.executionId ?? undefined;
						if (!executionId) {
							executionId = await this.recordFailedPreview(entry, error, abortSignal.aborted);
						}
					} catch (recordError) {
						this.logger.warn('Failed to record queued preview error', {
							id: entry.id,
							error: recordError,
						});
					}
				}
				if (!abortSignal.aborted && !preview.errorEmitted) {
					this.sendPreviewEvent(entry, {
						type: 'error',
						message: scrubSecretsInText(error instanceof Error ? error.message : 'Chat failed'),
					});
				}
			}
			this.logger.warn('Queued agent input ended with an error', { id: entry.id, threadId, error });
		} finally {
			try {
				if (preview) {
					const finished = await this.leases.write(owner, async (ctx) => {
						const current = await this.repository.findById(entry.id, ctx);
						if (
							!current?.executionId ||
							!(await this.executionRepository.isFinished(current.executionId, ctx))
						) {
							throw new OperationalError('Queued preview execution outcome was not recorded');
						}
						return {
							executionId: current.executionId,
							removed:
								!preview.controller.signal.aborted &&
								(await this.repository.finishProcessing(entry.id, ctx)),
						};
					});
					executionId = finished.executionId;
					if (!finished.removed) {
						// A concurrent Stop keeps the slot until its checkpoint cleanup commits.
						preview.controller.abort();
						await this.cancelSuspendedPreview(entry);
						await this.leases.write(
							owner,
							async (ctx) => await this.repository.removeEntry(entry.id, ctx),
						);
					}
					this.sendPreviewEvent(
						entry,
						abortSignal.aborted
							? { type: 'cancelled' }
							: { type: 'done', sessionId: threadId, executionId },
					);
				} else {
					await this.leases.write(
						owner,
						async (ctx) => await this.repository.removeEntry(entry.id, ctx),
					);
				}
				if (executionId)
					this.broadcaster.notify({
						projectId: entry.payload.projectId,
						agentId: entry.agentId,
						threadId,
						executionId,
					});
				this.notifyPeers(threadId);
			} finally {
				if (owner.signal.aborted) preview?.controller.abort(owner.signal.reason);
				this.previews.delete(entry.id);
				this.processing.delete(entry.id);
			}
		}
		return true;
	}

	private async executePreview(
		entry: AgentMessageQueue,
		context: PreviewQueueExecutionContext,
	): Promise<void> {
		const { payload } = entry;
		if (payload.source !== 'preview') throw new UnexpectedError('Expected a preview queue entry');
		const user = await this.users.findByIdWithRole(payload.userId);
		if (!user || user.disabled) throw new UserError('Preview user is no longer active');
		if (!(await userHasScopes(user, ['agent:execute'], false, { projectId: payload.projectId }))) {
			throw new UserError('Preview user can no longer execute this agent');
		}
		const agent = await this.agents.findByIdAndProjectId(entry.agentId, payload.projectId);
		const thread = await this.executionService.findThreadById(entry.threadId);
		if (
			!agent ||
			(thread && !threadBelongsTo(thread, payload.projectId, entry.agentId)) ||
			payload.resourceId !== draftChatMemoryResourceId(user.id)
		) {
			throw new UserError('Queued message does not belong to this preview chat');
		}
		const config = {
			agentId: entry.agentId,
			projectId: payload.projectId,
			queueEntryId: entry.id,
			user,
			previewChat: true,
			abortSignal: context.abortSignal,
			onExecutionStarted: context.onExecutionStarted,
		};
		context.abortSignal.throwIfAborted();
		if (payload.kind === 'message') {
			await pumpChunks(
				this.orchestrator.executeForChat({
					...config,
					message: payload.message,
					attachments: payload.attachments,
					memory: { threadId: entry.threadId, resourceId: payload.resourceId },
				}),
				context.send,
			);
		} else {
			const memory = await this.getResumeScope(
				entry.agentId,
				payload.runId,
				payload.resourceId,
				payload.toolCallId,
			);
			if (memory.threadId !== entry.threadId) {
				throw new UserError('This action does not belong to this preview chat');
			}
			context.abortSignal.throwIfAborted();
			await pumpChunks(
				this.orchestrator.resumeForChat({
					...config,
					runId: payload.runId,
					toolCallId: payload.toolCallId,
					resumeData: payload.resumeData,
					expectedMemory: memory,
					usePublishedVersion: false,
					integrationType: N8N_CHAT_INTEGRATION_TYPE,
				}),
				context.send,
			);
		}
	}

	private async previewRecordingParams(entry: AgentMessageQueue) {
		const agent = await this.agents.findById(entry.agentId);
		if (!agent || entry.payload.source !== 'preview') {
			throw new UnexpectedError('Queued preview agent is unavailable');
		}
		return {
			queueEntryId: entry.id,
			agentId: entry.agentId,
			agentName: agent.name,
			projectId: entry.payload.projectId,
			threadId: entry.threadId,
			userMessage: entry.payload.kind === 'message' ? entry.payload.message : null,
			attachments: entry.payload.kind === 'message' ? entry.payload.attachments : undefined,
			source: 'chat',
		};
	}

	private async recordFailedPreview(
		entry: AgentMessageQueue,
		error: unknown,
		cancelled: boolean,
	): Promise<string> {
		const params = await this.previewRecordingParams(entry);
		const recorder = new ExecutionRecorder();
		if (!cancelled) recorder.record({ type: 'error', error });
		recorder.record({ type: 'finish', finishReason: cancelled ? 'stop' : 'error' });
		const executionId = await this.executionService.startExecutionRecording(
			params,
			recorder.startedAt,
		);
		await this.executionService.finalizeExecution(executionId, {
			...params,
			record: {
				...recorder.getMessageRecord(),
				...(cancelled ? { finishReason: 'cancelled' } : {}),
			},
		});
		return executionId;
	}

	private async cancelSuspendedPreview(entry: AgentMessageQueue): Promise<void> {
		const checkpoint = await this.checkpoints.findCancellableForThread(
			entry.agentId,
			entry.threadId,
		);
		if (
			checkpoint?.persistence?.resourceId === entry.payload.resourceId &&
			!(await this.orchestrator.cancelChatRun({
				agentId: entry.agentId,
				runId: checkpoint.runId,
				resourceId: entry.payload.resourceId,
			}))
		) {
			throw new OperationalError('Preview cancellation has not completed');
		}
	}

	private async reconcilePreviews(threadId?: string): Promise<void> {
		const previews = [...this.previews].filter(
			([, preview]) => !threadId || preview.entry.threadId === threadId,
		);
		const entries = new Map(
			(await this.repository.findLiveEntries(previews.map(([id]) => id))).map((entry) => [
				entry.id,
				entry,
			]),
		);
		for (const [id, preview] of previews) {
			if (this.previews.get(id) !== preview) continue;
			const entry = entries.get(id);
			if (entry?.status === 'cancelling' || !entry) preview.controller.abort();
		}
	}

	private async heartbeat(): Promise<void> {
		for (const [id, owner] of this.processing) {
			if (owner.signal.aborted) continue;
			await this.leases.write(owner, async (ctx) => await this.repository.touchProcessing(id, ctx));
		}
		await this.reconcilePreviews();
	}

	async recover(): Promise<void> {
		const graceMs = AgentMessageQueueService.LIVENESS_GRACE_MS;
		for (const threadId of await this.repository.findStaleThreads(graceMs)) {
			try {
				const [candidate] = await this.repository.findStale(threadId, graceMs);
				if (!candidate) continue;
				await this.leases.withLease(
					candidate.agentId,
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
							if (entry.status === 'cancelling' && entry.payload.source === 'preview') {
								await this.cancelSuspendedPreview(entry);
							}
							if (entry.payload.source === 'preview' && !entry.executionId) {
								entry.executionId =
									(await this.executionService.recordInterruptedQueuedPreview(
										await this.previewRecordingParams(entry),
										graceMs,
									)) ?? null;
								if (!entry.executionId) continue;
							} else if (
								!(await this.leases.write(
									owner,
									async (ctx) => await this.repository.removeStale(entry.id, graceMs, ctx),
								))
							) {
								continue;
							}
							this.sendPreviewEvent(
								entry,
								entry.status === 'cancelling'
									? { type: 'cancelled' }
									: {
											type: 'done',
											sessionId: threadId,
											...(entry.executionId ? { executionId: entry.executionId } : {}),
										},
							);
							if (entry.executionId) {
								this.broadcaster.notify({
									projectId: entry.payload.projectId,
									agentId: entry.agentId,
									threadId,
									executionId: entry.executionId,
								});
							}
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
	shutdown(): void {
		if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
		this.stopping.abort();
	}
}
