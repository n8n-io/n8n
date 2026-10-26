import type { SerializableAgentState } from '@n8n/agents';
import type {
	AgentExecutionUsage,
	AgentExecutionUsageEntry,
	AgentSseEvent,
	AgentThreadUsageResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { sleep } from '@n8n/utils/sleep';
import { UserError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentChatExecutionService } from '../agent-chat-execution.service';
import { AgentConversationStateService } from '../agent-conversation-state.service';
import { AgentExecutionService, type StartExecutionParams } from '../agent-execution.service';
import { AgentFormattedTurnError } from '../agent-formatted-turn.error';
import type { ClaimedAgentMessage } from '../agent-message-queue.service';
import { AgentMessageQueueService } from '../agent-message-queue.service';
import { chatErrorCode, emitChunkEvents } from '../agent-sse-stream';
import { AgentTurnExecutionService, type AgentTurnRequest } from '../agent-turn-execution.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import {
	AgentExecutionRepository,
	type AgentExecutionUsageRow,
} from '../repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import { AgentRepository } from '../repositories/agent.repository';
import type { StoredAttachmentRef } from '../types/agent-chat-attachment';
import type { AgentExecutionAdmission } from '../types/agent-queued-message';
import type { FormattedTurnError } from '../types/agent-turn-outcome';
import { systemChatMemoryResourceId } from '../utils/agent-memory-scope';
import { buildInboundUserMessage } from '../utils/inbound-attachments';
import { SYSTEM_CHAT_SOURCE } from '../utils/agent-thread-access';
import { canUseSystemAgent } from './system-agent-access';
import { SystemAgentHostEventChannel } from './system-agent-host-events';
import { SystemAgentRegistry } from './system-agent-registry';
import type {
	SystemAgentProvider,
	SystemAgentTurnHandle,
	SystemAgentTurnOptions,
	SystemAgentTurnOutcome,
	SystemAgentWorkspaceScope,
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
	/** Called when the runtime admits the turn, with the execution id a client needs to stop it. */
	onExecutionStarted?: ExecutionStartedCallback;
}

type ExecutionStartedCallback = (
	executionId: string,
	threadId: string,
	inputMessageIds: string[],
) => void;

interface ResumeHandle {
	runId: string;
	toolCallId: string;
	done: Promise<void>;
}

/** The workspace lease of one turn, bound to the source that gave it. */
interface TurnWorkspace {
	lease: unknown;
	/** Report the turn outcome to the source. It never throws. */
	release(outcome: SystemAgentTurnOutcome): Promise<void>;
}

/**
 * The SDK run options of a handle, without its abort signal. `runTurn` links
 * that signal. Adds the handle's side-call usage callback.
 */
function runOptionsOf(handle: SystemAgentTurnHandle) {
	const { abortSignal: _abortSignal, ...runOptions } = handle.runOptions ?? {};
	return {
		...runOptions,
		...(handle.onSideCallUsage ? { onSideCallUsage: handle.onSideCallUsage } : {}),
	};
}

type SessionRef = Pick<AgentExecutionThread, 'id' | 'agentId' | 'projectId'>;

/**
 * User deletion stops a running turn first. The turn records its end
 * asynchronously, so the delete retries a few times before it gives up.
 */
const USER_DELETION_DELETE_ATTEMPTS = 5;
const USER_DELETION_RETRY_DELAY_MS = 1_000;

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
		private readonly conversationState: AgentConversationStateService,
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
		return (await this.resolveSession(params)).thread;
	}

	/**
	 * The session of a message or a new thread: an owned top-level session, or a
	 * new one in the working project. The access floor runs once, on the project
	 * of the session.
	 */
	private async resolveSession(params: {
		agentId: string;
		user: User;
		/** The working project of a new session. An existing session keeps its own. */
		projectId?: string;
		threadId?: string;
		title?: string;
	}): Promise<{ provider: SystemAgentProvider; thread: AgentExecutionThread }> {
		this.assertRegistered(params.agentId);
		const owned = params.threadId
			? await this.threadRepository.findOwnedById(params.agentId, params.user.id, params.threadId)
			: null;
		// The access check runs for one project, so an existing session must be in the requested one.
		if (owned && params.projectId && owned.projectId !== params.projectId) {
			throw new NotFoundError('Session not found');
		}
		const projectId = owned?.projectId ?? params.projectId;
		if (!projectId) throw new UserError('A new session needs a working project');
		const provider = await this.assertCanUse(params.agentId, params.user, projectId);
		if (owned) return { provider, thread: owned };
		const thread = await this.txRunner.run({}, async (ctx) => {
			let created: AgentExecutionThread;
			try {
				({ thread: created } = await this.threadRepository.findOrCreate(
					params.threadId ?? randomUUID(),
					provider.agentId,
					provider.name,
					projectId,
					{ accessScope: 'user', ownerId: params.user.id },
					ctx,
				));
			} catch (error) {
				// The id belongs to a thread of another user, agent or project.
				if (error instanceof UserError) throw new NotFoundError('Session not found');
				throw error;
			}
			// `findOrCreate` also matches a child thread of the user. A session is top-level.
			if (created.parentThreadId !== null) throw new NotFoundError('Session not found');
			if (params.title) {
				await this.threadRepository.renameOwned(
					provider.agentId,
					params.user.id,
					created.id,
					params.title,
					ctx,
				);
				created.title = params.title;
			}
			return created;
		});
		return { provider, thread };
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
		await this.deleteOwnedThread(thread, user.id);
	}

	/**
	 * Delete every private system agent session of a user, before the user is
	 * deleted. The owner column is `ON DELETE SET NULL`, so a session that is
	 * not deleted here stays without an owner and nobody can open it again.
	 *
	 * It does not need a registered provider or the Agents feature toggle:
	 * sessions created while either was on must go too. The child sessions of
	 * delegated runs go too: they copy the owner of their parent. A running
	 * turn is stopped first. The deletion is best effort: a session that fails
	 * is logged and skipped, so it does not block the others or the user
	 * deletion.
	 */
	async deleteThreadsOfUser(userId: string): Promise<void> {
		let sessions: SessionRef[];
		try {
			sessions = await this.threadRepository.findOwnedSystemAgentSessions(userId);
		} catch (error) {
			this.logger.warn('Failed to find the system agent sessions of a deleted user', {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});
			return;
		}
		for (const session of sessions) {
			let descendants: SessionRef[];
			try {
				descendants = await this.findDescendantSessions(session);
				await this.stopRunningTurn(session, [session, ...descendants], userId);
			} catch (error) {
				this.logUserSessionDeletionFailure(userId, session, error);
				continue;
			}
			// Children first, deepest level first: only the parent links to them.
			for (const thread of [...descendants.reverse(), session]) {
				try {
					await this.deleteWithRetry(thread, userId);
				} catch (error) {
					this.logUserSessionDeletionFailure(userId, thread, error);
				}
			}
		}
	}

	private logUserSessionDeletionFailure(userId: string, thread: SessionRef, error: unknown) {
		this.logger.warn('Failed to delete a system agent session of a deleted user', {
			userId,
			agentId: thread.agentId,
			threadId: thread.id,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	/** Child sessions of delegated runs, level by level. A child stays in the project of its parent. */
	private async findDescendantSessions(root: SessionRef): Promise<SessionRef[]> {
		const descendants: SessionRef[] = [];
		const visited = new Set([root.id]);
		let level = [root];
		while (level.length > 0) {
			const next: SessionRef[] = [];
			for (const parent of level) {
				for (const child of await this.threadRepository.findByParentThreadId(
					parent.id,
					parent.projectId,
				)) {
					if (visited.has(child.id)) continue;
					visited.add(child.id);
					next.push({ id: child.id, agentId: child.agentId, projectId: child.projectId });
				}
			}
			descendants.push(...next);
			level = next;
		}
		return descendants;
	}

	/**
	 * Cancel the latest turn of the root session when any session of the tree
	 * runs. The cancel also stops the background jobs of the root session,
	 * which run the child sessions.
	 */
	private async stopRunningTurn(
		session: SessionRef,
		tree: SessionRef[],
		userId: string,
	): Promise<void> {
		let running = false;
		for (const thread of tree) {
			if (await this.executionRepository.existsRunningByThread(thread.id)) {
				running = true;
				break;
			}
		}
		if (!running) return;
		const latest = await this.executionRepository.findLatestByThreadId(session.id);
		if (!latest) return;
		await this.chatExecutionService.requestCancel({
			projectId: session.projectId,
			agentId: session.agentId,
			threadId: session.id,
			executionId: latest.id,
			userId,
			surface: 'system',
		});
	}

	/** `deleteThread` refuses a session with a running turn. Wait for the stopped turn to end. */
	private async deleteWithRetry(session: SessionRef, userId: string): Promise<void> {
		for (let attempt = 1; ; attempt++) {
			try {
				await this.deleteOwnedThread(session, userId);
				return;
			} catch (error) {
				if (!(error instanceof ConflictError) || attempt >= USER_DELETION_DELETE_ATTEMPTS) {
					throw error;
				}
				await sleep(USER_DELETION_RETRY_DELAY_MS);
			}
		}
	}

	/** Delete a session with its sandbox. The caller checks ownership. */
	private async deleteOwnedThread(thread: SessionRef, userId: string): Promise<void> {
		const deleted = await this.executionService.deleteThread(
			thread.projectId,
			thread.agentId,
			thread.id,
			userId,
		);
		if (!deleted) throw new NotFoundError('Session not found');
		await this.destroyThreadWorkspace(thread.agentId, thread.id, userId);
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
		const { running, suspendedCheckpoint } = await this.conversationState.inspect(
			thread.agentId,
			thread.id,
			ctx,
		);
		if (running) return { status: 'running', checkpoint: null };
		if (suspendedCheckpoint) return { status: 'suspended', checkpoint: suspendedCheckpoint };
		const queued = await this.messageQueue.hasQueuedMessages(thread.id, ctx);
		return { status: queued ? 'running' : 'idle', checkpoint: null };
	}

	/**
	 * Token usage of every turn in the thread, for usage and cost readers. Each
	 * turn lists its delegated runs (they record their own executions in child
	 * threads) and the sum of its own and their usage.
	 */
	async getUsage(thread: AgentExecutionThread): Promise<AgentThreadUsageResponse> {
		const turns = await this.executionRepository.findUsageByThreadId(thread.id);
		const children = await this.executionRepository.findChildUsageByParentIds(
			turns.map((turn) => turn.id),
		);
		const childrenByParent = new Map<string, AgentExecutionUsageEntry[]>();
		for (const row of children) {
			if (row.parentExecutionId === null) continue;
			const entries = childrenByParent.get(row.parentExecutionId) ?? [];
			entries.push(toUsageEntry(row));
			childrenByParent.set(row.parentExecutionId, entries);
		}
		const executions = turns.map((turn) => {
			const own = toUsageEntry(turn);
			const children = childrenByParent.get(turn.id) ?? [];
			return { ...own, descendants: children, total: sumUsage([own, ...children]) };
		});
		return { executions, total: sumUsage(executions.map((turn) => turn.total)) };
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
		const hostEvents = this.createHostEventChannel(thread, send);
		const workspace = await this.acquireWorkspace(provider, thread, user);
		const controller = new AbortController();
		// Until the runtime takes the turn, the claim signal (Stop, lost ownership) stops provider setup.
		// The runtime then links the claim signal itself, so the link ends with setup.
		const stopSetup = () => controller.abort(signal.reason);
		signal.addEventListener('abort', stopSetup, { once: true });
		// A Stop while the workspace was acquired fired before the listener existed.
		if (signal.aborted) stopSetup();
		let handle: SystemAgentTurnHandle;
		try {
			handle = await this.prepareOrRelease(
				workspace,
				hostEvents,
				controller.signal,
				thread,
				async () => {
					return await provider.prepareTurn({
						type: 'start',
						user,
						thread,
						resourceId,
						abortSignal: controller.signal,
						...(workspace ? { workspace: workspace.lease } : {}),
						emitHostEvent: hostEvents.emit,
						executionId: admission.executionId,
						message: payload.message,
						attachments,
						options: payload.options ?? {},
					});
				},
			);
		} finally {
			signal.removeEventListener('abort', stopSetup);
		}
		const text = handle.input ?? payload.message;
		const input =
			attachments.length > 0 && typeof text === 'string'
				? buildInboundUserMessage(text, attachments)
				: text;
		await this.runTurn({
			thread,
			handle,
			workspace,
			hostEvents,
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
		const checkpointHostMetadata = checkpoint.persistence.hostMetadata ?? {};
		const controller = new AbortController();
		const send = params.send ?? (() => {});
		const hostEvents = this.createHostEventChannel(thread, send);
		const workspace = await this.acquireWorkspace(provider, thread, params.user);
		const handle = await this.prepareOrRelease(
			workspace,
			hostEvents,
			controller.signal,
			thread,
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
			source: SYSTEM_CHAT_SOURCE,
		};
		const done = this.runTurn({
			thread,
			handle,
			workspace,
			hostEvents,
			send,
			controller,
			onExecutionStarted: params.onExecutionStarted,
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
		const { provider, thread } = await this.resolveSession({
			agentId: params.agentId,
			user: params.user,
			projectId: params.projectId,
			threadId: params.sessionId,
		});
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
		onExecutionStarted?: ExecutionStartedCallback;
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
			onExecutionStarted: params.onExecutionStarted,
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
	 * Prepare a turn and attach its file store. When this fails, release the
	 * lease before the error goes up, so that the source does not keep a lease
	 * for a turn that never ran.
	 */
	private async prepareOrRelease(
		workspace: TurnWorkspace | undefined,
		hostEvents: SystemAgentHostEventChannel,
		signal: AbortSignal,
		thread: AgentExecutionThread,
		prepare: () => Promise<SystemAgentTurnHandle>,
	): Promise<SystemAgentTurnHandle> {
		try {
			const handle = await prepare();
			this.attachFileStore(handle, thread);
			return handle;
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

	/**
	 * Run a prepared turn under `controller`, the controller the provider got
	 * the signal of. A cancel aborts it, and the abort signal in the run
	 * options of the handle stops the turn at any time.
	 */
	private async runTurn({
		thread,
		handle,
		workspace,
		hostEvents,
		send,
		controller,
		admission,
		onExecutionStarted,
		prepare,
	}: {
		thread: AgentExecutionThread;
		handle: SystemAgentTurnHandle;
		workspace?: TurnWorkspace;
		hostEvents: SystemAgentHostEventChannel;
		send: (event: AgentSseEvent) => void;
		controller: AbortController;
		/** Set when the queue admitted the turn. A resume admits its own turn. */
		admission?: AgentExecutionAdmission;
		onExecutionStarted?: ExecutionStartedCallback;
		prepare: () => Promise<AgentTurnRequest>;
	}): Promise<void> {
		let executionId = admission?.executionId;
		let failure: unknown;
		const formatError = this.turnErrorFormatter(handle, thread);
		/** Holds the outcome once the turn settled. */
		const settled: { outcome?: SystemAgentTurnOutcome } = {};
		const settle = async (outcome: SystemAgentTurnOutcome) => {
			settled.outcome = outcome;
			try {
				await handle.onSettled?.(outcome);
			} catch (settleError) {
				this.logger.warn('System agent turn settle hook failed', {
					threadId: thread.id,
					error: settleError,
				});
			}
		};
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
				onExecutionStarted: (id, threadId, inputMessageIds) => {
					executionId = id;
					onExecutionStarted?.(id, threadId, inputMessageIds);
				},
				onRecorderCreated: (recorder) => hostEvents.attach(recorder),
				// The settle hook runs before the record is final, so that the
				// events it emits are stored with the turn.
				onBeforeFinalize: async (outcome) => {
					await settle(outcome);
					hostEvents.close();
				},
				prepare,
				formatError,
			});
			for await (const chunk of stream) {
				// The turn service stores the formatted error but yields the raw chunk.
				const formatted = chunk.type === 'error' ? await formatError(chunk.error) : undefined;
				if (formatted) {
					send({
						type: 'error',
						message: formatted.message,
						...(formatted.code ? { errorCode: formatted.code } : {}),
					});
				} else {
					emitChunkEvents(chunk, send);
				}
				handle.onChunk?.(chunk);
			}
		} catch (caught) {
			failure = caught;
			const formatted = await formatError(caught);
			// The queue consumer and the resume relay send the thrown error to the client.
			// Carry the formatted text and code, so that the live view matches the stored error.
			if (formatted) throw new AgentFormattedTurnError(formatted, caught);
			throw caught;
		} finally {
			providerSignal?.removeEventListener('abort', stopTurn);
			// The turn record is final here. A later event cannot be stored.
			hostEvents.close();
			// The runtime settles every turn that has an execution record. A turn
			// that failed or stopped before it had one settles here.
			if (!settled.outcome) {
				await settle({
					status: controller.signal.aborted ? 'cancelled' : 'errored',
					executionId,
					...(failure !== undefined ? { error: failure } : {}),
				});
			}
			if (settled.outcome) await workspace?.release(settled.outcome);
			// Like Preview, only a completed turn sends `done`. An error has its own event.
			if (settled.outcome?.status === 'completed') {
				send({ type: 'done', sessionId: thread.id, executionId: executionId ?? '' });
			}
		}
	}

	/**
	 * The error formatter of one turn. It calls the provider hook once per
	 * error: the turn service stores the result, and the live event reuses it.
	 */
	private turnErrorFormatter(
		handle: SystemAgentTurnHandle,
		thread: AgentExecutionThread,
	): (error: unknown) => Promise<FormattedTurnError | undefined> {
		const results = new Map<unknown, Promise<FormattedTurnError | undefined>>();
		return async (error) => {
			let result = results.get(error);
			if (!result) {
				result = this.formatTurnError(handle, thread, error);
				results.set(error, result);
			}
			return await result;
		};
	}

	/**
	 * The user-facing form of a turn error from the provider hook. Returns
	 * `undefined` to keep the raw error: when there is no hook, when the hook
	 * gives no text, when the hook throws, or when the error already has a
	 * client error code.
	 */
	private async formatTurnError(
		handle: SystemAgentTurnHandle,
		thread: AgentExecutionThread,
		error: unknown,
	): Promise<FormattedTurnError | undefined> {
		if (!handle.formatError || chatErrorCode(error) !== undefined) return undefined;
		try {
			const formatted = await handle.formatError(error);
			return formatted?.message ? formatted : undefined;
		} catch (formatError) {
			this.logger.warn('System agent error formatter failed', {
				threadId: thread.id,
				error: formatError,
			});
			return undefined;
		}
	}
}

function toUsageEntry(row: AgentExecutionUsageRow): AgentExecutionUsageEntry {
	return {
		executionId: row.id,
		threadId: row.threadId,
		parentExecutionId: row.parentExecutionId,
		status: row.status,
		model: row.model,
		startedAt: row.startedAt?.toISOString() ?? null,
		stoppedAt: row.stoppedAt?.toISOString() ?? null,
		duration: row.duration,
		promptTokens: row.promptTokens,
		completionTokens: row.completionTokens,
		totalTokens: row.totalTokens,
		cacheReadTokens: row.cacheReadTokens,
		cacheWriteTokens: row.cacheWriteTokens,
		cost: row.cost,
	};
}

const USAGE_FIELDS = [
	'promptTokens',
	'completionTokens',
	'totalTokens',
	'cacheReadTokens',
	'cacheWriteTokens',
	'cost',
] as const satisfies ReadonlyArray<keyof AgentExecutionUsage>;

/** Sums each field. A field stays null when no entry reported it, so zero and missing differ. */
function sumUsage(entries: AgentExecutionUsage[]): AgentExecutionUsage {
	const total: AgentExecutionUsage = {
		promptTokens: null,
		completionTokens: null,
		totalTokens: null,
		cacheReadTokens: null,
		cacheWriteTokens: null,
		cost: null,
	};
	for (const entry of entries) {
		for (const field of USAGE_FIELDS) {
			const value = entry[field];
			if (value !== null) total[field] = (total[field] ?? 0) + value;
		}
	}
	return total;
}
