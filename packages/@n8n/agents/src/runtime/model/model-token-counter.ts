import {
	isLanguageModel,
	resolveModelFetch,
	resolveModelProviderConfig,
	type FetchFn,
	type ResolvedModelProviderConfig,
} from './model-factory';
import type { ModelConfig } from '../../types/sdk/agent';
import { estimateObservationTokens, type TokenCounter } from '../../types/sdk/observation-log';

const TOKEN_COUNT_TIMEOUT_MS = 10_000;

type NativeTokenCounter = (text: string, signal?: AbortSignal) => Promise<number>;

function normalizeAnthropicBaseURL(baseURL?: string): string | undefined {
	if (!baseURL) return undefined;

	const url = new URL(baseURL);
	const pathname = url.pathname.replace(/\/$/, '');
	if (pathname.endsWith('/v1')) {
		url.pathname = pathname.slice(0, -3) || '/';
	}
	return url.toString();
}

async function createNativeTokenCounter(
	config: ResolvedModelProviderConfig,
	fetch: FetchFn | undefined,
): Promise<NativeTokenCounter | undefined> {
	switch (config.provider) {
		case 'anthropic': {
			const { default: Anthropic } = await import('@anthropic-ai/sdk');
			const client = new Anthropic({
				apiKey: config.credentials.apiKey,
				baseURL: normalizeAnthropicBaseURL(config.credentials.baseURL),
				defaultHeaders: config.credentials.headers,
				fetch: resolveModelFetch(fetch),
				maxRetries: 0,
				timeout: TOKEN_COUNT_TIMEOUT_MS,
			});
			return async (text, signal) => {
				const response = await client.messages.countTokens(
					{
						model: config.modelName,
						messages: [{ role: 'user', content: text }],
					},
					{ signal },
				);
				return response.input_tokens;
			};
		}
		case 'openai': {
			const useResponses = config.credentials.apiStyle
				? config.credentials.apiStyle === 'responses'
				: !config.credentials.baseURL;
			if (!useResponses) return undefined;

			const { default: OpenAI } = await import('openai');
			const client = new OpenAI({
				apiKey: config.credentials.apiKey,
				baseURL: config.credentials.baseURL,
				defaultHeaders: config.credentials.headers,
				fetch: resolveModelFetch(fetch),
				maxRetries: 0,
				timeout: TOKEN_COUNT_TIMEOUT_MS,
			});
			return async (text, signal) => {
				const response = await client.responses.inputTokens.count(
					{
						model: config.modelName,
						input: text,
					},
					{ signal },
				);
				return response.input_tokens;
			};
		}
		default:
			return undefined;
	}
}

function validTokenCount(value: number): boolean {
	return Number.isInteger(value) && value >= 0;
}

export function createModelTokenCounter(model: ModelConfig, fetch?: FetchFn): TokenCounter {
	if (isLanguageModel(model)) return estimateObservationTokens;

	const config = resolveModelProviderConfig(model);
	let nativeCounter: Promise<NativeTokenCounter | undefined> | undefined;
	let nativeCounterDisabled = false;

	return async (text, signal) => {
		if (text.length === 0) return 0;
		if (nativeCounterDisabled) return await estimateObservationTokens(text);

		try {
			nativeCounter ??= createNativeTokenCounter(config, fetch);
			const countTokens = await nativeCounter;
			if (!countTokens) return await estimateObservationTokens(text);

			const count = await countTokens(text, signal);
			if (!validTokenCount(count)) throw new Error('Provider returned an invalid token count');
			return count;
		} catch {
			nativeCounterDisabled = true;
			return await estimateObservationTokens(text);
		}
	};
}
