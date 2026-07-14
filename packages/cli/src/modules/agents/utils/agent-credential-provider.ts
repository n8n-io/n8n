import type { User } from '@n8n/db';

import type { CredentialsService } from '@/credentials/credentials.service.js';

import { AgentsCredentialProvider } from '../adapters/agents-credential-provider.js';

export function createAgentCredentialProvider(
	credentialsService: CredentialsService,
	projectId: string,
	user?: User,
): AgentsCredentialProvider {
	return new AgentsCredentialProvider(credentialsService, projectId, user);
}
