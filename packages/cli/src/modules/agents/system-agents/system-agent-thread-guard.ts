import type { SerializableAgentState } from '@n8n/agents';
import type { AgentMessageAuthor } from '@n8n/api-types';
import { UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { jsonParse } from 'n8n-workflow';

import { AgentExecutionService } from '../agent-execution.service';
import type { AgentCheckpoint } from '../entities/agent-checkpoint.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';
import { userDisplayName } from '../utils/user-display-name';
import { SystemAgentRegistry } from './system-agent-registry';
import type {
	SystemAgentPendingCall,
	SystemAgentProvider,
	SystemAgentSharingPolicy,
} from './system-agent.types';

/** An answer to a card that passed every check. The continuation runs as `runAs`. */
export interface CheckedAnswer {
	agentId: string;
	threadId: string;
	runId: string;
	toolCallId: string;
	resumeData: unknown;
	/** The thread owner. Every turn of a thread runs as its owner. */
	runAs: User;
	/** The user who answered, recorded with the answer. */
	answeredBy: AgentMessageAuthor;
}

interface AnswerRequest {
	agentId: string;
	user: User;
	projectId: string;
	runId: string;
	toolCallId: string;
	resumeData: unknown;
}

type SuspendedToolCall = Extract<
	SerializableAgentState['pendingToolCalls'][string],
	{ suspended: true }
>;

/** The suspended call `toolCallId` of a parked checkpoint, or undefined. */
export function findSuspendedToolCall(
	checkpoint: Pick<AgentCheckpoint, 'expired' | 'state'> | null,
	toolCallId: string,
): SuspendedToolCall | undefined {
	if (!checkpoint || checkpoint.expired || !checkpoint.state) return undefined;
	let state: SerializableAgentState;
	try {
		state = jsonParse<SerializableAgentState>(checkpoint.state);
	} catch {
		return undefined;
	}
	if (state.status !== 'suspended') return undefined;
	return Object.values(state.pendingToolCalls ?? {}).find(
		(call): call is SuspendedToolCall => call.suspended && call.toolCallId === toolCallId,
	);
}

/**
 * Checks requests to instance agent threads before the response stream opens, so that
 * the client gets an HTTP status instead of an error event. The runtime checks the same
 * rules again when it starts the turn.
 */
@Service()
export class SystemAgentThreadGuard {
	constructor(
		private readonly registry: SystemAgentRegistry,
		private readonly checkpoints: AgentCheckpointRepository,
		private readonly executions: AgentExecutionService,
		private readonly users: UserRepository,
	) {}

	/** Rejects a message to an existing thread that another user owns. */
	async checkSend(params: { agentId: string; user: User; sessionId?: string }): Promise<void> {
		if (!params.sessionId) return;
		const thread = await this.executions.findThreadById(params.sessionId);
		if (!thread || thread.ownerId === params.user.id) return;
		const sharing = this.sharingFor(params.agentId, thread);
		if (sharing && (await this.canRead(params.user, thread, params.agentId))) {
			throw await sharing.sendError(params.user, thread);
		}
		throw new NotFoundError('Session not found');
	}

	/**
	 * Checks an answer to a card: 404 for a thread that the user cannot read, 400 for
	 * another project, 409 for a card that waits no more, and the provider's error for a
	 * reader who may not answer it.
	 */
	async checkAnswer(request: AnswerRequest): Promise<CheckedAnswer> {
		const { agentId, user, toolCallId } = request;
		const provider = this.registry.get(agentId);
		const checkpoint = await this.checkpoints.findByRunIdAndAgentId(request.runId, agentId);
		const thread = checkpoint?.threadId
			? await this.executions.findThreadById(checkpoint.threadId)
			: null;
		if (!provider || !thread || !(await this.canRead(user, thread, agentId))) {
			throw new NotFoundError('Session not found');
		}
		if (thread.projectId !== request.projectId) {
			throw new BadRequestError('This chat belongs to another project');
		}
		const pending = findSuspendedToolCall(checkpoint, toolCallId);
		if (!pending) {
			throw new ConflictError(
				'This request was already answered',
				undefined,
				await this.answeredBy(thread, toolCallId),
			);
		}
		return {
			agentId,
			threadId: thread.id,
			runId: request.runId,
			toolCallId,
			...(await this.answerAs(provider, thread, pending, request)),
			answeredBy: { id: user.id, name: userDisplayName(user) },
		};
	}

	private sharingFor(agentId: string, thread: AgentExecutionThread) {
		if (thread.agentId !== agentId) return undefined;
		return this.registry.get(agentId)?.sharing;
	}

	/**
	 * The same rule as the read routes: a user who cannot use the agent in the project
	 * reads none of its threads, and another owner's thread needs the sharing rules.
	 */
	private async canRead(user: User, thread: AgentExecutionThread, agentId: string) {
		if (thread.agentId !== agentId) return false;
		if (!(await this.registry.allows(agentId, user, thread.projectId))) return false;
		return await this.registry.canReadThread(user, thread);
	}

	/** The owner answers as before. A reader's answer runs as the owner. */
	private async answerAs(
		provider: SystemAgentProvider,
		thread: AgentExecutionThread,
		call: SystemAgentPendingCall,
		request: AnswerRequest,
	): Promise<Pick<CheckedAnswer, 'resumeData' | 'runAs'>> {
		if (thread.ownerId === request.user.id) {
			return { resumeData: request.resumeData, runAs: request.user };
		}
		const sharing: SystemAgentSharingPolicy | undefined = provider.sharing;
		if (!sharing) throw new NotFoundError('Session not found');
		const resumeData = await sharing.authorizeAnswer(
			request.user,
			thread,
			{ toolName: call.toolName, input: call.input, suspendPayload: call.suspendPayload },
			request.resumeData,
		);
		return { resumeData, runAs: await this.loadOwner(provider, thread) };
	}

	/** The owner must still be able to use the agent in the thread's project. */
	private async loadOwner(provider: SystemAgentProvider, thread: AgentExecutionThread) {
		const owner = thread.ownerId ? await this.users.findByIdWithRole(thread.ownerId) : null;
		if (!owner || owner.disabled || !(await provider.authorize(owner, thread.projectId))) {
			throw new ForbiddenError('The owner of this chat can no longer run it');
		}
		return owner;
	}

	/** Who answered a tool call, for the 409 body. Undefined when no answer names a user. */
	private async answeredBy(thread: AgentExecutionThread, toolCallId: string) {
		const detail = await this.executions.getThreadDetail(
			thread.id,
			thread.projectId,
			thread.agentId,
			thread.ownerId ?? '',
		);
		const answers = (detail?.executions ?? [])
			.flatMap((execution) => execution.timeline ?? [])
			.filter((event) => event.type === 'hitl-response' && event.toolCallId === toolCallId);
		const last = answers.at(-1);
		const name = last?.type === 'hitl-response' ? last.respondedBy?.name : undefined;
		return name ? { answeredBy: { name } } : undefined;
	}
}
