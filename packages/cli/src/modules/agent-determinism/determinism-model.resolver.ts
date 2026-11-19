import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';
import { AgentDefaultModelResolverService } from '@/modules/agents/agent-default-model-resolver.service';
import { resolveCredentialAwareModelConfig } from '@/modules/agents/json-config/model-config';
import { createAgentCredentialProvider } from '@/modules/agents/utils/agent-credential-provider';

@Service()
export class DeterminismModelResolver {
	constructor(
		private readonly defaultModelResolver: AgentDefaultModelResolverService,
		private readonly credentialsService: CredentialsService,
	) {}

	async resolve(user: User, projectId: string) {
		const config = await this.defaultModelResolver.resolve(user, projectId);
		if (!config) return null;
		return await resolveCredentialAwareModelConfig(
			config.model,
			config.credential,
			createAgentCredentialProvider(this.credentialsService, projectId, user),
		);
	}
}
