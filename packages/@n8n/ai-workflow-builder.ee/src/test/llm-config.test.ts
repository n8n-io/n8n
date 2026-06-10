import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';

import { createBuilderModel } from '@/llm-config';

describe('createBuilderModel', () => {
	it('builds an Anthropic model for provider "anthropic"', async () => {
		const model = await createBuilderModel({ provider: 'anthropic', apiKey: 'sk-test' });
		expect(model).toBeInstanceOf(ChatAnthropic);
		expect(model._llmType()).toBe('anthropic');
	});

	it('builds an OpenAI model for provider "openai"', async () => {
		const model = await createBuilderModel({ provider: 'openai', apiKey: 'sk-test' });
		expect(model).toBeInstanceOf(ChatOpenAI);
		expect(model._llmType()).toBe('openai');
	});

	it('builds a Gemini model (via the OpenAI-compatible client) for provider "google"', async () => {
		const model = await createBuilderModel({ provider: 'google', apiKey: 'sk-test' });
		expect(model).toBeInstanceOf(ChatOpenAI);
		const baseURL = (model as ChatOpenAI).clientConfig?.baseURL;
		expect(baseURL).toContain('generativelanguage.googleapis.com');
	});

	it('uses sensible per-provider default models', async () => {
		const openai = (await createBuilderModel({ provider: 'openai', apiKey: 'k' })) as ChatOpenAI;
		const anthropic = (await createBuilderModel({
			provider: 'anthropic',
			apiKey: 'k',
		})) as ChatAnthropic;
		expect(openai.model).toContain('gpt');
		expect(anthropic.model).toContain('claude');
	});

	it('respects an explicit model name override', async () => {
		const model = (await createBuilderModel({
			provider: 'openai',
			apiKey: 'k',
			model: 'gpt-4o-mini',
		})) as ChatOpenAI;
		expect(model.model).toBe('gpt-4o-mini');
	});

	it('respects a custom base URL', async () => {
		const model = (await createBuilderModel({
			provider: 'openai',
			apiKey: 'k',
			baseUrl: 'https://my-gateway.example.com/v1',
		})) as ChatOpenAI;
		expect(model.clientConfig?.baseURL).toBe('https://my-gateway.example.com/v1');
	});
});
