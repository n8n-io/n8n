import type { InstanceAiPersistPendingAgentRequest } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { threadAuthorizesAgentAdoption } from '@n8n/instance-ai';

import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { AgentDraftService } from '@/modules/agents/agent-draft.service';

import { isAgentsAccessEnabled } from './agents-access';
import { InstanceAiMemoryService } from './instance-ai-memory.service';

/**
 * Persists the pending new-agent artifact a thread has open.
 *
 * The frontend mints the agent id before anything is saved, so two writers can
 * reach the same id: this path (the user configuring the artifact by hand) and
 * the chat's `agent_builder_build_agent` tool. Whichever inserts first may configure the row
 * before the other collides, so the loser has to converge on it rather than
 * fail — hence create-or-adopt rather than create.
 *
 * Adoption hands back a row this caller did not create, so it is gated on the
 * thread's own lifecycle metadata naming this exact agent plus project scopes
 * checked by the Agent draft service. Binding happens in the same request. The editor
 * treats this response as the persistence acknowledgement. A binding that lands
 * later (or not at all) leaves a reload re-entering pending mode on an agent
 * that already exists.
 */
@Service()
export class InstanceAiPendingAgentService {
	constructor(
		private readonly memoryService: InstanceAiMemoryService,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	/** Agents-module services are resolved on use, not injected: this module loads
	 *  whether or not the agents module is active, and injecting would construct
	 *  its services (and their repositories) regardless. */
	private agentsModule() {
		if (!isAgentsAccessEnabled(this.moduleRegistry)) {
			throw new NotFoundError('Agents are not enabled on this instance');
		}
		return Container.get(AgentDraftService);
	}

	/**
	 * Create the agent under the client-minted id, or adopt the existing row when
	 * a concurrent writer won the insert, then bind it to the thread. Retryable:
	 * a failed bind leaves the row behind, and the next attempt adopts it and
	 * binds again.
	 */
	async persistAndBind(
		user: User,
		threadId: string,
		{ projectId, agentId, name, config }: InstanceAiPersistPendingAgentRequest,
		pushRef?: string,
	) {
		const agents = this.agentsModule();
		// A thread belongs to one project, and instance-ai already ignores a pending
		// marker from another one. Binding a thread to an agent outside its project
		// would leave a target the builder refuses to act on.
		const threadProjectId = await this.memoryService.getThreadProjectId(threadId);
		if (threadProjectId !== undefined && threadProjectId !== projectId) {
			throw new ForbiddenError('This agent belongs to a different project than the thread');
		}
		// Attestation authorizes taking over a row this caller did not create — not
		// creating one. Gating the create on it too would strand a still-unsaved
		// artifact whose thread has since bound a different agent (any bind drops the
		// pending marker), with no way to ever save the draft.
		const adoptable = await this.mayAdopt(user, threadId, { projectId, agentId });

		const agent = await agents.persistDraft(user, projectId, {
			id: agentId,
			name,
			adoptOnCollision: adoptable,
			config,
			pushRef,
		});
		if (!agent) throw new ForbiddenError('This thread has no pending agent with that id');

		// The name the caller sent describes a draft; an adopted row carries the
		// winner's name, so label the binding with what is actually persisted.
		const thread = await this.memoryService.bindAgentBuilderTarget(user.id, threadId, {
			agentId: agent.id,
			projectId,
			name: agent.name,
		});

		return {
			agent: await agent.getState(),
			thread,
		};
	}

	/**
	 * Whether this thread's own lifecycle metadata names this agent. Thread
	 * metadata is user-writable, so it only attests which agent the thread is
	 * about. The Agent draft service checks the user's project scopes.
	 */
	private async mayAdopt(
		user: User,
		threadId: string,
		target: { projectId: string; agentId: string },
	): Promise<boolean> {
		// Returns undefined for a thread the user does not own.
		const metadata = await this.memoryService.getThreadMetadata(user.id, threadId);
		return threadAuthorizesAgentAdoption(metadata, target);
	}
}
