import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import {
	AgentPublishService,
	type ValidAgentConfigValidationResponse,
} from './agent-publish.service';
import { AgentValidationService } from './agent-validation.service';
import type { Agent } from './entities/agent.entity';

@Service()
export class AgentRunnableStateService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly agentValidationService: AgentValidationService,
		private readonly agentPublishService: AgentPublishService,
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
	): Promise<Agent & { isRunnable: boolean; hasPublishHistory: boolean }> {
		if (draftValidation) {
			const hasPublishHistory = await this.agentPublishService.hasPublishHistory(agent.id);
			return Object.assign(agent, {
				isRunnable: true,
				hasPublishHistory,
			});
		}

		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			user,
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
		});
	}
}
