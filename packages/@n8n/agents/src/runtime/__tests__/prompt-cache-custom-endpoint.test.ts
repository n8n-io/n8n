import { Agent } from '../../sdk/agent';
import type { StreamChunk } from '../../types';
import {
	PROMPT_CACHE_PARAMS_ERROR_MESSAGE,
	PromptCacheParamsError,
} from '../model/prompt-cache-params-error';

const LITELLM_REJECTION = {
	error: {
		message:
			"litellm.UnsupportedParamsError: bedrock does not support parameters: ['prompt_cache_key'], for model=claude-sonnet. To drop these, set `litellm.drop_params=True`.",
		type: null,
		param: null,
		code: '400',
	},
};

const ENDPOINTS = {
	custom: { baseURL: 'http://litellm.local/v1', host: 'http://litellm.local' },
	official: { baseURL: undefined, host: 'https://api.openai.com' },
};

function makeAgent(
	endpoint: keyof typeof ENDPOINTS,
	promptCaching: boolean,
	reply: () => Response = () => Response.json(LITELLM_REJECTION, { status: 400 }),
) {
	const bodies: Array<Record<string, unknown>> = [];
	const { baseURL, host } = ENDPOINTS[endpoint];
	const fakeFetch: typeof fetch = async (input, init) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		if (url.startsWith(host) && typeof init?.body === 'string') {
			bodies.push(JSON.parse(init.body) as Record<string, unknown>);
			return reply();
		}
		return new Response('{}', { status: 404 });
	};

	const agent = new Agent('litellm-agent')
		.model({ id: 'openai/claude-sonnet', apiKey: 'sk-test', ...(baseURL && { baseURL }) })
		.instructions('You are helpful.')
		.promptCaching({ enabled: promptCaching })
		.modelFetch(fakeFetch);
	return { agent, bodies };
}

describe('OpenAI prompt cache fields', () => {
	it.each(['custom', 'official'] as const)(
		'sends no prompt cache fields to the %s endpoint when prompt caching is off',
		async (endpoint) => {
			const { agent, bodies } = makeAgent(endpoint, false);

			await agent.generate('hi');

			expect(bodies.length).toBeGreaterThan(0);
			for (const body of bodies) {
				expect(body).not.toHaveProperty('prompt_cache_key');
				expect(body).not.toHaveProperty('prompt_cache_retention');
			}
		},
	);

	it.each(['custom', 'official'] as const)(
		'sends the prompt cache fields to the %s endpoint when prompt caching is on',
		async (endpoint) => {
			const { agent, bodies } = makeAgent(endpoint, true);

			await agent.generate('hi');

			expect(bodies[0]).toHaveProperty('prompt_cache_key');
			expect(bodies[0]).toHaveProperty('prompt_cache_retention', '24h');
		},
	);

	it('maps a LiteLLM rejection of the cache fields to a readable error (generate)', async () => {
		const { agent } = makeAgent('custom', true);

		const result = await agent.generate('hi');

		expect(result.finishReason).toBe('error');
		expect(result.error).toBeInstanceOf(PromptCacheParamsError);
		expect((result.error as Error).message).toBe(PROMPT_CACHE_PARAMS_ERROR_MESSAGE);
		expect(String((result.error as Error).cause)).toContain('bedrock does not support parameters');
	});

	it('maps a LiteLLM rejection of the cache fields to a readable error (stream)', async () => {
		const { agent } = makeAgent('custom', true);

		const result = await agent.stream('hi');
		const errors: unknown[] = [];
		const reader = result.stream.getReader();
		for (let next = await reader.read(); !next.done; next = await reader.read()) {
			const chunk: StreamChunk = next.value;
			if (chunk.type === 'error') errors.push(chunk.error);
		}

		expect(errors.length).toBeGreaterThan(0);
		for (const error of errors) expect(error).toBeInstanceOf(PromptCacheParamsError);
	});
});
