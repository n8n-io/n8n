import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentCredentialProvider } from '../agent-credential-provider.contracts';
import { AgentSkillRefsService } from '../agent-skill-refs.service';
import { AgentValidationService } from '../agent-validation.service';
import { AgentsSettingsService } from '../agents-settings.service';
import { AgentsService } from '../agents.service';
import { N8nMemory } from '../integrations/n8n-memory';
import { toAgentDocument } from '../json-config/agent-document';
import { AgentThreadRepository } from '../repositories/agent-thread.repository';
import { countAgentCapabilities, totalAgentCapabilities } from '../utils/agent-capabilities';
import { createAgentCredentialProvider } from '../utils/agent-credential-provider';
import { buildBuilderSessionContext } from './agent-builder-session-context';
import { AgentsBuilderToolsService } from './agents-builder-tools.service';
import type { BuilderCredentialService, BuilderToolsOptions } from './builder-session';
import { getBuilderRuntimeSkills } from './skills';

@Service()
export class AgentsBuilderService {
	constructor(
		private readonly agents: AgentsService,
		private readonly tools: AgentsBuilderToolsService,
		private readonly memory: N8nMemory,
		private readonly threads: AgentThreadRepository,
		private readonly credentials: CredentialsService,
		private readonly settings: AgentsSettingsService,
		private readonly validation: AgentValidationService,
		private readonly skillRefs: AgentSkillRefsService,
	) {}

	private async assertProjectScope(user: User, projectId: string, scopes: Scope[]): Promise<void> {
		if (!(await userHasScopes(user, scopes, false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to access agents in this project.');
		}
	}

	private async assertAccess(user: User, projectId: string, scopes: Scope[]): Promise<void> {
		await this.settings.assertEnabled();
		await this.assertProjectScope(user, projectId, scopes);
	}

	getTools(
		user: User,
		projectId: string,
		resolveTargetAgentId: () => Promise<string | undefined>,
		credentialProviderFor: (agentId: string) => CredentialProvider,
		credentialService: BuilderCredentialService,
		options: BuilderToolsOptions = {},
	): BuiltTool[] {
		return this.tools.getToolsForResolvedTarget(
			async (pinnedAgentId) => {
				await this.assertAccess(user, projectId, ['agent:update']);
				if (pinnedAgentId) return pinnedAgentId;
				const agentId = await resolveTargetAgentId();
				if (!agentId) {
					throw new UserError(
						'No agent is selected. Call agent_builder_select_agent before using the builder tools.',
					);
				}
				return agentId;
			},
			projectId,
			credentialProviderFor,
			credentialService,
			user,
			options,
		);
	}

	getRuntimeSkills() {
		return getBuilderRuntimeSkills();
	}

	async getSessionContext(user: User, projectId: string, agentId: string): Promise<string> {
		await this.assertAccess(user, projectId, ['agent:read']);
		return await buildBuilderSessionContext(projectId, agentId);
	}

	createCredentialProvider(
		user: User,
		projectId: string,
		agentId: string,
	): AgentCredentialProvider {
		return createAgentCredentialProvider(this.credentials, projectId, user, agentId);
	}

	async validateAgent(
		user: User,
		projectId: string,
		agentId: string,
		credentialProviderFor: (agentId: string) => CredentialProvider,
	) {
		await this.assertProjectScope(user, projectId, ['agent:read']);
		const agent = await this.agents.findById(agentId, projectId);
		if (!agent) return undefined;
		const skillRefs = await this.skillRefs.refsForDraft(agent, {});
		const validation = await this.validation.validateLoadedAgentConfiguration(
			agent,
			projectId,
			credentialProviderFor(agentId),
			'publish',
			{ skillRefs },
		);
		const config = agent.schema ? toAgentDocument(agent.schema, skillRefs) : null;
		return {
			valid: validation.status === 'valid',
			issueCodes: [...new Set(validation.issues.map((issue) => issue.code))].sort(),
			issueCount: validation.issues.length,
			capabilityCount: totalAgentCapabilities(countAgentCapabilities(config, agent.integrations)),
		};
	}

	async deleteBuilderSessions(prefix: string): Promise<void> {
		const threadIds = await this.threads.findBuilderSessionIds(prefix);
		for (const threadId of threadIds) {
			await this.memory.getImplementation(threadId.slice(prefix.length)).deleteThread(threadId);
		}
	}
}
