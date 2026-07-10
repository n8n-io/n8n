import type { CredentialProvider, ModelConfig, ResolvedCredential } from '@n8n/agents';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';

import { mapCredentialForProvider } from './credential-field-mapping';

/**
 * A `CredentialProvider` that can also mint the n8n Connect (AI Gateway)
 * synthetic credential for a model slot, keyed by the model's provider prefix
 * (e.g. `openai`). `AgentsCredentialProvider` implements this; keeping the
 * capability on the provider avoids threading a resolver through the build path.
 */
export interface AiGatewayModelCredentialResolver {
	resolveAiGatewayModelCredential(provider: string): Promise<ResolvedCredential>;
}

function canResolveAiGatewayModel(
	credentialProvider: CredentialProvider,
): credentialProvider is CredentialProvider & AiGatewayModelCredentialResolver {
	return (
		typeof (credentialProvider as Partial<AiGatewayModelCredentialResolver>)
			.resolveAiGatewayModelCredential === 'function'
	);
}

export async function resolveCredentialAwareModelConfig(
	model: string,
	credential: string,
	credentialProvider: CredentialProvider,
): Promise<ModelConfig> {
	const provider = getProviderPrefix(model);

	if (credential === AI_GATEWAY_MANAGED_TAG && canResolveAiGatewayModel(credentialProvider)) {
		const raw = await credentialProvider.resolveAiGatewayModelCredential(provider);
		return { id: model, ...mapCredentialForProvider(provider, raw) } as ModelConfig;
	}

	const raw = await credentialProvider.resolve(credential);
	const mapped = mapCredentialForProvider(provider, raw);
	return { id: model, ...mapped } as ModelConfig;
}
