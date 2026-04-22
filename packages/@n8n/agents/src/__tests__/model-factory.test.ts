import type { LanguageModel } from 'ai';

import { createModel } from '../runtime/model-factory';

type ProviderOpts = {
	apiKey?: string;
	baseURL?: string;
	fetch?: typeof globalThis.fetch;
	headers?: Record<string, string>;
};

// All providers are mocked via jest.mock so require() inside the registry entries
// returns these stubs instead of the real packages.
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

jest.mock('@ai-sdk/google', () => ({
	createGoogleGenerativeAI: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'google',
		modelId: model,
		apiKey: opts?.apiKey,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

jest.mock('@ai-sdk/xai', () => ({
	createXai: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'xai',
		modelId: model,
		apiKey: opts?.apiKey,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

jest.mock('@ai-sdk/groq', () => ({
	createGroq: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'groq',
		modelId: model,
		apiKey: opts?.apiKey,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

jest.mock('@ai-sdk/deepseek', () => ({
	createDeepSeek: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'deepseek',
		modelId: model,
		apiKey: opts?.apiKey,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

jest.mock('@ai-sdk/cohere', () => ({
	createCohere: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'cohere',
		modelId: model,
		apiKey: opts?.apiKey,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

jest.mock('@ai-sdk/mistral', () => ({
	createMistral: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'mistral',
		modelId: model,
		apiKey: opts?.apiKey,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

jest.mock('@ai-sdk/gateway', () => ({
	createGateway: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'vercel',
		modelId: model,
		apiKey: opts?.apiKey,
		baseURL: opts?.baseURL,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

jest.mock('@ai-sdk/azure', () => ({
	createAzure:
		(opts?: { apiKey?: string; resourceName?: string; apiVersion?: string; baseURL?: string }) =>
		(model: string) => ({
			provider: 'azure-openai',
			modelId: model,
			apiKey: opts?.apiKey,
			resourceName: opts?.resourceName,
			apiVersion: opts?.apiVersion,
			specificationVersion: 'v3',
		}),
}));

jest.mock('@openrouter/ai-sdk-provider', () => ({
	createOpenRouter: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'openrouter',
		modelId: model,
		apiKey: opts?.apiKey,
		baseURL: opts?.baseURL,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

jest.mock('@ai-sdk/amazon-bedrock', () => ({
	createAmazonBedrock:
		(opts?: {
			region?: string;
			accessKeyId?: string;
			secretAccessKey?: string;
			sessionToken?: string;
		}) =>
		(model: string) => ({
			provider: 'aws-bedrock',
			modelId: model,
			region: opts?.region,
			accessKeyId: opts?.accessKeyId,
			secretAccessKey: opts?.secretAccessKey,
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

	it('should accept an object config with baseURL', () => {
		const model = createModel({
			id: 'openai/gpt-4o',
			apiKey: 'sk-test',
			baseURL: 'https://custom.endpoint.com/v1',
		}) as unknown as Record<string, unknown>;
		expect(model.provider).toBe('openai');
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

	describe('standard providers', () => {
		it.each(['groq', 'deepseek', 'cohere', 'mistral', 'google', 'xai'])(
			'should create model for %s',
			(provider) => {
				const model = createModel({
					id: `${provider}/some-model`,
					apiKey: 'test-key',
				}) as unknown as Record<string, unknown>;
				expect(model.provider).toBe(provider);
				expect(model.modelId).toBe('some-model');
				expect(model.apiKey).toBe('test-key');
			},
		);

		it('should create model for vercel gateway', () => {
			const model = createModel({
				id: 'vercel/gpt-4o',
				apiKey: 'vk-test',
			}) as unknown as Record<string, unknown>;
			expect(model.provider).toBe('vercel');
			expect(model.modelId).toBe('gpt-4o');
		});

		it('should create model for openrouter', () => {
			const model = createModel({
				id: 'openrouter/openai/gpt-4o',
				apiKey: 'or-test',
			}) as unknown as Record<string, unknown>;
			expect(model.provider).toBe('openrouter');
			expect(model.modelId).toBe('openai/gpt-4o');
			expect(model.apiKey).toBe('or-test');
		});
	});

	describe('azure-openai', () => {
		it('should create model with resourceName', () => {
			const model = createModel({
				id: 'azure-openai/gpt-4o',
				apiKey: 'az-key',
				resourceName: 'my-resource',
				apiVersion: '2024-02-01',
			}) as unknown as Record<string, unknown>;
			expect(model.provider).toBe('azure-openai');
			expect(model.modelId).toBe('gpt-4o');
			expect(model.apiKey).toBe('az-key');
			expect(model.resourceName).toBe('my-resource');
			expect(model.apiVersion).toBe('2024-02-01');
		});

		it('should throw if resourceName is missing', () => {
			expect(() => createModel({ id: 'azure-openai/gpt-4o', apiKey: 'az-key' })).toThrow(
				/Invalid credentials for provider "azure-openai"/,
			);
		});
	});

	describe('aws-bedrock', () => {
		it('should create model with AWS credentials', () => {
			const model = createModel({
				id: 'aws-bedrock/amazon.titan-text-lite-v1',
				region: 'us-east-1',
				accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
				secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
			}) as unknown as Record<string, unknown>;
			expect(model.provider).toBe('aws-bedrock');
			expect(model.modelId).toBe('amazon.titan-text-lite-v1');
			expect(model.region).toBe('us-east-1');
			expect(model.accessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
		});

		it('should throw if region is missing', () => {
			expect(() =>
				createModel({
					id: 'aws-bedrock/amazon.titan-text-lite-v1',
					accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					secretAccessKey: 'secret',
				}),
			).toThrow(/Invalid credentials for provider "aws-bedrock"/);
		});

		it('should throw if accessKeyId is missing', () => {
			expect(() =>
				createModel({
					id: 'aws-bedrock/amazon.titan-text-lite-v1',
					region: 'us-east-1',
					secretAccessKey: 'secret',
				}),
			).toThrow(/Invalid credentials for provider "aws-bedrock"/);
		});
	});

	describe('unsupported provider', () => {
		it('should throw for ollama', () => {
			expect(() => createModel('ollama/llama3')).toThrow(/Unsupported provider: "ollama"/);
		});

		it('should include supported providers in the error message', () => {
			expect(() => createModel('unknown-provider/some-model')).toThrow(/Supported providers:/);
		});

		it('should throw when no model ID is provided', () => {
			expect(() => createModel('')).toThrow(/Model ID is required/);
		});

		it('should throw when model has no slash', () => {
			expect(() => createModel('anthropic-only')).toThrow(/expected "provider\/model-name"/);
		});
	});
});
