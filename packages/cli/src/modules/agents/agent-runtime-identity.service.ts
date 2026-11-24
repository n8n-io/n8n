import { AgentsConfig } from '@n8n/config';
import { type ServiceAccount, UserRepository } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';

import type { Agent } from './entities/agent.entity';
import { agentRunSecurityContext } from './agent-run-security';
import { AgentServiceAccountService } from './agent-service-account.service';

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
		private readonly userRepository: UserRepository,
	) {}

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
	 * the subject. `personId` is the person who started the run, when n8n knows
	 * them (published n8n Chat). They become the actor. Returns `undefined` in
	 * the same cases as {@link resolveActingAccount}.
	 */
	async resolveRunIdentity(
		agent: Pick<Agent, 'identityId' | 'projectId'>,
		{ personId }: { personId?: string } = {},
	): Promise<{ account: ServiceAccount; security: SecurityContext } | undefined> {
		const account = await this.resolveActingAccount(agent);
		if (!account) return undefined;
		const [person] = personId
			? await this.userRepository.findManyByIds([personId], { includeRole: true, kind: 'person' })
			: [];
		return { account, security: agentRunSecurityContext(account, person) };
	}
}
