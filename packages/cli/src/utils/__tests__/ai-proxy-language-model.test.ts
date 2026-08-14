import {
	MOONSHOTAI_KIMI_K3_MODEL_ID,
	MOONSHOTAI_KIMI_K3_MODEL_NAME,
	MOONSHOTAI_KIMI_K3_PROVIDER,
	X_N8N_FEATURE_HEADER,
} from '@n8n/api-types';
import type { OutboundHttp } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';

import type { ProxyTokenManager } from '@/services/proxy-token-manager';

const sdk = vi.hoisted(() => {
	const anthropicCalls: Array<{ opts: Record<string, unknown>; model: string }> = [];
	const kimiCalls: Array<{ opts: Record<string, unknown>; model: string }> = [];
	return {
		anthropicCalls,
		kimiCalls,
		createAnthropic: (opts: Record<string, unknown>) => (model: string) => {
			anthropicCalls.push({ opts, model });
			return { provider: 'anthropic.messages', modelId: model, specificationVersion: 'v3' };
		},
		createOpenAICompatible: (opts: Record<string, unknown>) => (model: string) => {
			kimiCalls.push({ opts, model });
			return { provider: opts.name, modelId: model, specificationVersion: 'v3' };
		},
	};
});

vi.mock('@ai-sdk/anthropic', () => ({
	createAnthropic: sdk.createAnthropic,
}));

vi.mock('@ai-sdk/openai-compatible', () => ({
	createOpenAICompatible: sdk.createOpenAICompatible,
}));

const modelFetch = vi.hoisted(() =>
	vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
		async () => new Response('ok'),
	),
);

vi.mock('@/utils/ai-proxy-fetch', () => ({
	createAiProxyFetch: vi.fn(() => modelFetch),
}));

import { createProxyLanguageModel } from '../ai-proxy-language-model';

describe('createProxyLanguageModel', () => {
	const outboundHttp = mock<OutboundHttp>();
	const tokenManager = {
		getAuthHeaders: vi.fn(async () => ({ Authorization: 'Bearer tok' })),
	} as unknown as ProxyTokenManager;

	beforeEach(() => {
		vi.clearAllMocks();
		sdk.anthropicCalls.length = 0;
		sdk.kimiCalls.length = 0;
		modelFetch.mockResolvedValue(new Response('ok'));
	});

	it('routes exact moonshotai/kimi-k3 through the Kimi OpenAI-compatible proxy', async () => {
		const model = await createProxyLanguageModel({
			proxyBaseUrl: 'https://proxy.example/api/',
			modelId: MOONSHOTAI_KIMI_K3_MODEL_ID,
			tokenManager,
			feature: 'instance-ai',
			n8nVersion: '1.2.3',
			outboundHttp,
		});

		expect(sdk.kimiCalls).toHaveLength(1);
		expect(sdk.anthropicCalls).toHaveLength(0);
		expect(sdk.kimiCalls[0]?.model).toBe(MOONSHOTAI_KIMI_K3_MODEL_NAME);
		expect(sdk.kimiCalls[0]?.opts).toMatchObject({
			name: MOONSHOTAI_KIMI_K3_PROVIDER,
			baseURL: 'https://proxy.example/api/kimi/v1',
			apiKey: 'proxy-managed',
			supportsStructuredOutputs: true,
			includeUsage: true,
		});
		expect(model).toMatchObject({
			provider: MOONSHOTAI_KIMI_K3_PROVIDER,
			modelId: MOONSHOTAI_KIMI_K3_MODEL_NAME,
		});
	});

	it.each(['moonshotai/kimi-k2', 'custom/moonshotai/kimi-k3', 'anthropic/claude-opus-5'] as const)(
		'keeps the Anthropic proxy path for %s',
		async (modelId) => {
			await createProxyLanguageModel({
				proxyBaseUrl: 'https://proxy.example/api',
				modelId,
				tokenManager,
				feature: 'instance-ai',
				n8nVersion: '1.2.3',
				outboundHttp,
			});

			expect(sdk.kimiCalls).toHaveLength(0);
			expect(sdk.anthropicCalls).toHaveLength(1);
			expect(sdk.anthropicCalls[0]?.opts.baseURL).toBe('https://proxy.example/api/anthropic/v1');
		},
	);

	it('uses a bare Anthropic model name as-is', async () => {
		await createProxyLanguageModel({
			proxyBaseUrl: 'https://proxy.example/api',
			modelId: 'claude-sonnet-4-6',
			tokenManager,
			feature: 'agent-builder',
			n8nVersion: '1.2.3',
			outboundHttp,
		});

		expect(sdk.anthropicCalls[0]?.model).toBe('claude-sonnet-4-6');
		expect(sdk.anthropicCalls[0]?.opts.baseURL).toBe('https://proxy.example/api/anthropic/v1');
	});

	it('stamps proxy auth and feature headers on Kimi requests', async () => {
		await createProxyLanguageModel({
			proxyBaseUrl: 'https://proxy.example/api',
			modelId: MOONSHOTAI_KIMI_K3_MODEL_ID,
			tokenManager,
			feature: 'instance-ai',
			n8nVersion: '1.2.3',
			outboundHttp,
		});

		const fetch = sdk.kimiCalls[0]?.opts.fetch as typeof globalThis.fetch;
		await fetch('https://proxy.example/api/kimi/v1/chat/completions', { method: 'POST' });

		expect(modelFetch).toHaveBeenCalledWith(
			'https://proxy.example/api/kimi/v1/chat/completions',
			expect.objectContaining({
				headers: expect.any(Headers),
			}),
		);
		const headers = modelFetch.mock.calls[0]?.[1]?.headers;
		expect(headers).toBeInstanceOf(Headers);
		if (!(headers instanceof Headers)) {
			throw new Error('expected Headers');
		}
		expect(headers.get('Authorization')).toBe('Bearer tok');
		expect(headers.get(X_N8N_FEATURE_HEADER)).toBe('instance-ai');
		expect(headers.get('x-n8n-version')).toBe('1.2.3');
	});
});
