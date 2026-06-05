import type { CredentialProvider, ModelConfig } from '@n8n/agents';

import { mapCredentialForProvider } from './credential-field-mapping';
import { getProviderPrefix } from './model-id';

export async function resolveCredentialAwareModelConfig(
	model: string,
	credential: string,
	credentialProvider: CredentialProvider,
): Promise<ModelConfig> {
	const raw = await credentialProvider.resolve(credential);
	const mapped = mapCredentialForProvider(getProviderPrefix(model), raw);
	return { id: model, ...mapped } as ModelConfig;
}
