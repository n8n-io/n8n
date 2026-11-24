import { AgentsConfig } from '@n8n/config';
import { ServiceAccountRepository, type ServiceAccount } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import { Container, Service } from '@n8n/di';
import { UserError } from '@n8n/errors';

import type { Agent } from './entities/agent.entity';
import { agentRunSecurityContext } from './agent-run-security';
import { AgentServiceAccountService } from './agent-service-account.service';
import { AgentRepository } from './repositories/agent.repository';

/** A published run of a disabled agent does not start. */
export class AgentDisabledError extends UserError {
	constructor() {
		super('This agent is disabled. A project admin can enable it again in the agent settings.');
	}
}

/**
 * Runtime identity: a published run of an agent acts as the agent's service
 * account, not with the access of its project. The account has the
 * `project:agent` role in the project of the agent, so it reaches what the
 * project gave the agent before. A builder can also share a credential with
 * the account directly.
 *
 * Behind `N8N_AGENTS_RUNTIME_IDENTITY_ENABLED`. With the flag off, runs keep
 * the access of the project.
 */
@Service()
export class AgentRuntimeIdentityService {
	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly agentServiceAccount: AgentServiceAccountService,
		private readonly serviceAccountRepository: ServiceAccountRepository,
		private readonly agentRepository: AgentRepository,
	) {}

	/** Like {@link toolProjectIds}, for an agent known by its id. A new agent has only its project. */
	async toolProjectIdsFor(agentId: string, projectId: string): Promise<string[]> {
		if (!this.isEnabled()) return [projectId];
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		return agent ? await this.toolProjectIds(agent) : [projectId];
	}

	/**
	 * The projects whose workflows the agent can use as tools: its own project,
	 * and with the flag on, each project that gave the agent access.
	 */
	async toolProjectIds(agent: Pick<Agent, 'identityId' | 'projectId'>): Promise<string[]> {
		if (!agent.projectId) return [];
		if (!this.isEnabled()) return [agent.projectId];
		const others = await this.serviceAccountRepository.findAgentProjectIds(agent.identityId);
		return [...new Set([agent.projectId, ...others])];
	}

	isEnabled(): boolean {
		return this.agentsConfig.runtimeIdentityEnabled;
	}

	/**
	 * The account a published run acts as. Returns `undefined` when the flag is
	 * off, and for an agent in a personal project, which keeps the access of the
	 * owner for now. Throws when the account is disabled.
	 */
	async resolveActingAccount(
		agent: Pick<Agent, 'identityId' | 'projectId'>,
	): Promise<ServiceAccount | undefined> {
		if (!this.isEnabled()) return undefined;
		if (await this.agentServiceAccount.isDisabled(agent)) throw new AgentDisabledError();
		return await this.agentServiceAccount.findActingAccount(agent);
	}

	/**
	 * The account and the security context of a published run. The account is
	 * the subject. Returns `undefined` in the same cases as {@link resolveActingAccount}.
	 */
	async resolveRunIdentity(
		agent: Pick<Agent, 'identityId' | 'projectId'>,
	): Promise<{ account: ServiceAccount; security: SecurityContext } | undefined> {
		const account = await this.resolveActingAccount(agent);
		if (!account) return undefined;
		return { account, security: agentRunSecurityContext(account) };
	}
}

/**
 * The projects whose workflows the agent can use as tools. With the flag off,
 * only the agent's own project, without a database read.
 */
export async function resolveToolProjectIds(
	agent: Pick<Agent, 'identityId' | 'projectId'>,
): Promise<string[]> {
	if (!Container.get(AgentsConfig).runtimeIdentityEnabled) {
		return agent.projectId ? [agent.projectId] : [];
	}
	return await Container.get(AgentRuntimeIdentityService).toolProjectIds(agent);
}

/** Like {@link resolveToolProjectIds}, for an agent known by its id. */
export async function resolveToolProjectIdsFor(
	agentId: string,
	projectId: string,
): Promise<string[]> {
	if (!Container.get(AgentsConfig).runtimeIdentityEnabled) return [projectId];
	return await Container.get(AgentRuntimeIdentityService).toolProjectIdsFor(agentId, projectId);
}
