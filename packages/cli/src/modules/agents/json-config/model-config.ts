import type { CredentialProvider, ModelConfig } from '@n8n/agents';
import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';

import { mapCredentialForProvider } from './credential-field-mapping';

export async function resolveCredentialAwareModelConfig(
	model: string,
	credential: string,
	credentialProvider: CredentialProvider,
): Promise<ModelConfig> {
	const raw = await credentialProvider.resolve(credential);
	const mapped = mapCredentialForProvider(getProviderPrefix(model), raw);
	return { id: model, ...mapped } as ModelConfig;
}
