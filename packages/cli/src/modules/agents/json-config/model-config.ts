import type { CredentialProvider, ModelConfig } from '@n8n/agents';

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

export function getProviderPrefix(modelId: string): string {
	const slashIdx = modelId.indexOf('/');
	return slashIdx !== -1 ? modelId.slice(0, slashIdx) : '';
}
