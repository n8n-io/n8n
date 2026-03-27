import type { LanguageModel } from 'ai';

import { createModel } from '../runtime/model-factory';

jest.mock('@ai-sdk/anthropic', () => ({
	createAnthropic: (opts?: { apiKey?: string; baseURL?: string }) => (model: string) => ({
		provider: 'anthropic',
		modelId: model,
		apiKey: opts?.apiKey,
		baseURL: opts?.baseURL,
		specificationVersion: 'v3',
	}),
}));

jest.mock('@ai-sdk/openai', () => ({
	createOpenAI: (opts?: { apiKey?: string; baseURL?: string }) => (model: string) => ({
		provider: 'openai',
		modelId: model,
		apiKey: opts?.apiKey,
		baseURL: opts?.baseURL,
		specificationVersion: 'v3',
	}),
}));

describe('createModel', () => {
	it('should accept a string config', () => {
		const model = createModel('anthropic/claude-sonnet-4-5') as unknown as Record<string, unknown>;
		expect(model.provider).toBe('anthropic');
		expect(model.modelId).toBe('claude-sonnet-4-5');
	});

	it('should accept an object config with url', () => {
		const model = createModel({
			id: 'openai/gpt-4o',
			apiKey: 'sk-test',
			url: 'https://custom.endpoint.com/v1',
		}) as unknown as Record<string, unknown>;
		expect(model.provider).toBe('openai');
		expect(model.modelId).toBe('gpt-4o');
		expect(model.apiKey).toBe('sk-test');
		expect(model.baseURL).toBe('https://custom.endpoint.com/v1');
	});

	it('should pass through a prebuilt LanguageModel', () => {
		const prebuilt = {
			doGenerate: jest.fn(),
			doStream: jest.fn(),
			specificationVersion: 'v2' as const,
			modelId: 'custom-model',
			provider: 'custom',
			defaultObjectGenerationMode: undefined,
		} as unknown as LanguageModel;

		const result = createModel(prebuilt);
		expect(result).toBe(prebuilt);
	});

	it('should handle model IDs with multiple slashes', () => {
		const model = createModel('openai/ft:gpt-4o:my-org:custom:abc123') as unknown as Record<
			string,
			unknown
		>;
		expect(model.provider).toBe('openai');
		expect(model.modelId).toBe('ft:gpt-4o:my-org:custom:abc123');
	});
});
