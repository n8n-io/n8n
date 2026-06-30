import type { CustomFetch } from '@n8n/backend-network';
import type { ModelConfig } from '@n8n/instance-ai';

interface CreateProxyModelInput {
	modelName: string;
	baseUrl: string;
	fetch: CustomFetch;
}

export interface InstanceAiProxyProviderDefinition {
	route: `${string}/v1`;
	createModel: (input: CreateProxyModelInput) => Promise<ModelConfig>;
}

const anthropicRoute = 'anthropic/v1';
const openAiRoute = 'openai/v1';

export const SUPPORTED_INSTANCE_AI_PROXY_PROVIDERS = ['anthropic', 'openai'] as const;

export type InstanceAiProxyProvider = (typeof SUPPORTED_INSTANCE_AI_PROXY_PROVIDERS)[number];

export const INSTANCE_AI_PROXY_PROVIDERS: Record<
	InstanceAiProxyProvider,
	InstanceAiProxyProviderDefinition
> = {
	anthropic: {
		route: anthropicRoute,
		async createModel({ modelName, baseUrl, fetch }) {
			const { createAnthropic } = await import('@ai-sdk/anthropic');
			const provider = createAnthropic({
				baseURL: `${baseUrl}/${anthropicRoute}`,
				apiKey: 'proxy-managed',
				fetch,
			});
			return provider(modelName);
		},
	},
	openai: {
		route: openAiRoute,
		async createModel({ modelName, baseUrl, fetch }) {
			const { createOpenAI } = await import('@ai-sdk/openai');
			const provider = createOpenAI({
				baseURL: `${baseUrl}/${openAiRoute}`,
				apiKey: 'proxy-managed',
				fetch,
			});
			return provider(modelName);
		},
	},
};

export function isInstanceAiProxyProvider(value: string): value is InstanceAiProxyProvider {
	return value in INSTANCE_AI_PROXY_PROVIDERS;
}
