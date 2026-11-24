import type { User } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';

import type { CredentialsService } from '@/credentials/credentials.service';

import { AgentsCredentialProvider } from '../adapters/agents-credential-provider';

export function createAgentCredentialProvider(
	credentialsService: CredentialsService,
	projectId: string,
	user?: User,
	agentId?: string,
	security?: SecurityContext,
): AgentsCredentialProvider {
	return new AgentsCredentialProvider(credentialsService, projectId, user, agentId, security);
}
