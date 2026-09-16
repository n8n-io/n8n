import {
	LockAcquisitionTimeoutError,
	LockNamespace,
	LockService,
	Logger,
} from '@n8n/backend-common';
import type { AgentInputBoundary, AgentMessage } from '@n8n/agents';
import type {
	AgentChatQueueItem,
	AgentChatQueueResponse,
	AgentChatSteeringTarget,
	AgentPersistedMessageContentPart,
	AgentPersistedMessageDto,
	PushPayload,
} from '@n8n/api-types';
import { OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { UserError, UnexpectedError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { AgentExecutionService } from './agent-execution.service';
import { hashAgentSandboxPrincipal } from './agent-sandbox-principal';
import {
	agentConversationLockKey,
	type AgentQueueInput,
	type AgentPreviewQueueInput,
	type PreviewQueueExecutionContext,
	type PreviewQueuePayload,
	type PreviewQueueScope,
} from './agent-message-queue.types';
import type { AgentMessageQueue } from './entities/agent-message-queue.entity';
import { ExecutionRecorder } from './execution-recorder';
import type { AgentChatBridge } from './integrations/agent-chat-bridge';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { AgentBackgroundJobRepository } from './repositories/agent-background-job.repository';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';
import { AgentRepository } from './repositories/agent.repository';
import { buildInboundUserMessage } from './utils/inbound-attachments';

type PreviewExecution = {
	input: AgentPreviewQueueInput;
	clientRequestId: string;
	execute: (payload: PreviewQueuePayload, context: PreviewQueueExecutionContext) => Promise<void>;
	controller: AbortController;
	errorEmitted: boolean;
};

const previewAdmissionLockKey = (threadId: string) => `agent-preview-admission:${threadId}`;

@Service()
export class AgentMessageQueueService {
	static readonly LIVENESS_GRACE_MS = 2 * 60_000;
	private readonly previews = new Map<string, PreviewExecution>();
	private readonly processing = new Set<string>();
	private readonly drains = new Map<string, Promise<void>>();
	private readonly requested = new Set<string>();
	private readonly stopping = new AbortController();
	private heartbeatTimer?: NodeJS.Timeout;

	constructor(
		private readonly logger: Logger,
		private readonly repository: AgentMessageQueueRepository,
		private readonly lockService: LockService,
		private readonly checkpoints: N8NCheckpointStorage,
		private readonly integrations: ChatIntegrationService,
		private readonly agents: AgentRepository,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly backgroundJobRepository: AgentBackgroundJobRepository,
		private readonly executionService: AgentExecutionService,
		private readonly attachments: AgentChatAttachmentService,
		private readonly publisher: Publisher,
		private readonly broadcaster: AgentExecutionUpdateBroadcaster,
		private readonly orchestrator: AgentExecutionOrchestratorService,
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
		execute: PreviewExecution['execute'],
		onPersisted?: () => void,
	): Promise<AgentChatQueueItem> {
		this.stopping.signal.throwIfAborted();
		const persistedInput: AgentPreviewQueueInput = {
			...input,
			payload: { ...input.payload, clientRequestId },
		};
		const payload = persistedInput.payload;
		const entry = await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			previewAdmissionLockKey(input.threadId),
			async () => {
				if (payload.kind === 'message') return await this.repository.enqueue(persistedInput);
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
				return await this.repository.enqueue(persistedInput);
			},
		);
		onPersisted?.();
		this.previews.set(entry.id, {
			input: persistedInput,
			clientRequestId,
			execute,
			controller: new AbortController(),
			errorEmitted: false,
		});
		if (this.stopping.signal.aborted) {
			await this.cancelPreview(entry.id);
			throw new UserError('Message was cancelled');
		}
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
					...(payload.steering?.failureReason
						? { failureReason: payload.steering.failureReason }
						: {}),
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

	private isRequeuedReceipt(entry: Pick<AgentMessageQueue, 'status' | 'payload'>): boolean {
		return (
			entry.status === 'undelivered' &&
			entry.payload.source === 'preview' &&
			entry.payload.kind === 'message' &&
			Boolean(entry.payload.steering?.requeuedAsId)
		);
	}

	async listPreview(scope: PreviewQueueScope): Promise<AgentChatQueueItem[]> {
		const entries = await this.repository.findPreviewEntries(scope.agentId, scope.threadId);
		return entries
			.filter((entry) => this.owns(entry, scope) && !this.isRequeuedReceipt(entry))
			.map((entry) => this.toItem(entry));
	}

	async reconcileDeliveredHistory(
		scope: PreviewQueueScope,
		history: AgentPersistedMessageDto[],
	): Promise<AgentPersistedMessageDto[]> {
		const reconciled = [...history];
		for (const entry of await this.repository.findDeliveredSteering(scope.threadId)) {
			if (
				!entry.executionId ||
				!this.owns(entry, scope) ||
				entry.payload.source !== 'preview' ||
				entry.payload.kind !== 'message' ||
				reconciled.some(({ id }) => id === entry.id)
			) {
				continue;
			}
			const content: AgentPersistedMessageContentPart[] = entry.payload.message
				? [{ type: 'text', text: entry.payload.message }]
				: [];
			content.push(
				...(entry.payload.attachments ?? []).map((attachment) => ({
					type: 'file',
					fileId: attachment.id,
					fileName: attachment.fileName,
					mimeType: attachment.mimeType,
					sizeBytes: attachment.sizeBytes,
				})),
			);
			const message: AgentPersistedMessageDto = {
				id: entry.id,
				role: 'user',
				content,
				executionId: entry.executionId,
			};
			let insertAt = reconciled.length;
			for (let index = reconciled.length - 1; index >= 0; index--) {
				if (reconciled[index].executionId === entry.executionId) {
					insertAt = index + 1;
					break;
				}
			}
			reconciled.splice(insertAt, 0, message);
		}
		return reconciled;
	}

	async getPreviewQueue(scope: PreviewQueueScope): Promise<AgentChatQueueResponse> {
		const items = await this.listPreview(scope);
		if (await this.checkpoints.findSuspendedForThread(scope.agentId, scope.threadId)) {
			return { items, sendNowUnavailableReason: 'hitl-pending' };
		}

		const active = await this.executionRepository.findSteeringTarget(scope.threadId);
		if (active?.runtimeRunId) {
			return {
				items,
				sendNowTarget: {
					mode: 'active',
					executionId: active.id,
					runId: active.runtimeRunId,
				},
			};
		}

		if (!(await this.executionRepository.existsRunningByThread(scope.threadId))) {
			const latest = await this.executionRepository.findLatestByThreadId(scope.threadId);
			if (latest && (await this.hasBackgroundWork(scope))) {
				return {
					items,
					sendNowTarget: {
						mode: 'new-parent-turn',
						previousExecutionId: latest.id,
					},
				};
			}
		}

		return { items, sendNowUnavailableReason: 'no-active-run' };
	}

	private async hasBackgroundWork(scope: PreviewQueueScope): Promise<boolean> {
		const principalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: scope.userId });
		return (await this.backgroundJobRepository.findByParentThread(scope.threadId)).some(
			(job) =>
				job.parentAgentId === scope.agentId &&
				job.parentResourceId === scope.resourceId &&
				job.parentPrincipalHash === principalHash &&
				(job.status === 'running' || job.notifiedAt === null),
		);
	}

	async sendNow(
		scope: PreviewQueueScope,
		id: string,
		target: AgentChatSteeringTarget,
	): Promise<AgentChatQueueItem> {
		if (target.mode === 'active') return await this.sendNowToActiveRun(scope, id, target);

		let item: AgentChatQueueItem;
		try {
			item = await this.lockService.withLease(
				LockNamespace.KNOWN_LOCKS,
				agentConversationLockKey(scope.threadId),
				async (signal) => {
					signal.throwIfAborted();
					return await this.lockService.withLease(
						LockNamespace.KNOWN_LOCKS,
						previewAdmissionLockKey(scope.threadId),
						async () => await this.reserveParentTurn(scope, id, target),
					);
				},
				{ waitTimeoutMs: 250 },
			);
		} catch (error) {
			if (error instanceof LockAcquisitionTimeoutError) {
				throw new ConflictError('The conversation state changed');
			}
			throw error;
		}
		this.notify(scope.threadId);
		return item;
	}

	async requeuePreview(
		scope: PreviewQueueScope,
		id: string,
		clientRequestId: string,
		execute: PreviewExecution['execute'],
	): Promise<AgentChatQueueItem> {
		const queued = await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			previewAdmissionLockKey(scope.threadId),
			async () => {
				const previous = await this.getPreview(scope, id);
				if (
					previous.status !== 'undelivered' ||
					previous.payload.source !== 'preview' ||
					previous.payload.kind !== 'message'
				) {
					throw new ConflictError('This message cannot be sent again');
				}
				const result = await this.repository.requeueUndelivered(id, clientRequestId);
				if (!result || result.payload.source !== 'preview' || result.payload.kind !== 'message') {
					throw new ConflictError('This message cannot be sent again');
				}
				const requestId = result.payload.clientRequestId ?? clientRequestId;
				if (!this.previews.has(result.id)) {
					this.previews.set(result.id, {
						input: {
							agentId: result.agentId,
							threadId: result.threadId,
							payload: result.payload,
						},
						clientRequestId: requestId,
						execute,
						controller: new AbortController(),
						errorEmitted: false,
					});
				}
				return result;
			},
		);
		this.notify(scope.threadId);
		return this.toItem(queued);
	}

	private async sendNowToActiveRun(
		scope: PreviewQueueScope,
		id: string,
		target: Extract<AgentChatSteeringTarget, { mode: 'active' }>,
	): Promise<AgentChatQueueItem> {
		return await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			previewAdmissionLockKey(scope.threadId),
			async () => {
				const entry = await this.getPreview(scope, id);
				if (
					entry.status === 'steering' &&
					entry.steeringRunId === target.runId &&
					entry.payload.source === 'preview' &&
					entry.payload.kind === 'message' &&
					entry.payload.steering?.targetExecutionId === target.executionId
				) {
					return this.toItem(entry);
				}
				if (
					entry.status !== 'queued' ||
					entry.payload.source !== 'preview' ||
					entry.payload.kind !== 'message'
				) {
					throw new ConflictError('This message is no longer waiting');
				}
				if (await this.checkpoints.findSuspendedForThread(scope.agentId, scope.threadId)) {
					throw new ConflictError('The agent is waiting for a response');
				}
				if (
					!(await this.executionRepository.isSteeringTarget(
						target.executionId,
						scope.threadId,
						target.runId,
					))
				) {
					throw new ConflictError('The active run changed');
				}
				const promoted = await this.repository.promoteQueued(
					id,
					{ mode: 'active', targetExecutionId: target.executionId },
					target.runId,
					target.executionId,
				);
				if (!promoted) {
					throw new ConflictError('This message is no longer waiting');
				}
				return this.toItem(promoted);
			},
		);
	}

	private async reserveParentTurn(
		scope: PreviewQueueScope,
		id: string,
		target: Extract<AgentChatSteeringTarget, { mode: 'new-parent-turn' }>,
	): Promise<AgentChatQueueItem> {
		const entry = await this.getPreview(scope, id);
		if (
			entry.status !== 'queued' ||
			entry.payload.source !== 'preview' ||
			entry.payload.kind !== 'message'
		) {
			throw new ConflictError('This message is no longer waiting');
		}
		const latest = await this.executionRepository.findLatestByThreadId(scope.threadId);
		if (
			latest?.id !== target.previousExecutionId ||
			(await this.executionRepository.existsRunningByThread(scope.threadId)) ||
			(await this.checkpoints.findSuspendedForThread(scope.agentId, scope.threadId)) ||
			(await this.repository.hasParentTurnReservation(scope.threadId)) ||
			!(await this.hasBackgroundWork(scope))
		) {
			throw new ConflictError('The conversation state changed');
		}
		const promoted = await this.repository.promoteQueued(
			id,
			{
				mode: 'new-parent-turn',
				targetExecutionId: target.previousExecutionId,
			},
			null,
		);
		if (!promoted) {
			throw new ConflictError('This message is no longer waiting');
		}
		return this.toItem(promoted);
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
		return await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			previewAdmissionLockKey(scope.threadId),
			async () => {
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
			},
		);
	}

	async removePreview(scope: PreviewQueueScope, id: string): Promise<void> {
		const entry = await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			previewAdmissionLockKey(scope.threadId),
			async () => {
				const current = await this.getPreview(scope, id);
				if (current.kind !== 'message' || !(await this.repository.cancelQueued(id))) {
					throw new ConflictError('This message is no longer waiting');
				}
				return current;
			},
		);
		if (!this.isRequeuedReceipt(entry)) {
			await this.deleteUnusedAttachments(entry);
		}
		this.notify(entry.threadId);
	}

	async stopPreview(scope: PreviewQueueScope, id: string): Promise<boolean> {
		const cancelled = await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			previewAdmissionLockKey(scope.threadId),
			async () => {
				await this.getPreview(scope, id);
				return await this.repository.requestCancellation(id);
			},
		);
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
			cancelled =
				(await this.repository.cancelQueued(entry.id)) ||
				(await this.repository.requestCancellation(entry.id)) ||
				cancelled;
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
		await this.repository.cancelWaiting(threadId);
		this.notify(threadId);
	}

	async hasEntries(threadId: string): Promise<boolean> {
		return await this.repository.hasEntries(threadId);
	}

	async hasParentTurnReservation(threadId: string): Promise<boolean> {
		return await this.repository.hasParentTurnReservation(threadId);
	}

	async openSteeringExecution(executionId: string, runId: string): Promise<void> {
		if (!(await this.executionRepository.openSteering(executionId, runId))) {
			throw new UnexpectedError('Failed to open the execution for steering');
		}
	}

	async closeSteeringExecution(
		executionId: string,
		runId: string,
		threadId: string,
		failureReason?: string,
	): Promise<void> {
		await this.executionRepository.closeSteering(executionId, runId);
		if (failureReason) {
			await this.repository.markSteeringUndelivered(threadId, runId, failureReason);
		}
	}

	async acceptSteeringInput(
		scope: PreviewQueueScope,
		executionId: string | undefined,
		boundary: AgentInputBoundary,
	): Promise<boolean> {
		if (!executionId) throw new UnexpectedError('The steering execution is not ready');
		return await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			previewAdmissionLockKey(scope.threadId),
			async () => {
				if (
					!(await this.executionRepository.isSteeringTarget(
						executionId,
						scope.threadId,
						boundary.runId,
					))
				) {
					throw new ConflictError('The active run changed');
				}

				const pending = (
					await this.repository.findPendingSteering(scope.threadId, boundary.runId)
				).filter(
					(item) =>
						item.agentId === scope.agentId &&
						item.payload.source === 'preview' &&
						item.payload.kind === 'message' &&
						item.payload.projectId === scope.projectId &&
						item.payload.userId === scope.userId &&
						item.payload.resourceId === scope.resourceId,
				);
				if (!boundary.canContinue) {
					await this.repository.markSteeringUndelivered(
						scope.threadId,
						boundary.runId,
						'The agent reached its execution limit',
					);
					await this.executionRepository.closeSteering(executionId, boundary.runId);
					return false;
				}
				if (pending.length === 0) {
					if (boundary.reason === 'before-finish') {
						await this.executionRepository.closeSteering(executionId, boundary.runId);
					}
					return false;
				}

				const messages: AgentMessage[] = pending.flatMap((item) => {
					if (item.payload.source !== 'preview' || item.payload.kind !== 'message') return [];
					return buildInboundUserMessage(item.payload.message, item.payload.attachments ?? []).map(
						(message) => ({ ...message, id: item.id }),
					);
				});
				await boundary.addInput(messages);
				if (
					!(await this.repository.markSteeringDelivered(
						pending.map(({ id }) => id),
						boundary.runId,
						executionId,
					))
				) {
					throw new UnexpectedError('Failed to save the steering delivery receipt');
				}
				return true;
			},
		);
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

	private async cancelPreview(id: string): Promise<void> {
		const entry = await this.repository.findById(id);
		if (entry && (await this.repository.cancelQueued(id)) && !this.isRequeuedReceipt(entry)) {
			await this.deleteUnusedAttachments(entry);
		}
		await this.reconcilePreviews();
	}

	private sendPreviewEvent(
		id: string,
		preview: PreviewExecution,
		event: PushPayload<'agentChatEvent'>['event'],
	): void {
		if (event.type === 'error') preview.errorEmitted = true;
		const { input, clientRequestId } = preview;
		void this.broadcaster
			.sendChatEvent(
				{
					projectId: input.payload.projectId,
					agentId: input.agentId,
					threadId: input.threadId,
					queueId: id,
					clientRequestId,
					event,
				},
				input.payload.userId,
			)
			.catch((error: unknown) =>
				this.logger.warn('Failed to deliver preview event', { id, error }),
			);
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
		// Check cancellation before waiting for the drain that owns the active run.
		await this.reconcilePreviews(threadId);
		this.requested.add(threadId);
		const existing = this.drains.get(threadId);
		if (existing) return await existing;
		const drain = this.drainThread(threadId).finally(() => {
			this.drains.delete(threadId);
			if (this.requested.has(threadId)) this.handleDrainRequest({ threadId });
		});
		this.drains.set(threadId, drain);
		await drain;
	}

	private async drainThread(threadId: string): Promise<void> {
		do {
			this.requested.delete(threadId);
			const processed = await this.lockService.withLease(
				LockNamespace.KNOWN_LOCKS,
				agentConversationLockKey(threadId),
				async (signal) => await this.processNext(threadId, signal),
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
		const preview = this.previews.get(selected.id);
		let bridge: AgentChatBridge | undefined;
		if (selected.payload.source === 'preview') {
			// ponytail: previews stay on their accepting main; owner recovery needs a durable executor.
			if (!preview) return false;
		} else {
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
				await this.repository.removeEntry(selected.id);
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
		if (!(await this.repository.markProcessing(selected.id))) return true;
		// An edit can commit between selection and claim. Execute the claimed payload.
		let entry: AgentMessageQueue | null;
		try {
			entry = await this.repository.findById(selected.id);
		} catch (error) {
			await this.repository.releaseProcessing(selected.id);
			this.requested.add(threadId);
			throw error;
		}
		if (!entry) return true;
		this.processing.add(entry.id);
		const abortSignal = AbortSignal.any([
			leaseSignal,
			this.stopping.signal,
			...(preview ? [preview.controller.signal] : []),
		]);
		if (entry.status === 'cancelling') preview?.controller.abort();
		let executionId: string | undefined;
		let runtimeRunId: string | undefined;
		let failed = false;
		const steeringScope: PreviewQueueScope | undefined =
			entry.payload.source === 'preview'
				? {
						agentId: entry.agentId,
						threadId,
						projectId: entry.payload.projectId,
						userId: entry.payload.userId,
						resourceId: entry.payload.resourceId,
					}
				: undefined;
		const onExecutionStarted = async (id: string, runId: string) => {
			executionId = id;
			runtimeRunId = runId;
			await this.repository.linkExecution(entry.id, id);
			if (preview) {
				await this.openSteeringExecution(id, runId);
				this.sendPreviewEvent(entry.id, preview, { type: 'execution-started', executionId: id });
			}
		};
		try {
			if (preview && entry.payload.source === 'preview') {
				if (!steeringScope) throw new UnexpectedError('Expected a preview queue scope');
				this.sendPreviewEvent(entry.id, preview, { type: 'processing', item: this.toItem(entry) });
				abortSignal.throwIfAborted();
				await preview.execute(entry.payload, {
					abortSignal,
					onExecutionStarted,
					onInputBoundary: async (boundary) =>
						await this.acceptSteeringInput(steeringScope, executionId, boundary),
					send: (event) => {
						if (!abortSignal.aborted) this.sendPreviewEvent(entry.id, preview, event);
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
			failed = true;
			if (preview) {
				if (!executionId)
					executionId = await this.recordFailedPreview(entry, error, abortSignal.aborted);
				if (!abortSignal.aborted && !preview.errorEmitted) {
					this.sendPreviewEvent(entry.id, preview, {
						type: 'error',
						message: scrubSecretsInText(error instanceof Error ? error.message : 'Chat failed'),
					});
				}
			}
			this.logger.warn('Queued agent input ended with an error', { id: entry.id, threadId, error });
		} finally {
			try {
				if (executionId && runtimeRunId) {
					await this.closeSteeringExecution(
						executionId,
						runtimeRunId,
						threadId,
						failed || abortSignal.aborted
							? abortSignal.aborted
								? 'The agent stopped before delivery'
								: 'The agent run failed'
							: undefined,
					);
				}
				// The conditional delete makes a concurrent Stop win before suspension cleanup.
				if (preview && !preview.controller.signal.aborted) {
					if (await this.repository.finishProcessing(entry.id)) {
						this.previews.delete(entry.id);
					} else {
						const remaining = await this.repository.findById(entry.id);
						if (remaining?.status === 'cancelling') preview.controller.abort();
					}
				}
				// Stop can arrive as a run suspends. Clear its checkpoint before releasing the conversation.
				if (preview?.controller.signal.aborted) {
					const checkpoint = await this.checkpoints.findSuspendedForThread(entry.agentId, threadId);
					if (checkpoint?.persistence?.resourceId === entry.payload.resourceId) {
						await this.orchestrator.cancelChatRun({
							agentId: entry.agentId,
							runId: checkpoint.runId,
							resourceId: entry.payload.resourceId,
						});
					}
				}
				await this.repository.removeEntry(entry.id);
				this.previews.delete(entry.id);
				if (preview) {
					if (!executionId) await this.deleteUnusedAttachments(entry);
					this.sendPreviewEvent(
						entry.id,
						preview,
						abortSignal.aborted
							? { type: 'cancelled' }
							: { type: 'done', sessionId: threadId, ...(executionId ? { executionId } : {}) },
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
				this.processing.delete(entry.id);
			}
		}
		return true;
	}

	private async recordFailedPreview(
		entry: AgentMessageQueue,
		error: unknown,
		cancelled: boolean,
	): Promise<string | undefined> {
		let executionId: string | undefined;
		try {
			const agent = await this.agents.findById(entry.agentId);
			if (!agent || entry.payload.source !== 'preview') return undefined;
			const recorder = new ExecutionRecorder();
			if (!cancelled) recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: cancelled ? 'stop' : 'error' });
			const params = {
				agentId: entry.agentId,
				agentName: agent.name,
				projectId: entry.payload.projectId,
				threadId: entry.threadId,
				userMessage: entry.payload.kind === 'message' ? entry.payload.message : null,
				attachments: entry.payload.kind === 'message' ? entry.payload.attachments : undefined,
				source: 'chat',
			};
			executionId = await this.executionService.startExecutionRecording(params, recorder.startedAt);
			await this.repository.linkExecution(entry.id, executionId);
			await this.executionService.finalizeExecution(executionId, {
				...params,
				record: {
					...recorder.getMessageRecord(),
					...(cancelled ? { finishReason: 'cancelled' } : {}),
				},
			});
		} catch (recordError) {
			this.logger.warn('Failed to record queued preview error', {
				id: entry.id,
				error: recordError,
			});
		}
		return executionId;
	}

	private async reconcilePreviews(threadId?: string): Promise<void> {
		const previews = [...this.previews].filter(
			([, preview]) => !threadId || preview.input.threadId === threadId,
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
			const started = this.processing.has(id);
			if ((entry?.status === 'delivered' || (entry && this.isRequeuedReceipt(entry))) && !started) {
				this.previews.delete(id);
				continue;
			}
			if (entry?.status === 'cancelling' || (!entry && started)) preview.controller.abort();
			if (!entry && !started && this.previews.get(id) === preview) {
				this.previews.delete(id);
				if (preview.input.payload.kind === 'message') {
					await this.attachments.deleteByIds(
						preview.input.payload.attachments?.map(({ id }) => id) ?? [],
					);
				}
				this.sendPreviewEvent(
					id,
					preview,
					preview.controller.signal.aborted ? { type: 'cancelled' } : { type: 'removed' },
				);
			}
		}
	}

	private async heartbeat(): Promise<void> {
		await this.repository.touchLiveEntries([
			...new Set([...this.processing, ...this.previews.keys()]),
		]);
		await this.reconcilePreviews();
	}

	async recover(): Promise<void> {
		const staleBefore = new Date(Date.now() - AgentMessageQueueService.LIVENESS_GRACE_MS);
		for (const threadId of await this.repository.findStaleThreads(staleBefore)) {
			try {
				await this.lockService.withLease(
					LockNamespace.KNOWN_LOCKS,
					agentConversationLockKey(threadId),
					async (leaseSignal) => {
						for (const entry of await this.repository.findStale(threadId, staleBefore)) {
							if (leaseSignal.aborted) return;
							if (
								entry.status === 'steering' &&
								entry.payload.source === 'preview' &&
								entry.payload.kind === 'message'
							) {
								const checkpoint = await this.checkpoints.findSuspendedForThread(
									entry.agentId,
									threadId,
								);
								if (checkpoint?.runId === entry.steeringRunId) continue;
								const targetId = entry.payload.steering?.targetExecutionId;
								const target = targetId
									? await this.executionRepository.findRunningById(targetId)
									: null;
								if (target && target.updatedAt > staleBefore) continue;
								await this.repository.markUndelivered(
									entry.id,
									'The agent process stopped before delivery',
								);
								continue;
							}
							if (entry.executionId) {
								const execution = await this.executionRepository.findRunningById(entry.executionId);
								if (execution && execution.updatedAt > staleBefore) continue;
								if (execution) {
									if (leaseSignal.aborted) return;
									if (
										!(await this.executionService.finalizeInterruptedExecution(
											execution,
											staleBefore,
										))
									)
										continue;
								}
							}
							if (entry.status === 'cancelling' && entry.payload.source === 'preview') {
								const checkpoint = await this.checkpoints.findSuspendedForThread(
									entry.agentId,
									threadId,
								);
								if (leaseSignal.aborted) return;
								if (checkpoint?.persistence?.resourceId === entry.payload.resourceId) {
									await this.orchestrator.cancelChatRun({
										agentId: entry.agentId,
										runId: checkpoint.runId,
										resourceId: entry.payload.resourceId,
									});
								}
							}
							if (
								entry.status === 'queued' &&
								entry.payload.source === 'preview' &&
								entry.payload.kind === 'message'
							) {
								if (leaseSignal.aborted) return;
								await this.attachments.deleteByIds(
									entry.payload.attachments?.map(({ id }) => id) ?? [],
								);
							}
							if (leaseSignal.aborted) return;
							await this.repository.removeEntry(entry.id);
							this.logger.info('Removed interrupted agent queue entry without replay', {
								id: entry.id,
								threadId,
							});
						}
					},
					{ waitTimeoutMs: 250 },
				);
			} catch (error) {
				if (!(error instanceof LockAcquisitionTimeoutError))
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
