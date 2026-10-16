import type { AgentSkill } from '@n8n/api-types';
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

@Service()
export class AgentRunnableStateService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly agentValidationService: AgentValidationService,
		private readonly agentPublishService: AgentPublishService,
		private readonly agentSkillRefs: AgentSkillRefsService,
	) {}

	/**
	 * Decorate `agent` with `isRunnable`/`hasPublishHistory` for API responses.
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
	): Promise<
		Agent & {
			isRunnable: boolean;
			hasPublishHistory: boolean;
			configHash: string | null;
			skills: Record<string, AgentSkill>;
			skillHashes: Record<string, string>;
			outdatedSkillIds: string[];
		}
	> {
		// The skill bodies the draft runs, from the skills hub, keyed by skill id.
		const { skillRefs, skills } = await this.agentSkillRefs.readDraft(agent, {});
		// Base hashes for the optimistic-concurrency checks on config and skill writes.
		const configHash = getAgentConfigHash(composeJsonConfig(agent, skillRefs));
		const skillHashes = Object.fromEntries(
			Object.entries(skills).map(([id, skill]) => [id, getAgentSkillHash(skill)]),
		);
		const outdatedSkillIds = await this.agentSkillRefs.findOutdatedSkillIds(skillRefs, skills, {});
		if (draftValidation) {
			const hasPublishHistory = await this.agentPublishService.hasPublishHistory(agent.id);
			return Object.assign(agent, {
				isRunnable: true,
				hasPublishHistory,
				configHash,
				skills,
				skillHashes,
				outdatedSkillIds,
			});
		}

		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			user,
			agent.id,
		);
		const [validation, hasPublishHistory] = await Promise.all([
			this.agentValidationService.validateLoadedAgentConfiguration(
				agent,
				projectId,
				credentialProvider,
				'runtime',
			),
			this.agentPublishService.hasPublishHistory(agent.id),
		]);

		return Object.assign(agent, {
			isRunnable: validation.status === 'valid',
			hasPublishHistory,
			configHash,
			skills,
			skillHashes,
			outdatedSkillIds,
		});
	}
}
