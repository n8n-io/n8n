import type { CredentialProvider, ModelConfig, ResolvedCredential } from '@n8n/agents';
import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';
import { AI_GATEWAY_MANAGED_TAG, isVertexGeminiModel } from '@n8n/api-types';
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
	options: { deploymentName?: string; projectId?: string } = {},
): Promise<ModelConfig> {
	const provider = getProviderPrefix(model);
	if (provider === 'google-vertex') {
		if (!isVertexGeminiModel(model)) {
			throw new UserError('Select a versioned Gemini 3 or newer model for Google Vertex AI.');
		}
		if (!options.projectId?.trim()) {
			throw new UserError('Enter a Google Cloud project ID for the Google Vertex AI model.');
		}
		const selected = (await credentialProvider.list()).find((entry) => entry.id === credential);
		if (selected?.type !== 'googleApi') {
			throw new UserError('Select a Google Service Account credential for Google Vertex AI.');
		}
	}

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
			// The gateway serves OpenAI's Responses API, so pin the route here. The
			// model factory otherwise asks the endpoint which API it speaks, and this
			// one is known — /chat/completions rejects reasoning effort once tools are
			// attached.
			...(provider === 'openai' ? { apiStyle: 'responses' } : {}),
		};
	}

	const raw = await credentialProvider.resolve(credential);
	const mapped = mapCredentialForProvider(provider, raw);
	return {
		id: model,
		...mapped,
		...(provider === 'azure-openai' && options.deploymentName
			? { deploymentName: options.deploymentName }
			: {}),
		...(provider === 'google-vertex' ? { project: options.projectId?.trim() } : {}),
	};
}
