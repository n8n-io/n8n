import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { threadAuthorizesAgentAdoption } from '@n8n/instance-ai';
import type { Scope } from '@n8n/permissions';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AgentDefaultModelResolverService } from '@/modules/agents/agent-default-model-resolver.service';
import { AgentRunnableStateService } from '@/modules/agents/agent-runnable-state.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { InstanceAiMemoryService } from './instance-ai-memory.service';

/**
 * Persists the pending new-agent artifact a thread has open.
 *
 * The frontend mints the agent id before anything is saved, so two writers can
 * reach the same id: this path (the user configuring the artifact by hand) and
 * the chat's `build-agent` tool. Whichever inserts first may configure the row
 * before the other collides, so the loser has to converge on it rather than
 * fail — hence create-or-adopt rather than create.
 *
 * Adoption hands back a row this caller did not create, so it is gated on the
 * thread's own lifecycle metadata naming this exact agent plus project scopes
 * (see `assertMayAdopt`). Binding happens in the same request: the editor treats
 * this response as the persistence acknowledgement, and a binding that lands
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
		if (!this.moduleRegistry.isActive('agents')) {
			throw new NotFoundError('Agents are not enabled on this instance');
		}
		return {
			agents: Container.get(AgentsService),
			runnableState: Container.get(AgentRunnableStateService),
			defaultModelResolver: Container.get(AgentDefaultModelResolverService),
		};
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
		{ projectId, agentId, name }: { projectId: string; agentId: string; name: string },
	) {
		const { agents, runnableState } = this.agentsModule();
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

		// Read before creating: an already-persisted row needs no default model, and
		// resolving one reaches out to the provider's model catalogue only for
		// `create` to discard it on the collision.
		const existing = await agents.findById(agentId, projectId);
		if (existing && !adoptable) {
			throw new ForbiddenError('This thread has no pending agent with that id');
		}
		await this.assertMayWrite(user, projectId, { adopting: Boolean(existing) || adoptable });

		const agent =
			existing ?? (await this.createAgent(user, { projectId, agentId, name }, adoptable));

		// The name the caller sent describes a draft; an adopted row carries the
		// winner's name, so label the binding with what is actually persisted.
		const thread = await this.memoryService.bindAgentBuilderTarget(user.id, threadId, {
			agentId: agent.id,
			projectId,
			name: agent.name,
		});

		return {
			agent: await runnableState.addRunnableState(agent, projectId, user),
			thread,
		};
	}

	/**
	 * `adoptOnCollision` covers a row appearing between the read above and this
	 * insert — but only when the thread attests to it, so an unattested caller
	 * still gets a conflict rather than someone else's agent.
	 */
	private async createAgent(
		user: User,
		{ projectId, agentId, name }: { projectId: string; agentId: string; name: string },
		adoptOnCollision: boolean,
	) {
		const { agents, defaultModelResolver } = this.agentsModule();
		const defaultModel = await defaultModelResolver.resolve(user, projectId);
		return await agents.create(projectId, name, {
			id: agentId,
			adoptOnCollision,
			...(defaultModel ? { defaultModel } : {}),
		});
	}

	/**
	 * Whether this thread's own lifecycle metadata names this agent. Thread
	 * metadata is user-writable, so it only attests which agent the thread is
	 * about — never that the user may have it; `assertMayWrite` covers that.
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

	/** Adopting additionally needs `agent:update`, for the reason the port's
	 *  `adoptOnCollision` docs give. */
	private async assertMayWrite(
		user: User,
		projectId: string,
		{ adopting }: { adopting: boolean },
	): Promise<void> {
		const scopes: Scope[] = adopting ? ['agent:create', 'agent:update'] : ['agent:create'];
		if (!(await userHasScopes(user, scopes, false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to create agents in this project.');
		}
	}
}
