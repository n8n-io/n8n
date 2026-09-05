import { proxyFetch, type ProxyFetchOptions } from '@n8n/ai-utilities';
import { listOpenAiModels } from '@n8n/ai-utilities/model-discovery';
import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type {
	ICredentialDataDecryptedObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
} from 'n8n-workflow';
import {
	getOpenAiApiKey,
	getOpenAiCredentialType,
} from 'n8n-nodes-base/dist/credentials/OpenAiApi.credentials';

import { mergeCustomHeaders } from '../../../../utils/helpers';
import { assertOpenAiCredentialAllowsUrl } from '../../../vendors/OpenAi/helpers/credentials';

const OPENAI_ACCOUNT_MODELS_URL =
	'https://chatgpt.com/backend-api/codex/models?client_version=1.0.0';
const JWT_ACCOUNT_CLAIM = 'https://api.openai.com/auth';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasModelSlug(model: Record<string, unknown>): model is Record<string, unknown> & {
	slug: string;
} {
	return typeof model.slug === 'string' && model.slug.trim().length > 0;
}

function extractChatGptAccountId(token: string): string | undefined {
	const parts = token.split('.');
	if (parts.length !== 3) return undefined;

	try {
		const payload: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
		if (!isRecord(payload)) return undefined;

		const claim = payload[JWT_ACCOUNT_CLAIM];
		if (!isRecord(claim)) return undefined;

		const accountId = claim.chatgpt_account_id;
		return typeof accountId === 'string' && accountId ? accountId : undefined;
	} catch {
		return undefined;
	}
}

// The ChatGPT/Codex backend has no /models endpoint compatible with
// @n8n/ai-utilities/model-discovery, so the OAuth catalog is fetched directly
// (through the same secure-egress proxy fetch as the API-key path).
async function searchOpenAiAccountModels(
	credentials: ICredentialDataDecryptedObject,
	lookup: ProxyFetchOptions['lookup'],
	filter?: string,
): Promise<INodeListSearchResult> {
	const accessToken = getOpenAiApiKey(credentials);
	const headers: Record<string, string> = {
		Authorization: `Bearer ${accessToken}`,
		'Content-Type': 'application/json',
	};
	const accountId = extractChatGptAccountId(accessToken);

	if (accountId) {
		headers['chatgpt-account-id'] = accountId;
	}

	const response = await proxyFetch({
		input: OPENAI_ACCOUNT_MODELS_URL,
		init: { headers },
		lookup,
	});
	if (!response.ok) {
		throw new Error(`OpenAI account model discovery failed: HTTP ${response.status}`);
	}

	const payload: unknown = await response.json();
	const models = isRecord(payload) && Array.isArray(payload.models) ? payload.models : [];
	const filteredModels = models
		.filter(isRecord)
		.filter(hasModelSlug)
		.filter((model) => (model.visibility ?? 'list') === 'list')
		.filter((model) => {
			if (!filter) return true;
			return model.slug.toLowerCase().includes(filter.toLowerCase());
		})
		.sort((left, right) => {
			const leftPriority =
				typeof left.priority === 'number' ? left.priority : Number.MAX_SAFE_INTEGER;
			const rightPriority =
				typeof right.priority === 'number' ? right.priority : Number.MAX_SAFE_INTEGER;
			return leftPriority - rightPriority;
		});

	return {
		results: filteredModels.map((model) => ({
			name: model.slug,
			value: model.slug,
		})),
	};
}

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const authentication = this.getNodeParameter('authentication', 'apiKey');
	const credentials = await this.getCredentials(getOpenAiCredentialType(authentication));
	const lookup = this.helpers.getSecureEgressFilter().createSecureLookup();

	if (authentication === 'oAuth2') {
		return await searchOpenAiAccountModels(credentials, lookup, filter);
	}

	const baseUrlOverride = this.getNodeParameter('options.baseURL', '') as string;
	if (baseUrlOverride) {
		assertOpenAiCredentialAllowsUrl(this.getNode(), credentials, baseUrlOverride);
	}
	const baseURL = baseUrlOverride || (credentials.url as string) || 'https://api.openai.com/v1';
	const { openAiDefaultHeaders } = Container.get(AiConfig);
	const headers = mergeCustomHeaders(credentials, openAiDefaultHeaders ?? {});

	// Shared with the agents model catalog: endpoint, auth, chat-model filtering
	// (including include-all on custom hosts) live in @n8n/ai-utilities/model-discovery.
	const models = await listOpenAiModels({
		apiKey: credentials.apiKey as string,
		baseURL,
		headers,
		fetch: async (input, init) => await proxyFetch({ input, init, lookup }),
	});

	return {
		results: models
			.filter((model) => !filter || model.id.toLowerCase().includes(filter.toLowerCase()))
			.map((model) => ({ name: model.id, value: model.id })),
	};
}
