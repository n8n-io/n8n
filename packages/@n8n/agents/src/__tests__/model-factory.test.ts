import type { LanguageModel } from 'ai';

import { createModel } from '../runtime/model-factory';

type ProviderOpts = {
	apiKey?: string;
	baseURL?: string;
	fetch?: typeof globalThis.fetch;
	headers?: Record<string, string>;
};

jest.mock('@ai-sdk/anthropic', () => ({
	createAnthropic: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'anthropic',
		modelId: model,
		apiKey: opts?.apiKey,
		baseURL: opts?.baseURL,
		fetch: opts?.fetch,
		headers: opts?.headers,
		specificationVersion: 'v3',
	}),
}));

jest.mock('@ai-sdk/openai', () => ({
	createOpenAI: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'openai',
		modelId: model,
		apiKey: opts?.apiKey,
		baseURL: opts?.baseURL,
		fetch: opts?.fetch,
		headers: opts?.headers,
		specificationVersion: 'v3',
	}),
}));

const mockProxyAgent = jest.fn();
jest.mock('undici', () => ({
	ProxyAgent: mockProxyAgent,
}));

describe('createModel', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.HTTPS_PROXY;
		delete process.env.HTTP_PROXY;
		mockProxyAgent.mockClear();
	});

	afterAll(() => {
		process.env = originalEnv;
	});

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

	it('should not pass fetch when no proxy env vars are set', () => {
		const model = createModel('anthropic/claude-sonnet-4-5') as unknown as Record<string, unknown>;
		expect(model.fetch).toBeUndefined();
	});

	it('should pass proxy-aware fetch when HTTPS_PROXY is set', () => {
		process.env.HTTPS_PROXY = 'http://proxy:8080';
		const model = createModel('anthropic/claude-sonnet-4-5') as unknown as Record<string, unknown>;
		expect(model.fetch).toBeInstanceOf(Function);
		expect(mockProxyAgent).toHaveBeenCalledWith('http://proxy:8080');
	});

	it('should pass proxy-aware fetch when HTTP_PROXY is set', () => {
		process.env.HTTP_PROXY = 'http://proxy:9090';
		const model = createModel('openai/gpt-4o') as unknown as Record<string, unknown>;
		expect(model.fetch).toBeInstanceOf(Function);
		expect(mockProxyAgent).toHaveBeenCalledWith('http://proxy:9090');
	});

	it('should forward custom headers to the provider factory', () => {
		const model = createModel({
			id: 'anthropic/claude-sonnet-4-5',
			apiKey: 'sk-test',
			headers: { 'x-proxy-auth': 'Bearer abc', 'anthropic-beta': 'tools-2024' },
		}) as unknown as Record<string, unknown>;
		expect(model.headers).toEqual({
			'x-proxy-auth': 'Bearer abc',
			'anthropic-beta': 'tools-2024',
		});
	});

	it('should prefer HTTPS_PROXY over HTTP_PROXY', () => {
		process.env.HTTPS_PROXY = 'http://https-proxy:8080';
		process.env.HTTP_PROXY = 'http://http-proxy:9090';
		createModel('anthropic/claude-sonnet-4-5');
		expect(mockProxyAgent).toHaveBeenCalledWith('http://https-proxy:8080');
	});
});
