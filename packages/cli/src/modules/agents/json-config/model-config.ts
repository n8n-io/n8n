import { isAzureEntraCredential, type ModelConfig, type ResolvedCredential } from '@n8n/agents';
import type { AgentCredentialProvider } from '../agent-credential-provider.contracts';
import { splitModelId } from '@n8n/ai-utilities/agent-config';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { mapCredentialForProvider } from '@/credentials/credential-field-mapping';
import { AzureFoundryDeploymentsService } from '../azure-foundry-deployments.service';

export async function resolveCredentialAwareModelConfig(
	model: string,
	credential: string,
	credentialProvider: AgentCredentialProvider,
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
			usageCredential: { managedBy: 'aiGateway' },
			// The gateway serves OpenAI's Responses API, so pin the route here. The
			// model factory otherwise asks the endpoint which API it speaks, and this
			// one is known — /chat/completions rejects reasoning effort once tools are
			// attached.
			...(provider === 'openai' ? { apiStyle: 'responses' } : {}),
		};
	}

	const raw = await credentialProvider.resolve(credential);
	// The model factory reads it for LLM usage records. It is not a field of the provider.
	const mapped = {
		...mapCredentialForProvider(provider, raw),
		usageCredential: { id: credential },
	};
	if (provider === 'google-vertex') {
		const { getCachedCatalog } = await import('@n8n/agents/catalog');
		const catalog = await getCachedCatalog();
		const sdk = catalog?.[provider]?.models[modelName]?.sdk;
		return { id: model, ...mapped, ...(sdk !== undefined && { sdk }) };
	}
	if (provider === 'azure-openai') {
		const catalogModelId = await findFoundryCatalogModelId(credential, raw, modelName);
		return {
			id: model,
			...mapped,
			...entraSsrfBridge(raw),
			...(catalogModelId ? { catalogModelId } : {}),
		};
	}
	return { id: model, ...mapped };
}

/** Entra ID token mints for Azure OpenAI must follow the instance's outbound policy. */
function entraSsrfBridge(raw: ResolvedCredential) {
	if (!isAzureEntraCredential(raw)) return {};
	if (!Container.get(SsrfProtectionConfig).enabled) return {};
	return { ssrfBridge: Container.get(SsrfProtectionService) };
}

/**
 * A Foundry deployment name does not say which model it serves. Look the model
 * up, so cost and capabilities come from its catalog entry. Undefined when the
 * lookup fails or the credential is not a Foundry credential.
 */
async function findFoundryCatalogModelId(
	credentialId: string,
	credential: ResolvedCredential,
	modelName: string,
): Promise<string | undefined> {
	if (credential.endpointType !== 'foundry') return undefined;
	const underlying = await Container.get(AzureFoundryDeploymentsService).findUnderlyingModel(
		credentialId,
		credential,
		modelName,
	);
	return underlying ? `azure-openai/${underlying}` : undefined;
}
