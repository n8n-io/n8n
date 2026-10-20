import type { SerializableAgentState } from '@n8n/agents';
import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, type OperationContext, type User } from '@n8n/db';
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
import { systemChatMemoryResourceId } from '../utils/agent-memory-scope';
import { buildInboundUserMessage } from '../utils/inbound-attachments';
import { SYSTEM_CHAT_SOURCE } from '../utils/agent-thread-access';
import { canUseSystemAgent } from './system-agent-access';
import { SystemAgentRegistry } from './system-agent-registry';
import type {
	SystemAgentProvider,
	SystemAgentTurnHandle,
	SystemAgentTurnOptions,
	SystemAgentTurnStatus,
} from './system-agent.types';

type SuspendedToolCall = Extract<
	SerializableAgentState['pendingToolCalls'][string],
	{ suspended: true }
>;

export type SystemAgentThreadStatus = 'running' | 'suspended' | 'idle';

type SystemQueueInput = Parameters<AgentMessageQueueService['enqueue']>[0];

interface SystemMessageInput {
	message: string;
	attachments?: StoredAttachmentRef[];
	options?: SystemAgentTurnOptions;
	messageId?: string;
	/** A machine turn: it stays out of the transcript. */
	hidden?: boolean;
}

interface ResumeParams {
	agentId: string;
	user: User;
	threadId: string;
	resumeData: unknown;
	runId?: string;
	toolCallId?: string;
	send?: (event: AgentSseEvent) => void;
}

interface ResumeHandle {
	runId: string;
	toolCallId: string;
	done: Promise<void>;
}

/** The SDK run options of a handle, without its abort signal. `runTurn` links that signal. */
function runOptionsOf(handle: SystemAgentTurnHandle) {
	const { abortSignal: _abortSignal, ...runOptions } = handle.runOptions ?? {};
	return runOptions;
}

/**
 * Runs code-defined instance agents on the Agents runtime. A conversation is
 * a private session (`accessScope = 'user'`). Its `projectId` is the working
 * project. The queue, steering, checkpoints, cancel and recording are shared
 * with project-agent chats, but the conversation has its own `system` chat
 * surface: its own memory resource scope, transcript source and access rule.
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
	async register(provider: SystemAgentProvider): Promise<void> {
		await this.agentRepository.ensureInstanceAgent(provider.agentId, provider.name);
		this.registry.register(provider);
	}

	resourceIdFor(user: Pick<User, 'id'>): string {
		return systemChatMemoryResourceId(user.id);
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
		const existing = await this.threadRepository.findOwnedById(
			params.agentId,
			params.user.id,
			threadId,
		);
		if (existing) {
			// The access check above ran for `params.projectId`, not for the project of this thread.
			if (existing.projectId !== params.projectId) throw new NotFoundError('Session not found');
			return existing;
		}
		return await this.txRunner.run({}, async (ctx) => {
			let thread: AgentExecutionThread;
			try {
				({ thread } = await this.threadRepository.findOrCreate(
					threadId,
					provider.agentId,
					provider.name,
					params.projectId,
					{ accessScope: 'user', ownerId: params.user.id },
					ctx,
				));
			} catch (error) {
				// The id belongs to a thread of another user, agent or project.
				if (error instanceof UserError) throw new NotFoundError('Session not found');
				throw error;
			}
			// `findOrCreate` also matches a child thread of the user. A session is top-level.
			if (thread.parentThreadId !== null) throw new NotFoundError('Session not found');
			if (params.title) {
				await this.threadRepository.renameOwned(
					provider.agentId,
					params.user.id,
					thread.id,
					params.title,
					ctx,
				);
				thread.title = params.title;
			}
			return thread;
		});
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
		const { title, projectId } = changes;
		const moving = projectId !== undefined && projectId !== thread.projectId;
		if (moving) await this.assertCanUse(agentId, user, projectId);
		await this.txRunner.run({}, async (ctx) => {
			if (moving) {
				// Enqueue, claim and resume admission lock the thread too, so no turn
				// can start between this check and the move.
				const locked = await this.threadRepository.lockById(threadId, ctx);
				if (!locked) throw new NotFoundError('Session not found');
				if ((await this.resolveStatus(locked, ctx)).status !== 'idle') {
					throw new UserError('Wait for the current turn to finish before you change the project');
				}
			}
			const renamed =
				title === undefined ||
				(await this.threadRepository.renameOwned(agentId, user.id, threadId, title, ctx));
			const moved =
				projectId === undefined ||
				(await this.threadRepository.moveOwned(agentId, user.id, threadId, projectId, ctx));
			if (!renamed || !moved) throw new NotFoundError('Session not found');
		});
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
	}

	async getStatus(thread: AgentExecutionThread): Promise<{
		status: SystemAgentThreadStatus;
		latestExecutionId: string | null;
		checkpoint: SerializableAgentState | null;
	}> {
		const { status, checkpoint } = await this.resolveStatus(thread);
		const latest = await this.executionRepository.findLatestByThreadId(thread.id);
		return { status, latestExecutionId: latest?.id ?? null, checkpoint };
	}

	/**
	 * A queued message (for example a hidden follow-up turn) counts as running,
	 * so the thread is not idle between a turn and its follow-up. An open
	 * suspension still wins: the queue waits for the user to answer it.
	 */
	private async resolveStatus(
		thread: AgentExecutionThread,
		ctx: OperationContext = {},
	): Promise<{
		status: SystemAgentThreadStatus;
		checkpoint: SerializableAgentState | null;
	}> {
		if (await this.executionRepository.existsRunningByThread(thread.id, ctx)) {
			return { status: 'running', checkpoint: null };
		}
		const checkpoint = await this.checkpointStorage.findSuspendedForThread(
			thread.agentId,
			thread.id,
			ctx,
		);
		if (checkpoint) return { status: 'suspended', checkpoint };
		const queued = await this.messageQueue.hasQueuedMessages(thread.id, ctx);
		return { status: queued ? 'running' : 'idle', checkpoint: null };
	}

	// ── Messages ─────────────────────────────────────────────────────────────

	/**
	 * Queue a message. The queue starts it when the conversation is idle.
	 * While a turn runs, the caller can steer the queued message into it.
	 * A `hidden` message is a machine turn: it stays out of the transcript.
	 */
	async sendMessage(
		params: SystemMessageInput & { agentId: string; user: User; threadId: string },
	) {
		const thread = await this.getUsableThread(params.agentId, params.user, params.threadId);
		return await this.messageQueue.enqueue(this.queueInput(thread, params.user, params));
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
		const controller = new AbortController();
		// Until the runtime takes the turn, the claim signal (Stop, lost ownership) stops provider setup.
		// The runtime then links the claim signal itself, so the link ends with setup.
		const stopSetup = () => controller.abort(signal.reason);
		signal.addEventListener('abort', stopSetup, { once: true });
		let handle: SystemAgentTurnHandle;
		try {
			handle = await provider.prepareTurn({
				type: 'start',
				user,
				thread,
				resourceId,
				abortSignal: controller.signal,
				executionId: admission.executionId,
				message: payload.message,
				attachments,
				options: payload.options ?? {},
			});
		} finally {
			signal.removeEventListener('abort', stopSetup);
		}
		const text = handle.input ?? payload.message;
		this.attachFileStore(handle, thread);
		const input =
			attachments.length > 0 && typeof text === 'string'
				? buildInboundUserMessage(text, attachments)
				: text;
		await this.runTurn({
			thread,
			handle,
			send,
			controller,
			admission,
			prepare: async () => ({
				type: 'start',
				input,
				options: {
					...runOptionsOf(handle),
					persistence: { threadId: thread.id, resourceId, hostMetadata: handle.hostMetadata },
					// The claim signal stops the turn only until the runtime admits it.
					abortSignal: signal,
				},
				recording: claim.recording,
			}),
		});
	}

	/**
	 * Resume a suspended tool call. Runs the continuation in the background:
	 * `done` settles when the turn ends and logs a failure instead of rejecting.
	 */
	async resume(params: ResumeParams): Promise<ResumeHandle> {
		const resumed = await this.startResume(params);
		const done = resumed.done.catch((error: unknown) => {
			this.logger.warn('System agent resume failed', { threadId: params.threadId, error });
		});
		return { ...resumed, done };
	}

	/** Start a resume. `done` rejects when the turn fails. */
	private async startResume(params: ResumeParams): Promise<ResumeHandle> {
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
		// A client run id must name the open suspension, not an earlier run.
		if (!checkpoint || !pending || (params.runId !== undefined && params.runId !== pending.runId)) {
			throw new UserError('This action is no longer waiting for input');
		}
		const { runId } = pending;
		const resourceId = this.resourceIdFor(params.user);
		if (checkpoint.persistence?.resourceId !== resourceId) {
			throw new NotFoundError('Session not found');
		}
		const controller = new AbortController();
		const handle = await provider.prepareTurn({
			type: 'resume',
			user: params.user,
			thread,
			resourceId,
			abortSignal: controller.signal,
			runId,
			toolCallId: pending.toolCallId,
			checkpointHostMetadata: checkpoint.persistence.hostMetadata ?? {},
			resumeData: params.resumeData,
		});
		this.attachFileStore(handle, thread);
		const recording: StartExecutionParams = {
			threadId: thread.id,
			agentId: thread.agentId,
			agentName: thread.agentName,
			projectId: thread.projectId,
			resourceId,
			access: { accessScope: 'user', ownerId: params.user.id },
			userMessage: null,
			sessionMode: 'existing',
			source: SYSTEM_CHAT_SOURCE,
		};
		const done = this.runTurn({
			thread,
			handle,
			send: params.send ?? (() => {}),
			controller,
			prepare: async () => ({
				type: 'resume',
				resumeData: params.resumeData,
				options: {
					...runOptionsOf(handle),
					runId,
					toolCallId: pending.toolCallId,
					hostMetadata: handle.hostMetadata,
				},
				recording,
			}),
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
	}): Promise<SystemQueueInput> {
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
		return this.queueInput(thread, params.user, {
			message: params.message,
			messageId: params.messageId,
			attachments,
			options,
		});
	}

	/** The queue input of a system message in an existing thread. */
	private queueInput(
		thread: AgentExecutionThread,
		user: User,
		input: SystemMessageInput,
	): SystemQueueInput {
		return {
			agentId: thread.agentId,
			projectId: thread.projectId,
			threadId: thread.id,
			sessionMode: 'existing',
			source: SYSTEM_CHAT_SOURCE,
			payload: {
				kind: 'system',
				userId: user.id,
				message: input.message,
				resourceId: this.resourceIdFor(user),
				...(input.attachments?.length ? { attachments: input.attachments } : {}),
				...(input.messageId ? { messageId: input.messageId } : {}),
				...(input.options ? { options: input.options } : {}),
				...(input.hidden ? { hidden: true } : {}),
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
		// A failure rejects, so the route can send an error event.
		const { done } = await this.startResume({
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

	/**
	 * Stop the running turn, or cancel the suspended one. It checks thread
	 * ownership only, not the floor: a user who lost access can still stop a turn.
	 */
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
			surface: 'system',
		});
	}

	/**
	 * Attach the attachment store on every turn. Memory keeps file references,
	 * and without the store a later turn cannot load the files of earlier turns.
	 */
	private attachFileStore(handle: SystemAgentTurnHandle, thread: AgentExecutionThread): void {
		handle.agent.fileStore(
			this.attachmentService.getFileStore(
				{ agentId: thread.agentId, projectId: thread.projectId },
				handle.agent.snapshot.model.provider ?? '',
			),
		);
	}

	/**
	 * Run a prepared turn under `controller`, the controller the provider got
	 * the signal of. A cancel aborts it, and the abort signal in the run
	 * options of the handle stops the turn at any time.
	 */
	private async runTurn({
		thread,
		handle,
		send,
		controller,
		admission,
		prepare,
	}: {
		thread: AgentExecutionThread;
		handle: SystemAgentTurnHandle;
		send: (event: AgentSseEvent) => void;
		controller: AbortController;
		/** Set when the queue admitted the turn. A resume admits its own turn. */
		admission?: AgentExecutionAdmission;
		prepare: () => Promise<AgentTurnRequest>;
	}): Promise<void> {
		let status: SystemAgentTurnStatus = 'completed';
		let executionId = admission?.executionId;
		let error: unknown;
		const providerSignal = handle.runOptions?.abortSignal;
		const stopTurn = () => controller.abort(providerSignal?.reason);
		if (providerSignal?.aborted) stopTurn();
		else providerSignal?.addEventListener('abort', stopTurn, { once: true });
		try {
			const stream = this.turnExecutionService.execute({
				admittedExecution: admission,
				agentInstance: handle.agent,
				toolRegistry: handle.toolRegistry ?? new Map(),
				mcpServerAttributions: new Map(),
				context: { projectId: thread.projectId, agentId: thread.agentId, threadId: thread.id },
				chatSurface: 'system',
				chatController: controller,
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
			status = controller.signal.aborted ? 'cancelled' : 'errored';
			throw caught;
		} finally {
			providerSignal?.removeEventListener('abort', stopTurn);
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
			// Like Preview, only a completed turn sends `done`. An error has its own event.
			if (status === 'completed') {
				send({ type: 'done', sessionId: thread.id, executionId: executionId ?? '' });
			}
		}
	}
}
