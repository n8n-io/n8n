import type { ModelConfig } from '@n8n/agents';
import {
	MOONSHOTAI_KIMI_K3_MODEL_NAME,
	MOONSHOTAI_KIMI_K3_PROVIDER,
	buildProxyHeaders,
	isMoonshotaiKimiK3ModelId,
	type N8nProxyFeature,
} from '@n8n/api-types';
import type { OutboundHttp } from '@n8n/backend-network';
import type { LanguageModel } from 'ai';

import type { ProxyTokenManager } from '@/services/proxy-token-manager';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

const ANTHROPIC_PROXY_PATH = '/anthropic/v1';
const KIMI_PROXY_PATH = '/kimi/v1';

export interface CreateProxyLanguageModelOptions {
	proxyBaseUrl: string;
	/**
	 * Full `provider/model` id, or a bare Anthropic model name. The Kimi arm
	 * triggers only on the exact `moonshotai/kimi-k3` id.
	 */
	modelId: string;
	tokenManager: ProxyTokenManager;
	feature: N8nProxyFeature;
	n8nVersion: string;
	outboundHttp: OutboundHttp;
}

/**
 * Build a LanguageModel pointed at the AI-assistant-service api-proxy.
 *
 * Exact `moonshotai/kimi-k3` uses the OpenAI-compatible Kimi route so claims
 * stamp `moonshotai/kimi-k3` (not `openai/...`). Every other id keeps the
 * existing Anthropic `/anthropic/v1` transport.
 */
export async function createProxyLanguageModel(
	options: CreateProxyLanguageModelOptions,
): Promise<LanguageModel> {
	const proxyBaseUrl = options.proxyBaseUrl.replace(/\/$/, '');
	const proxyHeaders = buildProxyHeaders({
		feature: options.feature,
		n8nVersion: options.n8nVersion,
	});
	const modelFetch = createAiProxyFetch(options.outboundHttp);
	const fetch: typeof globalThis.fetch = async (input, init) => {
		const headers = new Headers(init?.headers);
		const auth = await options.tokenManager.getAuthHeaders();
		for (const [k, v] of Object.entries(auth)) {
			headers.set(k, v);
		}
		for (const [k, v] of Object.entries(proxyHeaders)) {
			headers.set(k, v);
		}
		return await modelFetch(input, { ...init, headers });
	};

	if (isMoonshotaiKimiK3ModelId(options.modelId)) {
		const openaiCompatible: typeof import('@ai-sdk/openai-compatible') = await import(
			'@ai-sdk/openai-compatible'
		);
		return openaiCompatible.createOpenAICompatible({
			name: MOONSHOTAI_KIMI_K3_PROVIDER,
			baseURL: proxyBaseUrl + KIMI_PROXY_PATH,
			apiKey: 'proxy-managed',
			fetch,
			supportsStructuredOutputs: true,
			includeUsage: true,
		})(MOONSHOTAI_KIMI_K3_MODEL_NAME);
	}

	const { createAnthropic } = await import('@ai-sdk/anthropic');
	const slash = options.modelId.indexOf('/');
	const modelName = slash >= 0 ? options.modelId.slice(slash + 1) : options.modelId;
	return createAnthropic({
		baseURL: proxyBaseUrl + ANTHROPIC_PROXY_PATH,
		apiKey: 'proxy-managed',
		fetch,
	})(modelName);
}

/** Whether a resolved ModelConfig is the proxied Kimi K3 LanguageModel / id. */
export function isMoonshotaiKimiK3ProxyModel(model: ModelConfig): boolean {
	if (typeof model === 'string') {
		return isMoonshotaiKimiK3ModelId(model);
	}
	if (typeof model !== 'object' || model === null) {
		return false;
	}
	if ('id' in model && typeof model.id === 'string') {
		return isMoonshotaiKimiK3ModelId(model.id);
	}
	if ('modelId' in model && typeof model.modelId === 'string') {
		const rawProvider = 'provider' in model ? String(model.provider) : '';
		const provider = rawProvider.split('.')[0];
		return (
			provider === MOONSHOTAI_KIMI_K3_PROVIDER && model.modelId === MOONSHOTAI_KIMI_K3_MODEL_NAME
		);
	}
	return false;
}
