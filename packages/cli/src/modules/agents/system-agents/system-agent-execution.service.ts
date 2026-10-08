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
import { AgentExecutionService, type StartExecutionParams } from '../agent-execution.service';
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
import { buildInboundUserMessage } from '../utils/inbound-attachments';
import { canUseSystemAgent } from './system-agent-access';
import { SystemAgentHostEventChannel } from './system-agent-host-events';
import { SystemAgentRegistry } from './system-agent-registry';
import type {
	SystemAgentProvider,
	SystemAgentTurnHandle,
	SystemAgentTurnOptions,
	SystemAgentTurnOutcome,
	SystemAgentTurnStatus,
	SystemAgentWorkspaceScope,
} from './system-agent.types';

type SuspendedToolCall = Extract<
	SerializableAgentState['pendingToolCalls'][string],
	{ suspended: true }
>;

export type SystemAgentThreadStatus = 'running' | 'suspended' | 'idle';

/**
 * Transcript source of a system-agent turn. It is a Preview source, so the
 * queue's Preview access rules accept the session.
 */
const SYSTEM_AGENT_SOURCE = 'chat';

/** The workspace lease of one turn, bound to the source that gave it. */
interface TurnWorkspace {
	lease: unknown;
	/** Report the turn outcome to the source. It never throws. */
	release(outcome: SystemAgentTurnOutcome): Promise<void>;
}

function combineSignals(signal: AbortSignal, extra: AbortSignal | undefined): AbortSignal {
	return extra ? AbortSignal.any([signal, extra]) : signal;
}

/**
 * Runs code-defined instance agents on the Agents runtime. A conversation is
 * a private session (`accessScope = 'user'`). Its `projectId` is the working
 * project. The queue, steering, checkpoints, cancel and recording are the same
 * as for Preview chat.
 *
 * Every entry point that starts or continues a turn checks the runtime floor:
 * the user owns the thread, can read its working project, and passes the
 * provider's own checks.
 */
@Service()
export class SystemAgentExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly registry: SystemAgentRegistry,
		private readonly agentRepository: AgentRepository,
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly executionService: AgentExecutionService,
		private readonly turnExecutionService: AgentTurnExecutionService,
		private readonly messageQueue: AgentMessageQueueService,
		private readonly chatExecutionService: AgentChatExecutionService,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly txRunner: TransactionRunner,
		private readonly attachmentService: AgentChatAttachmentService,
	) {}

	/** Register a provider and make sure its instance agent row exists. */
	async register<TLease>(provider: SystemAgentProvider<TLease>): Promise<void> {
		await this.agentRepository.ensureInstanceAgent(provider.agentId, provider.name);
		this.registry.register(provider);
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

	/** The runtime floor plus the provider checks, for a working project. */
	async assertCanUse(agentId: string, user: User, projectId: string): Promise<SystemAgentProvider> {
		const provider = this.getProvider(agentId);
		// Refuse with "not found", so a user without access learns nothing about the agent.
		if (!(await canUseSystemAgent(provider, user, projectId))) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}
		return provider;
	}

	/** Load a thread the user owns and can still use: thread ownership, the floor and the provider. */
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
			if (
				existing.agentId !== params.agentId ||
				existing.accessScope !== 'user' ||
				existing.ownerId !== params.user.id
			) {
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
		this.assertRegistered(agentId);
		return await this.threadRepository.findOwnedByAgent(agentId, user.id, { limit });
	}

	/** Load a thread the user owns. It checks ownership only, not the floor. */
	async getThread(agentId: string, user: User, threadId: string): Promise<AgentExecutionThread> {
		this.assertRegistered(agentId);
		const thread = await this.threadRepository.findOwnedById(agentId, user.id, threadId);
		if (!thread) throw new NotFoundError('Session not found');
		return thread;
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
		if (changes.title !== undefined) thread.title = changes.title;
		if (changes.projectId !== undefined) thread.projectId = changes.projectId;
		return thread;
	}

	/** Delete a thread with its executions, memory and stored files. */
	async deleteThread(agentId: string, user: User, threadId: string): Promise<void> {
		const thread = await this.getThread(agentId, user, threadId);
		const deleted = await this.executionService.deleteThread(
			thread.projectId,
			agentId,
			thread.id,
			user.id,
		);
		if (!deleted) throw new NotFoundError('Session not found');
		await this.destroyThreadWorkspace(agentId, thread.id, user.id);
	}

	/**
	 * Delete the sandbox of a deleted thread through the workspace source of
	 * the provider. A host that deletes threads on its own path calls this too.
	 * A failure is logged: the thread is already gone.
	 */
	async destroyThreadWorkspace(agentId: string, threadId: string, userId?: string): Promise<void> {
		const source = this.registry.get(agentId)?.workspace;
		if (!source?.destroy) return;
		try {
			await source.destroy({ agentId, threadId, ...(userId ? { userId } : {}) });
		} catch (error) {
			this.logger.warn('System agent workspace destroy failed', { agentId, threadId, error });
		}
	}

	async isBusy(thread: AgentExecutionThread): Promise<boolean> {
		if (await this.executionRepository.existsRunningByThread(thread.id)) return true;
		return (
			(await this.checkpointStorage.findSuspendedForThread(thread.agentId, thread.id)) !== null
		);
	}

	/**
	 * Status of the thread. A queued message (for example a hidden follow-up
	 * turn) counts as running, so a client does not see the thread as idle
	 * between a turn and its follow-up. An open suspension still wins: the
	 * queue waits for the user to answer it.
	 */
	async getStatus(thread: AgentExecutionThread): Promise<{
		status: SystemAgentThreadStatus;
		latestExecutionId: string | null;
		checkpoint: SerializableAgentState | null;
	}> {
		const running = await this.executionRepository.existsRunningByThread(thread.id);
		const checkpoint = running
			? null
			: await this.checkpointStorage.findSuspendedForThread(thread.agentId, thread.id);
		const latest = await this.executionRepository.findLatestByThreadId(thread.id);
		const queued =
			!running && !checkpoint && (await this.messageQueue.hasQueuedMessages(thread.id));
		let status: SystemAgentThreadStatus = 'idle';
		if (running || queued) status = 'running';
		else if (checkpoint) status = 'suspended';
		return { status, latestExecutionId: latest?.id ?? null, checkpoint };
	}

	// ── Messages ─────────────────────────────────────────────────────────────

	/**
	 * Queue a message. The queue starts it when the conversation is idle.
	 * While a turn runs, the caller can steer the queued message into it.
	 * A `hidden` message is a machine turn: it stays out of the transcript.
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
		const thread = await this.getUsableThread(params.agentId, params.user, params.threadId);
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
				...(params.attachments?.length ? { attachments: params.attachments } : {}),
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
	async steerIntoRunningTurn(
		thread: AgentExecutionThread,
		user: User,
		queueId: string,
	): Promise<boolean> {
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
				kind: 'system',
			});
			return true;
		} catch (error) {
			this.logger.debug('Could not steer system agent message', { threadId: thread.id, error });
			return false;
		}
	}

	/**
	 * Run a claimed system-agent message. The queue consumer calls this after
	 * it checked the runtime floor for the thread owner.
	 */
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
		const { resourceId } = payload;
		const attachments = payload.attachments ?? [];
		const hostEvents = this.createHostEventChannel(thread, send);
		const workspace = await this.acquireWorkspace(provider, thread, user);
		const handle = await this.prepareOrRelease(workspace, hostEvents, signal, async () => {
			const prepared = await provider.prepareTurn({
				type: 'start',
				user,
				thread,
				resourceId,
				abortSignal: signal,
				...(workspace ? { workspace: workspace.lease } : {}),
				emitHostEvent: hostEvents.emit,
				executionId: admission.executionId,
				message: payload.message,
				attachments,
				options: payload.options ?? {},
			});
			if (attachments.length > 0) {
				// Messages keep file references. The runtime loads bytes from binary data per call.
				prepared.agent.fileStore(
					this.attachmentService.getFileStore(
						{ agentId: thread.agentId, projectId: thread.projectId },
						prepared.agent.snapshot.model.provider ?? '',
					),
				);
			}
			return prepared;
		});
		const text = handle.input ?? payload.message;
		const input =
			attachments.length > 0 && typeof text === 'string'
				? buildInboundUserMessage(text, attachments)
				: text;
		const abortSignal = combineSignals(signal, handle.runOptions?.abortSignal);
		await this.runTurn(
			provider,
			thread,
			handle,
			workspace,
			hostEvents,
			send,
			abortSignal,
			admission,
			async () => ({
				type: 'start',
				input,
				options: {
					persistence: { threadId: thread.id, resourceId, hostMetadata: handle.hostMetadata },
					...handle.runOptions,
					abortSignal,
				},
				recording: {
					...claim.recording,
					...(handle.hideUserMessage ? { hideUserMessageFromTranscript: true } : {}),
				},
			}),
		);
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
		const thread = await this.getUsableThread(params.agentId, params.user, params.threadId);
		const provider = this.getProvider(params.agentId);
		const checkpoint = await this.checkpointStorage.findSuspendedForThread(
			thread.agentId,
			thread.id,
		);
		const pending = Object.values(checkpoint?.pendingToolCalls ?? {}).find(
			(toolCall): toolCall is SuspendedToolCall =>
				toolCall.suspended &&
				(params.toolCallId === undefined || toolCall.toolCallId === params.toolCallId),
		);
		if (!checkpoint || !pending) throw new UserError('This action is no longer waiting for input');
		const runId = params.runId ?? pending.runId;
		const resourceId = this.resourceIdFor(params.user);
		if (checkpoint.persistence?.resourceId !== resourceId) {
			throw new NotFoundError('Session not found');
		}
		const checkpointHostMetadata = checkpoint.persistence.hostMetadata ?? {};
		const controller = new AbortController();
		const send = params.send ?? (() => {});
		const hostEvents = this.createHostEventChannel(thread, send);
		const workspace = await this.acquireWorkspace(provider, thread, params.user);
		const handle = await this.prepareOrRelease(
			workspace,
			hostEvents,
			controller.signal,
			async () =>
				await provider.prepareTurn({
					type: 'resume',
					user: params.user,
					thread,
					resourceId,
					abortSignal: controller.signal,
					...(workspace ? { workspace: workspace.lease } : {}),
					emitHostEvent: hostEvents.emit,
					runId,
					toolCallId: pending.toolCallId,
					checkpointHostMetadata,
					resumeData: params.resumeData,
				}),
		);
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
		const abortSignal = combineSignals(controller.signal, handle.runOptions?.abortSignal);
		const done = this.runTurn(
			provider,
			thread,
			handle,
			workspace,
			hostEvents,
			send,
			abortSignal,
			undefined,
			async () => ({
				type: 'resume',
				resumeData: params.resumeData,
				options: {
					...handle.runOptions,
					runId,
					toolCallId: pending.toolCallId,
					hostMetadata: handle.hostMetadata,
					abortSignal,
				},
				recording,
			}),
		).catch((error: unknown) => {
			this.logger.warn('System agent resume failed', { threadId: thread.id, error });
		});
		return { runId, toolCallId: pending.toolCallId, done };
	}

	/**
	 * Build the queue input for a message sent through the system-agent chat
	 * route. Creates the session when the client starts a new one.
	 */
	async prepareChatMessage(params: {
		agentId: string;
		user: User;
		/** The working project of a new session. An existing session keeps its own. */
		projectId?: string;
		sessionId?: string;
		message: string;
		messageId?: string;
		clientContext?: Record<string, unknown>;
		storeAttachments?: (
			threadId: string,
			projectId: string,
		) => Promise<StoredAttachmentRef[] | undefined>;
	}): Promise<Parameters<AgentMessageQueueService['enqueue']>[0]> {
		this.assertRegistered(params.agentId);
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
			(await provider.chatTurnOptions?.(params.user, thread, params.clientContext)) ?? {};
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

	/** Resume by run id, for the system-agent chat resume route. Streams to `send`. */
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
			surface: 'preview',
		});
	}

	/**
	 * Get the workspace lease for one turn from the source of the provider.
	 * Returns `undefined` when the provider has no source or the source gives
	 * no lease. A failed acquisition fails the turn before it is prepared.
	 */
	private async acquireWorkspace(
		provider: SystemAgentProvider,
		thread: AgentExecutionThread,
		user: User,
	): Promise<TurnWorkspace | undefined> {
		const source = provider.workspace;
		if (!source) return undefined;
		const scope: SystemAgentWorkspaceScope = {
			agentId: thread.agentId,
			threadId: thread.id,
			projectId: thread.projectId,
			user,
		};
		const lease = await source.acquire(scope);
		if (lease === undefined) return undefined;
		return {
			lease,
			release: async (outcome) => {
				if (!source.release) return;
				try {
					await source.release(scope, lease, outcome);
				} catch (error) {
					this.logger.warn('System agent workspace release failed', {
						threadId: thread.id,
						error,
					});
				}
			},
		};
	}

	/**
	 * Prepare a turn. When the preparation fails, release the lease before the
	 * error goes up, so that the source does not keep a lease for a turn that
	 * never ran.
	 */
	private async prepareOrRelease(
		workspace: TurnWorkspace | undefined,
		hostEvents: SystemAgentHostEventChannel,
		signal: AbortSignal,
		prepare: () => Promise<SystemAgentTurnHandle>,
	): Promise<SystemAgentTurnHandle> {
		try {
			return await prepare();
		} catch (error) {
			hostEvents.close();
			await workspace?.release({ status: signal.aborted ? 'cancelled' : 'errored', error });
			throw error;
		}
	}

	/**
	 * The host event channel of one turn. It sends to the same stream as the
	 * turn, and the turn recorder records its events.
	 */
	private createHostEventChannel(
		thread: AgentExecutionThread,
		send: (event: AgentSseEvent) => void,
	): SystemAgentHostEventChannel {
		return new SystemAgentHostEventChannel(send, (name) => {
			this.logger.debug('System agent host event after the turn settled was dropped', {
				threadId: thread.id,
				name,
			});
		});
	}

	private async runTurn(
		provider: SystemAgentProvider,
		thread: AgentExecutionThread,
		handle: SystemAgentTurnHandle,
		workspace: TurnWorkspace | undefined,
		hostEvents: SystemAgentHostEventChannel,
		send: (event: AgentSseEvent) => void,
		abortSignal: AbortSignal,
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
				chatSurface: 'preview',
				onExecutionStarted: (id) => {
					executionId = id;
				},
				onRecorderCreated: (recorder) => hostEvents.attach(recorder),
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
			status = abortSignal.aborted ? 'cancelled' : 'errored';
			throw caught;
		} finally {
			// The turn record is final here. A later event cannot be stored.
			hostEvents.close();
			const execution = executionId
				? await this.executionRepository.findExecution(executionId)
				: null;
			if (execution?.status === 'cancelled') status = 'cancelled';
			try {
				await handle.onSettled?.({ status, executionId, error });
			} catch (settleError) {
				this.logger.warn('System agent turn settle hook failed', {
					threadId: thread.id,
					error: settleError,
				});
			}
			await workspace?.release({ status, executionId, error });
			if (status !== 'suspended' && status !== 'cancelled') {
				send({ type: 'done', sessionId: thread.id, executionId: executionId ?? '' });
			}
		}
	}
}
