import type { CredentialProvider, ModelConfig, ResolvedCredential } from '@n8n/agents';
import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { UserError } from 'n8n-workflow';

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

export async function resolveCredentialAwareModelConfig(
	model: string,
	credential: string,
	credentialProvider: CredentialProvider & Partial<AiGatewayModelCredentialResolver>,
	/**
	 * Azure OpenAI classic deployments are user-named in Azure and surfaced in
	 * the deployment-based URL path. The catalog model id is not the deployment
	 * id, so the agent flow must carry the user's deployment name separately.
	 * Only meaningful for the `azure-openai` provider with a classic endpoint.
	 */
	deploymentName?: string,
): Promise<ModelConfig> {
	const provider = getProviderPrefix(model);

	if (credential === AI_GATEWAY_MANAGED_TAG) {
		if (!credentialProvider.resolveAiGatewayModelCredential) {
			throw new UserError(
				'This credential provider cannot resolve Gateway credits model credentials.',
			);
		}
		const raw = await credentialProvider.resolveAiGatewayModelCredential(provider);
		return {
			id: model,
			...mapCredentialForProvider(provider, raw),
			// The gateway serves OpenAI's Responses API, so opt out of the model
			// factory's "a baseURL means an OpenAI-compatible server" heuristic —
			// /chat/completions rejects reasoning effort once tools are attached.
			...(provider === 'openai' ? { apiStyle: 'responses' } : {}),
		} as ModelConfig;
	}

	const raw = await credentialProvider.resolve(credential);
	const mapped = mapCredentialForProvider(provider, raw);
	return {
		id: model,
		...mapped,
		...(provider === 'azure-openai' && deploymentName ? { deploymentName } : {}),
	} as ModelConfig;
}
