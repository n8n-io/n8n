import type {
	AssistantAgentTarget,
	AssistantAgentTargetsState,
	InstanceAiPersistPendingAgentRequest,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import {
	readAgentTargetsMetadata,
	threadAuthorizesAgentAdoption,
	withBoundAgentTarget,
	type AgentBuilderTarget,
} from '@n8n/instance-ai';

import { AgentDraftService } from '@/modules/agents/agent-draft.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { SystemAgentThreadMetadataService } from '@/modules/agents/system-agents/system-agent-thread-metadata.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { ASSISTANT_AGENT_ID } from './assistant-turn-options';

/** The agent target state of the thread metadata, without the addressing keys of the model. */
export function toAgentTargetsState(
	metadata: Record<string, unknown> | undefined,
): AssistantAgentTargetsState {
	const { bound, pending, targets, previewSession } = readAgentTargetsMetadata(metadata);
	return {
		bound: bound ? pick(bound) : null,
		pending: pending ?? null,
		targets: targets.map(pick),
		previewSession: previewSession
			? { agentId: previewSession.agentId, threadId: previewSession.threadId }
			: null,
	};
}

function pick({ agentId, projectId, name }: AgentBuilderTarget): AssistantAgentTarget {
	return { agentId, projectId, ...(name !== undefined ? { name } : {}) };
}

/**
 * Reads and binds the agents of Assistant agent threads, in the thread
 * metadata of the Agents memory. The agent previews of the thread use it. The
 * builder tools of a turn write the same keys through the memory of the turn.
 */
@Service()
export class AssistantAgentTargetsService {
	constructor(
		private readonly threadMetadata: SystemAgentThreadMetadataService,
		private readonly agentDrafts: AgentDraftService,
		private readonly agents: AgentsService,
	) {}

	async getState(user: User, threadId: string): Promise<AssistantAgentTargetsState> {
		const { metadata } = await this.threadMetadata.readThread(ASSISTANT_AGENT_ID, user, threadId);
		return toAgentTargetsState(metadata);
	}

	/**
	 * Bind a saved agent, so the next turn edits it. Drops the pending agent
	 * marker. A thread binds only agents of its working project, because the
	 * builder does not act on an agent of another project. The agent must
	 * exist, and the user must be able to read it.
	 */
	async bind(
		user: User,
		threadId: string,
		target: AssistantAgentTarget,
	): Promise<AssistantAgentTargetsState> {
		const { projectId } = await this.threadMetadata.readThread(ASSISTANT_AGENT_ID, user, threadId);
		assertThreadProject(projectId, target.projectId);
		// Check the scope first, so the route does not tell a user without access which agents exist.
		if (!(await userHasScopes(user, ['agent:read'], false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to access agents in this project');
		}
		if (!(await this.agents.findById(target.agentId, projectId))) {
			throw new NotFoundError('Agent not found');
		}
		return await this.writeBinding(user, threadId, target);
	}

	/**
	 * Save the pending agent that the thread has open under the id that the
	 * frontend minted, and bind it. A turn can create the agent under the same
	 * id first. The thread metadata then names the agent, and this adopts it.
	 */
	async persistPendingAgent(
		user: User,
		threadId: string,
		{ projectId, agentId, name, config }: InstanceAiPersistPendingAgentRequest,
		pushRef?: string,
	) {
		const thread = await this.threadMetadata.readThread(ASSISTANT_AGENT_ID, user, threadId);
		assertThreadProject(thread.projectId, projectId);
		// The metadata only says which agent the thread is about. The draft
		// service checks the project scopes of the user.
		const adoptable = threadAuthorizesAgentAdoption(thread.metadata, { projectId, agentId });

		const agent = await this.agentDrafts.persistDraft(user, projectId, {
			id: agentId,
			name,
			adoptOnCollision: adoptable,
			config,
			pushRef,
		});
		if (!agent) throw new ForbiddenError('This thread has no pending agent with that id');

		// An adopted agent keeps its own name, so bind the saved name.
		const targets = await this.writeBinding(user, threadId, {
			agentId: agent.id,
			projectId,
			name: agent.name,
		});
		return { agent: await agent.getState(), targets };
	}

	/** Bind `target` and drop the pending marker. The caller checks the project first. */
	private async writeBinding(
		user: User,
		threadId: string,
		target: AssistantAgentTarget,
	): Promise<AssistantAgentTargetsState> {
		const metadata = await this.threadMetadata.patch(
			ASSISTANT_AGENT_ID,
			user,
			threadId,
			(current) => withBoundAgentTarget(current, pick(target)),
		);
		return toAgentTargetsState(metadata);
	}
}

function assertThreadProject(threadProjectId: string, projectId: string): void {
	if (threadProjectId !== projectId) {
		throw new ForbiddenError('This agent belongs to a different project than the thread');
	}
}
