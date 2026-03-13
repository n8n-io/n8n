/* eslint-disable @typescript-eslint/no-require-imports */
import type { LanguageModel } from 'ai';

type CreateProviderFn = (opts?: { apiKey?: string }) => (model: string) => LanguageModel;

/**
 * Provider packages are loaded dynamically via require() so only the
 * provider needed at runtime must be installed.
 */
export function createModel(config: string | { id: string; apiKey?: string }): LanguageModel {
	const modelId = typeof config === 'string' ? config : config.id;
	const apiKey = typeof config === 'string' ? undefined : config.apiKey;

	const [provider, ...rest] = modelId.split('/');
	const modelName = rest.join('/');

	switch (provider) {
		case 'anthropic': {
			const { createAnthropic } = require('@ai-sdk/anthropic') as {
				createAnthropic: CreateProviderFn;
			};
			return createAnthropic({ apiKey })(modelName);
		}
		case 'openai': {
			const { createOpenAI } = require('@ai-sdk/openai') as {
				createOpenAI: CreateProviderFn;
			};
			return createOpenAI({ apiKey })(modelName);
		}
		case 'google': {
			const { createGoogleGenerativeAI } = require('@ai-sdk/google') as {
				createGoogleGenerativeAI: CreateProviderFn;
			};
			return createGoogleGenerativeAI({ apiKey })(modelName);
		}
		case 'xai': {
			const { createXai } = require('@ai-sdk/xai') as {
				createXai: CreateProviderFn;
			};
			return createXai({ apiKey })(modelName);
		}
		default:
			throw new Error(
				`Unsupported provider: "${provider}". Supported: anthropic, openai, google, xai`,
			);
	}
}
