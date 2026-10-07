import type { SerializableAgentState } from '@n8n/agents';
import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { UserError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentChatExecutionService } from '../agent-chat-execution.service';
import { buildInboundUserMessage } from '../utils/inbound-attachments';
import type { StartExecutionParams } from '../agent-execution.service';
import type { ClaimedAgentMessage } from '../agent-message-queue.service';
import { AgentMessageQueueService } from '../agent-message-queue.service';
import { emitChunkEvents } from '../agent-sse-stream';
import { AgentTurnExecutionService, type AgentTurnRequest } from '../agent-turn-execution.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import { AgentRepository } from '../repositories/agent.repository';
import type { StoredAttachmentRef } from '../types/agent-chat-attachment';
import type { AgentExecutionAdmission } from '../types/agent-queued-message';
import { draftChatMemoryResourceId } from '../utils/agent-memory-scope';
import { canUseSystemAgent } from './system-agent-access';
import { SystemAgentRegistry } from './system-agent-registry';
import type {
	SystemAgentProvider,
	SystemAgentTurn,
	SystemAgentTurnHandle,
	SystemAgentTurnOptions,
	SystemAgentTurnStatus,
	SystemAgentWorkspaceScope,
} from './system-agent.types';

function combineSignals(signal: AbortSignal, extra: AbortSignal | undefined): AbortSignal {
	return extra ? AbortSignal.any([signal, extra]) : signal;
}

/** Transcript source of an instance agent turn. Preview access rules accept it. */
const SYSTEM_AGENT_SOURCE = 'chat';

/**
 * Runs code-defined instance agents on the Agents runtime. A conversation is
 * a private session (`accessScope = 'user'`). Its `projectId` is the working
 * project. The queue, steering, checkpoints, cancel and recording are the same
 * as for preview chat.
 */
@Service()
export class SystemAgentExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly registry: SystemAgentRegistry,
		private readonly agentRepository: AgentRepository,
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly turnExecutionService: AgentTurnExecutionService,
		private readonly messageQueue: AgentMessageQueueService,
		private readonly chatExecutionService: AgentChatExecutionService,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly txRunner: TransactionRunner,
		private readonly attachmentService: AgentChatAttachmentService,
	) {}

	/** Register a provider and make sure its agent row exists. */
	async register(provider: SystemAgentProvider): Promise<void> {
		this.registry.register(provider);
		await this.agentRepository.ensureInstanceAgent(provider.agentId, provider.name);
	}

	resourceIdFor(user: Pick<User, 'id'>): string {
		return draftChatMemoryResourceId(user.id);
	}

	getProvider(agentId: string): SystemAgentProvider {
		const provider = this.registry.get(agentId);
		if (!provider) throw new NotFoundError(`Agent "${agentId}" not found`);
		return provider;
	}

	/** Throws NotFoundError when no provider is registered for the id. */
	assertRegistered(agentId: string): void {
		this.getProvider(agentId);
	}

	async assertCanUse(agentId: string, user: User, projectId: string): Promise<SystemAgentProvider> {
		const provider = this.getProvider(agentId);
		if (!(await canUseSystemAgent(provider, user, projectId))) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}
		return provider;
	}

	/** Load a thread the user owns and can still use: the runtime floor plus the provider checks. */
	async getUsableThread(
		agentId: string,
		user: User,
		threadId: string,
	): Promise<AgentExecutionThread> {
		const thread = await this.getThread(agentId, user, threadId);
		await this.assertCanUse(agentId, user, thread.projectId);
		return thread;
	}

	// ── Threads ──────────────────────────────────────────────────────────────

	async createThread(params: {
		agentId: string;
		user: User;
		projectId: string;
		threadId?: string;
		title?: string;
	}): Promise<AgentExecutionThread> {
		const provider = await this.assertCanUse(params.agentId, params.user, params.projectId);
		const threadId = params.threadId ?? randomUUID();
		const existing = await this.threadRepository.findOneBy({ id: threadId });
		if (existing) {
			if (existing.agentId !== params.agentId || existing.ownerId !== params.user.id) {
				throw new NotFoundError('Session not found');
			}
			return existing;
		}
		const { thread } = await this.txRunner.run(
			{},
			async (ctx) =>
				await this.threadRepository.findOrCreate(
					threadId,
					provider.agentId,
					provider.name,
					params.projectId,
					{ accessScope: 'user', ownerId: params.user.id },
					ctx,
				),
		);
		if (params.title) {
			await this.threadRepository.updateOwned(thread.id, { title: params.title });
			thread.title = params.title;
		}
		return thread;
	}

	async listThreads(agentId: string, user: User, limit?: number) {
		this.getProvider(agentId);
		return await this.threadRepository.findOwnedByAgent(agentId, user.id, { limit });
	}

	async getThread(agentId: string, user: User, threadId: string): Promise<AgentExecutionThread> {
		const thread = await this.threadRepository.findOwnedById(agentId, user.id, threadId);
		if (!thread) throw new NotFoundError('Session not found');
		return thread;
	}

	async findThread(threadId: string): Promise<AgentExecutionThread | null> {
		return await this.threadRepository.findOneBy({ id: threadId });
	}

	async updateThread(
		agentId: string,
		user: User,
		threadId: string,
		changes: { title?: string; projectId?: string },
	): Promise<AgentExecutionThread> {
		const thread = await this.getThread(agentId, user, threadId);
		if (changes.projectId && changes.projectId !== thread.projectId) {
			await this.assertCanUse(agentId, user, changes.projectId);
			if (await this.isBusy(thread)) {
				throw new UserError('Wait for the current turn to finish before you change the project');
			}
		}
		await this.threadRepository.updateOwned(threadId, changes);
		return { ...thread, ...changes } as AgentExecutionThread;
	}

	async deleteThread(agentId: string, user: User, threadId: string): Promise<void> {
		const thread = await this.getThread(agentId, user, threadId);
		const result = await this.txRunner.run(
			{},
			async (ctx) =>
				await this.threadRepository.deleteSession(
					thread.projectId,
					agentId,
					threadId,
					user.id,
					ctx,
				),
		);
		if (result?.status === 'busy') {
			throw new UserError('Stop the current turn before you delete this conversation');
		}
		await this.destroyThreadWorkspace(agentId, threadId, user.id);
	}

	/**
	 * Delete the sandbox of a deleted thread through the provider's workspace
	 * source. Hosts that delete threads on their own path call this too.
	 */
	async destroyThreadWorkspace(agentId: string, threadId: string, userId?: string): Promise<void> {
		const source = this.registry.get(agentId)?.workspace;
		if (!source?.destroy) return;
		try {
			await source.destroy({ agentId, threadId, userId });
		} catch (error) {
			this.logger.warn('Instance agent workspace destroy failed', { threadId, error });
		}
	}

	private workspaceScope(thread: AgentExecutionThread, user: User): SystemAgentWorkspaceScope {
		return { agentId: thread.agentId, threadId: thread.id, projectId: thread.projectId, user };
	}

	async isBusy(thread: AgentExecutionThread): Promise<boolean> {
		if (await this.executionRepository.existsRunningByThread(thread.id)) return true;
		return (
			(await this.checkpointStorage.findSuspendedForThread(thread.agentId, thread.id)) !== null
		);
	}

	/** Status of the latest turn: running, suspended for HITL, or idle. */
	async getStatus(thread: AgentExecutionThread) {
		const running = await this.executionRepository.existsRunningByThread(thread.id);
		const checkpoint = running
			? null
			: await this.checkpointStorage.findSuspendedForThread(thread.agentId, thread.id);
		const latest = await this.executionRepository.findLatestByThreadId(thread.id);
		return {
			status: running ? 'running' : checkpoint ? 'suspended' : 'idle',
			latestExecutionId: latest?.id ?? null,
			checkpoint,
		} as const;
	}

	// ── Messages ─────────────────────────────────────────────────────────────

	/**
	 * Queue a user message. The queue starts it when the conversation is idle.
	 * While a turn runs, the caller can steer the queued message into it.
	 */
	async sendMessage(params: {
		agentId: string;
		user: User;
		threadId: string;
		message: string;
		attachments?: StoredAttachmentRef[];
		options?: SystemAgentTurnOptions;
		messageId?: string;
		hidden?: boolean;
	}) {
		const thread = await this.getThread(params.agentId, params.user, params.threadId);
		await this.assertCanUse(params.agentId, params.user, thread.projectId);
		return await this.messageQueue.enqueue({
			agentId: params.agentId,
			projectId: thread.projectId,
			threadId: thread.id,
			sessionMode: 'existing',
			source: SYSTEM_AGENT_SOURCE,
			payload: {
				kind: 'system',
				userId: params.user.id,
				message: params.message,
				resourceId: this.resourceIdFor(params.user),
				attachments: params.attachments,
				...(params.messageId ? { messageId: params.messageId } : {}),
				...(params.options ? { options: params.options } : {}),
				...(params.hidden ? { hidden: true } : {}),
			},
		});
	}

	/**
	 * Steer a queued message into the running turn. Returns false when no turn
	 * accepts steering; the message then waits in the queue.
	 */
	async steerIntoRunningTurn(thread: AgentExecutionThread, user: User, queueId: string) {
		const execution = await this.executionRepository.findSteerable(thread.id);
		if (!execution) return false;
		try {
			await this.messageQueue.steer({
				projectId: thread.projectId,
				agentId: thread.agentId,
				threadId: thread.id,
				userId: user.id,
				queueId,
				executionId: execution.id,
			});
			return true;
		} catch (error) {
			this.logger.debug('Could not steer instance agent message', { error });
			return false;
		}
	}

	/** Called by the queue consumer for a claimed instance agent message. */
	async consume(
		claim: ClaimedAgentMessage,
		user: User,
		signal: AbortSignal,
		send: (event: AgentSseEvent) => void,
	): Promise<void> {
		const { thread, admission, payload } = claim;
		if (payload.kind !== 'system') return;
		const provider = this.getProvider(thread.agentId);
		signal.throwIfAborted();
		const resourceId = payload.resourceId;
		const workspace = await provider.workspace?.acquire(this.workspaceScope(thread, user));
		const turn: SystemAgentTurn = {
			type: 'start',
			user,
			thread,
			resourceId,
			abortSignal: signal,
			workspace,
			executionId: admission.executionId,
			message: payload.message,
			attachments: payload.attachments ?? [],
			options: payload.options ?? {},
		};
		const handle = await provider.prepareTurn(turn);
		const attachments = payload.attachments ?? [];
		const text = handle.input ?? payload.message;
		if (attachments.length > 0) {
			// Messages keep file references. The runtime loads bytes from binary data per call.
			handle.agent.fileStore(
				this.attachmentService.getFileStore(
					{ agentId: thread.agentId, projectId: thread.projectId },
					handle.agent.snapshot.model.provider ?? '',
				),
			);
		}
		const input =
			attachments.length > 0 && typeof text === 'string'
				? buildInboundUserMessage(text, attachments)
				: text;
		await this.runTurn(provider, thread, user, workspace, handle, send, admission, async () => ({
			type: 'start',
			input,
			options: {
				persistence: { threadId: thread.id, resourceId, hostMetadata: handle.hostMetadata },
				...handle.runOptions,
				abortSignal: combineSignals(signal, handle.runOptions?.abortSignal),
			},
			recording: {
				...claim.recording,
				...(handle.hideUserMessage ? { hideUserMessageFromTranscript: true } : {}),
			},
		}));
	}

	/** Resume a suspended tool call. Runs the continuation in the background. */
	async resume(params: {
		agentId: string;
		user: User;
		threadId: string;
		resumeData: unknown;
		runId?: string;
		toolCallId?: string;
		send?: (event: AgentSseEvent) => void;
	}): Promise<{ runId: string; toolCallId: string; done: Promise<void> }> {
		const thread = await this.getThread(params.agentId, params.user, params.threadId);
		const provider = await this.assertCanUse(params.agentId, params.user, thread.projectId);
		const checkpoint = await this.checkpointStorage.findSuspendedForThread(
			thread.agentId,
			thread.id,
		);
		const pending = Object.values(checkpoint?.pendingToolCalls ?? {}).find(
			(
				toolCall,
			): toolCall is Extract<
				SerializableAgentState['pendingToolCalls'][string],
				{ suspended: true }
			> =>
				toolCall.suspended &&
				(params.toolCallId === undefined || toolCall.toolCallId === params.toolCallId),
		);
		if (!checkpoint || !pending) throw new UserError('This action is no longer waiting for input');
		const runId = params.runId ?? pending.runId;
		const resourceId = this.resourceIdFor(params.user);
		if (checkpoint.persistence?.resourceId !== resourceId) {
			throw new NotFoundError('Session not found');
		}
		const controller = new AbortController();
		const workspace = await provider.workspace?.acquire(this.workspaceScope(thread, params.user));
		const handle = await provider.prepareTurn({
			type: 'resume',
			user: params.user,
			thread,
			resourceId,
			abortSignal: controller.signal,
			workspace,
			runId,
			toolCallId: pending.toolCallId,
			checkpointHostMetadata: checkpoint.persistence.hostMetadata ?? {},
			resumeData: params.resumeData,
		});
		const recording: StartExecutionParams = {
			threadId: thread.id,
			agentId: thread.agentId,
			agentName: thread.agentName,
			projectId: thread.projectId,
			resourceId,
			access: { accessScope: 'user', ownerId: params.user.id },
			userMessage: null,
			sessionMode: 'existing',
			source: SYSTEM_AGENT_SOURCE,
		};
		const done = this.runTurn(
			provider,
			thread,
			params.user,
			workspace,
			handle,
			params.send ?? (() => {}),
			undefined,
			async () => ({
				type: 'resume',
				resumeData: params.resumeData,
				options: {
					...handle.runOptions,
					runId,
					toolCallId: pending.toolCallId,
					hostMetadata: handle.hostMetadata,
					abortSignal: combineSignals(controller.signal, handle.runOptions?.abortSignal),
				},
				recording,
			}),
		).catch((error: unknown) => {
			this.logger.warn('Instance agent resume failed', { threadId: thread.id, error });
		});
		return { runId, toolCallId: pending.toolCallId, done };
	}

	/**
	 * Build the queue input for a message sent through the generic Agents chat
	 * endpoint. Creates the session when the client starts a new one.
	 */
	async prepareChatMessage(params: {
		agentId: string;
		user: User;
		/** The working project of a new session. An existing session keeps its own. */
		projectId?: string;
		sessionId?: string;
		message: string;
		messageId?: string;
		hostContext?: Record<string, unknown>;
		storeAttachments?: (
			threadId: string,
			projectId: string,
		) => Promise<StoredAttachmentRef[] | undefined>;
	}): Promise<Parameters<AgentMessageQueueService['enqueue']>[0]> {
		const existing = params.sessionId
			? await this.threadRepository.findOwnedById(params.agentId, params.user.id, params.sessionId)
			: null;
		if (existing && params.projectId && existing.projectId !== params.projectId) {
			throw new NotFoundError('Session not found');
		}
		const projectId = existing?.projectId ?? params.projectId;
		if (!projectId) throw new UserError('A new session needs a working project');
		const provider = await this.assertCanUse(params.agentId, params.user, projectId);
		const thread =
			existing ??
			(await this.createThread({
				agentId: params.agentId,
				user: params.user,
				projectId,
				...(params.sessionId ? { threadId: params.sessionId } : {}),
			}));
		const options =
			(await provider.chatTurnOptions?.(params.user, thread, params.hostContext)) ?? {};
		const attachments = await params.storeAttachments?.(thread.id, thread.projectId);
		return {
			agentId: params.agentId,
			projectId: thread.projectId,
			threadId: thread.id,
			sessionMode: 'existing',
			source: SYSTEM_AGENT_SOURCE,
			payload: {
				kind: 'system',
				userId: params.user.id,
				message: params.message,
				resourceId: this.resourceIdFor(params.user),
				...(params.messageId ? { messageId: params.messageId } : {}),
				...(attachments?.length ? { attachments } : {}),
				options,
			},
		};
	}

	/** Resume by run id, for the generic Agents chat resume endpoint. Streams to `send`. */
	async resumeRun(params: {
		agentId: string;
		user: User;
		runId: string;
		toolCallId: string;
		resumeData: unknown;
		send: (event: AgentSseEvent) => void;
	}): Promise<void> {
		const provider = this.getProvider(params.agentId);
		const state = await this.checkpointStorage.load(params.runId, params.agentId);
		const threadId = state?.persistence?.threadId;
		if (!threadId) throw new UserError('This action is no longer waiting for input');
		const { done } = await this.resume({
			agentId: params.agentId,
			user: params.user,
			threadId,
			runId: params.runId,
			toolCallId: params.toolCallId,
			resumeData: provider.normalizeResumeData
				? provider.normalizeResumeData(params.resumeData)
				: params.resumeData,
			send: params.send,
		});
		await done;
	}

	/** Stop the running turn, or cancel the suspended one. */
	async cancel(agentId: string, user: User, threadId: string): Promise<boolean> {
		const thread = await this.getThread(agentId, user, threadId);
		const latest = await this.executionRepository.findLatestByThreadId(thread.id);
		if (!latest) return false;
		return await this.chatExecutionService.requestCancel({
			projectId: thread.projectId,
			agentId,
			threadId: thread.id,
			executionId: latest.id,
			userId: user.id,
		});
	}

	private async runTurn(
		provider: SystemAgentProvider,
		thread: AgentExecutionThread,
		user: User,
		workspace: unknown,
		handle: SystemAgentTurnHandle,
		send: (event: AgentSseEvent) => void,
		admission: AgentExecutionAdmission | undefined,
		prepare: () => Promise<AgentTurnRequest>,
	): Promise<void> {
		let status: SystemAgentTurnStatus = 'completed';
		let executionId = admission?.executionId;
		let error: unknown;
		try {
			const stream = this.turnExecutionService.execute({
				admittedExecution: admission,
				agentInstance: handle.agent,
				toolRegistry: handle.toolRegistry ?? new Map(),
				mcpServerAttributions: new Map(),
				context: { projectId: thread.projectId, agentId: provider.agentId, threadId: thread.id },
				previewChat: true,
				onExecutionStarted: (id) => {
					executionId = id;
				},
				prepare,
			});
			for await (const chunk of stream) {
				emitChunkEvents(chunk, send);
				if (chunk.type === 'tool-call-suspended') status = 'suspended';
				if (chunk.type === 'error' && status !== 'suspended') {
					status = 'errored';
					error = chunk.error;
				}
				handle.onChunk?.(chunk);
			}
		} catch (caught) {
			error = caught;
			status = handle.runOptions?.abortSignal?.aborted ? 'cancelled' : 'errored';
			throw caught;
		} finally {
			const execution = executionId
				? await this.executionRepository.findExecution(executionId)
				: null;
			if (execution?.status === 'cancelled') status = 'cancelled';
			try {
				await handle.onSettled?.({ status, executionId, error });
			} catch (settleError) {
				this.logger.warn('Instance agent turn settle hook failed', {
					threadId: thread.id,
					error: settleError,
				});
			}
			if (workspace !== undefined && provider.workspace?.release) {
				try {
					await provider.workspace.release(this.workspaceScope(thread, user), workspace, {
						status,
						executionId,
						error,
					});
				} catch (releaseError) {
					this.logger.warn('Instance agent workspace release failed', {
						threadId: thread.id,
						error: releaseError,
					});
				}
			}
			if (status !== 'suspended' && status !== 'cancelled') {
				send({ type: 'done', sessionId: thread.id, executionId: executionId ?? '' });
			}
		}
	}
}
