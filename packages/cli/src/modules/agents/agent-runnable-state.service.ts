import type { AgentJsonConfig, AgentSkill, AgentSkillVersionInfo } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import {
	AgentPublishService,
	type ValidAgentConfigValidationResponse,
} from './agent-publish.service';
import { AgentSkillRefsService } from './agent-skill-refs.service';
import { AgentValidationService } from './agent-validation.service';
import type { Agent } from './entities/agent.entity';
import { composeJsonConfig } from './json-config/agent-config-composition';
import { getAgentConfigHash, getAgentSkillHash } from './utils/agent-config-hash';

/** Builder fields for one agent response. The agent row itself is left unchanged. */
export interface AgentRunnableState {
	isRunnable: boolean;
	hasPublishHistory: boolean;
	hasVersionHistory: boolean;
	config: AgentJsonConfig | null;
	configHash: string | null;
	skills: Record<string, AgentSkill>;
	skillHashes: Record<string, string>;
	outdatedSkillIds: string[];
	skillVersions: Record<string, AgentSkillVersionInfo>;
}

@Service()
export class AgentRunnableStateService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly agentValidationService: AgentValidationService,
		private readonly agentPublishService: AgentPublishService,
		private readonly agentSkillRefs: AgentSkillRefsService,
	) {}

	/**
	 * Read the builder fields for an API response.
	 *
	 * Returns a new object. The agent row is not modified, so a later save of
	 * that instance cannot persist response-only fields.
	 *
	 * `draftValidation` lets a caller that just validated the current draft
	 * (e.g. a successful plain publish) skip re-validating it here. Only pass
	 * a result that describes the *current draft* — never a historical
	 * snapshot's validation, and never anything derived from a request
	 * payload, since this is a trust boundary.
	 */
	async addRunnableState(
		agent: Agent,
		projectId: string,
		user: User,
		draftValidation?: ValidAgentConfigValidationResponse,
	): Promise<AgentRunnableState> {
		// The skill bodies the draft runs, from the skills module, keyed by skill id.
		const { skillRefs, skills } = await this.agentSkillRefs.readDraft(agent, {});
		const config = composeJsonConfig(agent, skillRefs);
		// Base hashes for the optimistic-concurrency checks on config and skill writes.
		const configHash = getAgentConfigHash(config);
		const skillHashes = Object.fromEntries(
			Object.entries(skills).map(([id, skill]) => [id, getAgentSkillHash(skill)]),
		);
		const [outdatedSkillIds, skillVersions] = await Promise.all([
			this.agentSkillRefs.findOutdatedSkillIds(skillRefs, skills, {}),
			this.agentSkillRefs.findSkillVersions(agent, skillRefs, {}),
		]);
		const shared = {
			config,
			configHash,
			skills,
			skillHashes,
			outdatedSkillIds,
			skillVersions,
		};
		if (draftValidation) {
			const [hasPublishHistory, hasVersionHistory] = await Promise.all([
				this.agentPublishService.hasPublishHistory(agent.id),
				this.agentPublishService.hasVersionHistory(agent.id),
			]);
			return {
				...shared,
				isRunnable: true,
				hasPublishHistory: Boolean(hasPublishHistory),
				hasVersionHistory: Boolean(hasVersionHistory),
			};
		}

		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			user,
			agent.id,
		);
		const [validation, hasPublishHistory, hasVersionHistory] = await Promise.all([
			this.agentValidationService.validateLoadedAgentConfiguration(
				agent,
				projectId,
				credentialProvider,
				'runtime',
			),
			this.agentPublishService.hasPublishHistory(agent.id),
			this.agentPublishService.hasVersionHistory(agent.id),
		]);

		return {
			...shared,
			isRunnable: validation.status === 'valid',
			hasPublishHistory: Boolean(hasPublishHistory),
			hasVersionHistory: Boolean(hasVersionHistory),
		};
	}
}
