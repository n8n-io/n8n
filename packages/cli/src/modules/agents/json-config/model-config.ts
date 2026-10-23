import type { ModelConfig } from '@n8n/agents';
import type { AgentCredentialProvider } from '../agent-credential-provider.contracts';
import { splitModelId } from '@n8n/ai-utilities/agent-config';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { UserError } from 'n8n-workflow';

import { mapCredentialForProvider } from './credential-field-mapping';

export async function resolveCredentialAwareModelConfig(
	model: string,
	credential: string,
	credentialProvider: AgentCredentialProvider,
	/**
	 * Azure OpenAI deployments are user-named in Azure and surfaced in the URL
	 * path on both endpoint types. The catalog model id is not the deployment
	 * id, so the agent flow must carry the user's deployment name separately.
	 * Only meaningful for the `azure-openai` provider — on classic it is
	 * required, on Foundry it is optional and overrides the model id.
	 */
	deploymentName?: string,
): Promise<ModelConfig> {
	const { provider, model: modelName } = splitModelId(model);
	if (provider === 'google-vertex') {
		const selected = (await credentialProvider.list()).find((entry) => entry.id === credential);
		if (selected?.type !== 'googleVertexAiApi') {
			throw new UserError(
				'This model requires a Google Vertex AI credential. Select a compatible credential.',
			);
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
	if (provider === 'google-vertex') {
		const { getCachedCatalog } = await import('@n8n/agents/catalog');
		const catalog = await getCachedCatalog();
		const sdk = catalog?.[provider]?.models[modelName]?.sdk;
		return { id: model, ...mapped, ...(sdk !== undefined && { sdk }) };
	}
	return {
		id: model,
		...mapped,
		...(provider === 'azure-openai' && deploymentName ? { deploymentName } : {}),
	};
}
