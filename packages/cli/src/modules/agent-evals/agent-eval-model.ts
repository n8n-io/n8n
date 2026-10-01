import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';
import { MANAGED_CREDENTIAL_TOKEN, type AgentJsonConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { UserError } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';

import { isSupportedAgentProvider } from '../agents/json-config/credential-field-mapping';
import { resolveCredentialAwareModelConfig } from '../agents/json-config/model-config';
import { createAgentCredentialProvider } from '../agents/utils/agent-credential-provider';

export type AgentByokModelConfig = Awaited<ReturnType<typeof resolveCredentialAwareModelConfig>>;

/**
 * Resolve the agent's own model + API-key credential into a ready-to-use model
 * config, the same way the agent runtime does. Throws a `UserError` for agents
 * without a usable bring-your-own-key model (unset, managed, or unsupported
 * provider), since callers hit the provider directly with that credential.
 */
export async function resolveAgentByokModel(
	config: AgentJsonConfig,
	projectId: string,
	user: User,
	credentialsService: CredentialsService,
	messages: { missing?: string; unsupported?: (model: string) => string } = {},
): Promise<AgentByokModelConfig> {
	const { model, credential } = config;
	if (!model || !credential || credential === MANAGED_CREDENTIAL_TOKEN) {
		throw new UserError(
			messages.missing ?? 'This agent needs a configured model and API-key credential.',
		);
	}
	if (!isSupportedAgentProvider(getProviderPrefix(model))) {
		throw new UserError(
			messages.unsupported?.(model) ?? `The agent's model provider is not supported ("${model}").`,
		);
	}

	const credentialProvider = createAgentCredentialProvider(credentialsService, projectId, user);
	return await resolveCredentialAwareModelConfig(model, credential, credentialProvider);
}
