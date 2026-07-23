import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { AgentPublishService } from './agent-publish.service';
import { AgentValidationService } from './agent-validation.service';
import type { Agent } from './entities/agent.entity';

@Service()
export class AgentRunnableStateService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly agentValidationService: AgentValidationService,
		private readonly agentPublishService: AgentPublishService,
	) {}

	async addRunnableState(
		agent: Agent,
		projectId: string,
		user: User,
	): Promise<Agent & { isRunnable: boolean; hasPublishHistory: boolean }> {
		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			user,
		);
		const [{ missing }, hasPublishHistory] = await Promise.all([
			this.agentValidationService.validateAgentIsRunnable(agent.id, projectId, credentialProvider),
			this.agentPublishService.hasPublishHistory(agent.id),
		]);

		return Object.assign(agent, {
			isRunnable: missing.length === 0,
			hasPublishHistory,
		});
	}
}
