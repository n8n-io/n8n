import type { LanguageModel } from 'ai';

import { createEmbeddingModel, createModel } from '../model/model-factory';

type ProviderOpts = {
	apiKey?: string;
	baseURL?: string;
	fetch?: typeof globalThis.fetch;
	headers?: Record<string, string>;
	includeUsage?: boolean;
	supportsStructuredOutputs?: boolean;
};

// All providers are mocked via vi.mock so require() inside the registry entries
// returns these stubs instead of the real packages.
vi.mock('@ai-sdk/anthropic', () => ({
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

vi.mock('@ai-sdk/openai', () => ({
	createOpenAI: (opts?: ProviderOpts) =>
		Object.assign(
			(model: string) => ({
				provider: 'openai',
				modelId: model,
				apiKey: opts?.apiKey,
				baseURL: opts?.baseURL,
				fetch: opts?.fetch,
				headers: opts?.headers,
				specificationVersion: 'v3',
			}),
			{
				chat: (model: string) => ({
					provider: 'openai',
					modelId: model,
					api: 'chat-completions',
					apiKey: opts?.apiKey,
					baseURL: opts?.baseURL,
					fetch: opts?.fetch,
					headers: opts?.headers,
					specificationVersion: 'v3',
				}),
				embeddingModel: (model: string) => ({
					provider: 'openai',
					modelId: model,
					apiKey: opts?.apiKey,
					baseURL: opts?.baseURL,
					specificationVersion: 'v2',
				}),
			},
		),
}));

vi.mock('@ai-sdk/google', () => ({
	createGoogle: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'google',
		modelId: model,
		apiKey: opts?.apiKey,
		baseURL: opts?.baseURL,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

vi.mock('@ai-sdk/xai', () => ({
	createXai: (opts?: ProviderOpts) => ({
		chat: (model: string) => ({
			provider: 'xai',
			modelId: model,
			apiKey: opts?.apiKey,
			fetch: opts?.fetch,
			specificationVersion: 'v3',
		}),
	}),
}));

vi.mock('@ai-sdk/groq', () => ({
	createGroq: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'groq',
		modelId: model,
		apiKey: opts?.apiKey,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

vi.mock('@ai-sdk/deepseek', () => ({
	createDeepSeek: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'deepseek',
		modelId: model,
		apiKey: opts?.apiKey,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

vi.mock('@ai-sdk/cohere', () => ({
	createCohere: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'cohere',
		modelId: model,
		apiKey: opts?.apiKey,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

vi.mock('@ai-sdk/mistral', () => ({
	createMistral: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'mistral',
		modelId: model,
		apiKey: opts?.apiKey,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

vi.mock('@ai-sdk/gateway', () => ({
	createGateway: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'vercel',
		modelId: model,
		apiKey: opts?.apiKey,
		baseURL: opts?.baseURL,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

vi.mock('@ai-sdk/azure', () => ({
	createAzure: (opts?: {
		apiKey?: string;
		resourceName?: string;
		apiVersion?: string;
		baseURL?: string;
		useDeploymentBasedUrls?: boolean;
	}) => ({
		// The factory calls `.chat(model)` (chat completions over deployment
		// URLs), not the default responses model. Surface that via the
		// returned object's `chat` builder and the captured options.
		chat: (model: string) => ({
			provider: 'azure-openai',
			modelId: model,
			apiKey: opts?.apiKey,
			resourceName: opts?.resourceName,
			apiVersion: opts?.apiVersion,
			baseURL: opts?.baseURL,
			useDeploymentBasedUrls: opts?.useDeploymentBasedUrls,
			builder: 'chat',
			specificationVersion: 'v3',
		}),
	}),
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
	createOpenRouter: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'openrouter',
		modelId: model,
		apiKey: opts?.apiKey,
		baseURL: opts?.baseURL,
		fetch: opts?.fetch,
		specificationVersion: 'v3',
	}),
}));

vi.mock('@ai-sdk/openai-compatible', () => ({
	createOpenAICompatible: (opts: ProviderOpts & { name: string }) => (model: string) => ({
		provider: opts.name,
		modelId: model,
		apiKey: opts.apiKey,
		baseURL: opts.baseURL,
		headers: opts.headers,
		fetch: opts.fetch,
		includeUsage: opts.includeUsage,
		supportsStructuredOutputs: opts.supportsStructuredOutputs,
		specificationVersion: 'v3',
	}),
}));

vi.mock('@ai-sdk/moonshotai', () => ({
	createMoonshotAI: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'moonshotai.chat',
		modelId: model,
		apiKey: opts?.apiKey,
		baseURL: opts?.baseURL,
		headers: opts?.headers,
		fetch: opts?.fetch,
		specificationVersion: 'v4',
	}),
}));

vi.mock('@ai-sdk/alibaba', () => ({
	createAlibaba: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'alibaba.chat',
		modelId: model,
		apiKey: opts?.apiKey,
		baseURL: opts?.baseURL,
		headers: opts?.headers,
		fetch: opts?.fetch,
		specificationVersion: 'v4',
	}),
}));

vi.mock('@ai-sdk/minimax', () => ({
	createMiniMax: (opts?: ProviderOpts) => (model: string) => ({
		provider: 'minimax.messages',
		modelId: model,
		apiKey: opts?.apiKey,
		baseURL: opts?.baseURL,
		headers: opts?.headers,
		fetch: opts?.fetch,
		specificationVersion: 'v4',
	}),
}));

vi.mock('@ai-sdk/amazon-bedrock', () => ({
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

vi.mock('@ai-sdk/google-vertex/anthropic', () => ({
	createVertexAnthropic:
		(opts?: {
			project?: string;
			location?: string;
			googleAuthOptions?: { credentials?: Record<string, unknown> };
			fetch?: typeof globalThis.fetch;
		}) =>
		(model: string) => ({
			provider: 'google-vertex-anthropic',
			modelId: model,
			project: opts?.project,
			location: opts?.location,
			googleAuthOptions: opts?.googleAuthOptions,
			fetch: opts?.fetch,
			specificationVersion: 'v3',
		}),
}));

const { mockProxyAgent } = vi.hoisted(() => ({ mockProxyAgent: vi.fn() }));
vi.mock('undici', () => ({
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
		const model = createModel('anthropic/claude-opus-5') as unknown as Record<string, unknown>;
		expect(model.provider).toBe('anthropic');
		expect(model.modelId).toBe('claude-opus-5');
	});

	it('should accept an object config with baseURL', () => {
		const model = createModel({
			id: 'openai/gpt-4o',
			apiKey: 'sk-test',
			baseURL: 'https://custom.endpoint.com/v1',
		}) as unknown as Record<string, unknown>;
		expect(model.provider).toBe('openai');
		expect(model.baseURL).toBe('https://custom.endpoint.com/v1');
		// Custom endpoints are OpenAI-COMPATIBLE servers: they speak
		// /chat/completions, not OpenAI's Responses API.
		expect(model.api).toBe('chat-completions');
	});

	it('uses the Responses API when a baseURL explicitly serves it', () => {
		// The n8n Connect gateway proxies real OpenAI, so it sets a baseURL but does
		// serve /responses. /chat/completions rejects reasoning effort once tools
		// are attached, so the heuristic has to be overridable.
		const model = createModel({
			id: 'openai/gpt-5-mini',
			apiKey: 'gateway-jwt',
			baseURL: 'https://gw.example/v1/gateway/openai/v1',
			apiStyle: 'responses',
		}) as unknown as Record<string, unknown>;
		expect(model.baseURL).toBe('https://gw.example/v1/gateway/openai/v1');
		expect(model.api).toBeUndefined();
	});

	it('accepts `url` as an alias for baseURL (host configs like Instance AI)', () => {
		const model = createModel({
			id: 'openai/mock-model',
			apiKey: 'sk-test',
			url: 'http://127.0.0.1:1234/v1',
		}) as unknown as Record<string, unknown>;
		expect(model.baseURL).toBe('http://127.0.0.1:1234/v1');
		expect(model.api).toBe('chat-completions');
	});

	it('treats an empty url as no custom endpoint (api-key-only host config)', () => {
		// Instance AI emits { id, url: '', apiKey } when only the API key is set;
		// the provider default endpoint and default model must be preserved.
		const model = createModel({
			id: 'anthropic/claude-sonnet-4-6',
			apiKey: 'sk-ant-test',
			url: '',
		}) as unknown as Record<string, unknown>;
		expect(model.baseURL).toBeUndefined();
		expect(model.apiKey).toBe('sk-ant-test');
	});

	it('keeps the default Responses API model for plain OpenAI (no baseURL)', () => {
		const model = createModel({
			id: 'openai/gpt-4o',
			apiKey: 'sk-test',
		}) as unknown as Record<string, unknown>;
		expect(model.api).toBeUndefined();
	});

	it('should pass through a prebuilt LanguageModel', () => {
		const prebuilt = {
			doGenerate: vi.fn(),
			doStream: vi.fn(),
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

		it('should create model for nvidia with SDK defaults for usage and structured outputs', () => {
			const model = createModel({
				id: 'nvidia/nvidia/llama-3.3-nemotron-super-49b-v1',
				apiKey: 'nv-test',
				baseURL: 'https://integrate.api.nvidia.com/v1',
			}) as unknown as Record<string, unknown>;
			expect(model.provider).toBe('nvidia');
			expect(model.modelId).toBe('nvidia/llama-3.3-nemotron-super-49b-v1');
			expect(model.apiKey).toBe('nv-test');
			expect(model.baseURL).toBe('https://integrate.api.nvidia.com/v1');
			expect(model.includeUsage).toBeUndefined();
			expect(model.supportsStructuredOutputs).toBeUndefined();
		});

		it('should create model for volcengine with default baseURL', () => {
			const model = createModel({
				id: 'volcengine/doubao-seed-2-1-pro-260628',
				apiKey: 'ark-test',
			}) as unknown as Record<string, unknown>;
			expect(model.provider).toBe('volcengine');
			expect(model.modelId).toBe('doubao-seed-2-1-pro-260628');
			expect(model.apiKey).toBe('ark-test');
			expect(model.baseURL).toBe('https://ark.cn-beijing.volces.com/api/v3');
		});

		it('should allow custom baseURL for volcengine', () => {
			const model = createModel({
				id: 'volcengine/doubao-seed-2-1-pro-260628',
				apiKey: 'ark-test',
				url: 'https://custom-ark.example.com/api/v3',
			}) as unknown as Record<string, unknown>;
			expect(model.provider).toBe('volcengine');
			expect(model.baseURL).toBe('https://custom-ark.example.com/api/v3');
		});

		it('should create model for moonshotai', () => {
			const model = createModel({
				id: 'moonshotai/kimi-k3',
				apiKey: 'ms-test',
			}) as unknown as Record<string, unknown>;
			expect(model.provider).toBe('moonshotai.chat');
			expect(model.modelId).toBe('kimi-k3');
			expect(model.apiKey).toBe('ms-test');
		});

		it('should pass a region-specific baseURL through for moonshotai', () => {
			const model = createModel({
				id: 'moonshotai/kimi-k3',
				apiKey: 'ms-test',
				url: 'https://api.moonshot.cn/v1',
			}) as unknown as Record<string, unknown>;
			expect(model.baseURL).toBe('https://api.moonshot.cn/v1');
		});

		it('should create model for alibaba', () => {
			const model = createModel({
				id: 'alibaba/qwen-plus',
				apiKey: 'ali-test',
			}) as unknown as Record<string, unknown>;
			expect(model.provider).toBe('alibaba.chat');
			expect(model.modelId).toBe('qwen-plus');
			expect(model.apiKey).toBe('ali-test');
		});

		it('should have undefined supportsStructuredOutputs for custom when unset', () => {
			const model = createModel({
				id: 'custom/Kimi-K3',
				apiKey: 'key',
				baseURL: 'https://example.com/v1',
			}) as unknown as Record<string, unknown>;
			expect(model.provider).toBe('custom');
			expect(model.supportsStructuredOutputs).toBe(undefined);
		});

		it('should forward supportsStructuredOutputs for custom when set', () => {
			const model = createModel({
				id: 'custom/Kimi-K3',
				apiKey: 'key',
				baseURL: 'https://example.com/v1',
				supportsStructuredOutputs: true,
			}) as unknown as Record<string, unknown>;
			expect(model.supportsStructuredOutputs).toBe(true);
		});
	});

	describe('anthropic baseURL normalization', () => {
		it('appends /v1 to a custom baseURL without a version segment (e.g. Azure AI Foundry)', () => {
			const model = createModel({
				id: 'anthropic/claude-sonnet-4-6',
				apiKey: 'sk-ant',
				baseURL: 'https://internal.example.services.ai.azure.com/anthropic/',
			}) as unknown as Record<string, unknown>;
			expect(model.baseURL).toBe('https://internal.example.services.ai.azure.com/anthropic/v1');
		});

		it('appends /v1 to a bare host baseURL', () => {
			const model = createModel({
				id: 'anthropic/claude-sonnet-4-6',
				apiKey: 'sk-ant',
				baseURL: 'https://api.anthropic.com',
			}) as unknown as Record<string, unknown>;
			expect(model.baseURL).toBe('https://api.anthropic.com/v1');
		});

		it('leaves a baseURL that already ends in /v1 unchanged', () => {
			const model = createModel({
				id: 'anthropic/claude-sonnet-4-6',
				apiKey: 'sk-ant',
				baseURL: 'https://proxy.example/api-proxy/anthropic/v1',
			}) as unknown as Record<string, unknown>;
			expect(model.baseURL).toBe('https://proxy.example/api-proxy/anthropic/v1');
		});

		it('leaves baseURL undefined when none is provided', () => {
			const model = createModel('anthropic/claude-sonnet-4-5') as unknown as Record<
				string,
				unknown
			>;
			expect(model.baseURL).toBeUndefined();
		});
	});

	describe('google baseURL normalization', () => {
		const baseURLFor = (creds: Record<string, unknown>) =>
			(
				createModel({
					id: 'google/gemini-3.7-flash',
					apiKey: 'g-test',
					...creds,
				}) as unknown as Record<string, unknown>
			).baseURL;

		// `googlePalmApi.host` defaults to the bare host, which drops the API
		// version from every request path — Google then 404s for any model.
		it('appends the API version to the credential host', () => {
			expect(baseURLFor({ url: 'https://generativelanguage.googleapis.com' })).toBe(
				'https://generativelanguage.googleapis.com/v1beta',
			);
		});

		it('leaves a baseURL that already targets the API version unchanged', () => {
			expect(baseURLFor({ url: 'https://generativelanguage.googleapis.com/v1beta' })).toBe(
				'https://generativelanguage.googleapis.com/v1beta',
			);
		});

		it('appends to a proxy host', () => {
			expect(baseURLFor({ url: 'https://proxy.example/gemini' })).toBe(
				'https://proxy.example/gemini/v1beta',
			);
		});

		it('leaves the SDK default in place when no host is configured', () => {
			expect(baseURLFor({})).toBeUndefined();
		});
	});

	describe('alibaba baseURL normalization', () => {
		const baseURLFor = (creds: Record<string, unknown>) =>
			(
				createModel({ id: 'alibaba/qwen-plus', apiKey: 'ali-test', ...creds }) as unknown as Record<
					string,
					unknown
				>
			).baseURL;

		it('appends the OpenAI-compatible path to a region base host', () => {
			expect(baseURLFor({ url: 'https://dashscope-intl.aliyuncs.com' })).toBe(
				'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
			);
		});

		it('appends it to a non-default region host too', () => {
			expect(baseURLFor({ url: 'https://cn-hongkong.dashscope.aliyuncs.com' })).toBe(
				'https://cn-hongkong.dashscope.aliyuncs.com/compatible-mode/v1',
			);
		});

		it('leaves a baseURL that already targets compatible mode unchanged', () => {
			expect(baseURLFor({ url: 'https://proxy.example/compatible-mode/v1' })).toBe(
				'https://proxy.example/compatible-mode/v1',
			);
		});

		it('leaves baseURL undefined when none is provided', () => {
			expect(baseURLFor({})).toBeUndefined();
		});
	});

	describe('minimax baseURL normalization', () => {
		const baseURLFor = (creds: Record<string, unknown>) =>
			(
				createModel({ id: 'minimax/MiniMax-M3', apiKey: 'mm-test', ...creds }) as unknown as Record<
					string,
					unknown
				>
			).baseURL;

		it('rewrites the OpenAI-compatible base to the Anthropic-compatible one', () => {
			expect(baseURLFor({ url: 'https://api.minimax.io/v1' })).toBe(
				'https://api.minimax.io/anthropic/v1',
			);
		});

		it('rewrites the China region base too', () => {
			expect(baseURLFor({ url: 'https://api.minimaxi.com/v1' })).toBe(
				'https://api.minimaxi.com/anthropic/v1',
			);
		});

		it('appends to a bare host', () => {
			expect(baseURLFor({ url: 'https://api.minimax.io' })).toBe(
				'https://api.minimax.io/anthropic/v1',
			);
		});

		it('leaves a baseURL that already targets the Anthropic base unchanged', () => {
			expect(baseURLFor({ url: 'https://proxy.example/minimax/anthropic/v1' })).toBe(
				'https://proxy.example/minimax/anthropic/v1',
			);
		});

		it('leaves baseURL undefined when none is provided', () => {
			expect(baseURLFor({})).toBeUndefined();
		});
	});

	describe('azure-openai', () => {
		it('should create a chat model with deployment-based URLs for a classic resource', () => {
			const model = createModel({
				id: 'azure-openai/gpt-4o',
				apiKey: 'az-key',
				resourceName: 'my-resource',
				apiVersion: '2024-02-01',
				endpointType: 'classic',
			}) as unknown as Record<string, unknown>;
			expect(model.provider).toBe('azure-openai');
			expect(model.modelId).toBe('gpt-4o');
			expect(model.apiKey).toBe('az-key');
			expect(model.resourceName).toBe('my-resource');
			expect(model.apiVersion).toBe('2024-02-01');
			// Classic Azure OpenAI must use chat completions over deployment-based
			// URLs so the credential's date-based apiVersion matches the endpoint
			// (mirrors the LangChain Azure node's `useResponsesApi: false`).
			expect(model.builder).toBe('chat');
			expect(model.useDeploymentBasedUrls).toBe(true);
		});

		it('should append /openai to a classic endpoint that lacks it', () => {
			const model = createModel({
				id: 'azure-openai/gpt-4o',
				apiKey: 'az-key',
				resourceName: 'my-resource',
				apiVersion: '2024-02-01',
				endpointType: 'classic',
				baseURL: 'https://my-resource.openai.azure.com',
			}) as unknown as Record<string, unknown>;
			expect(model.baseURL).toBe('https://my-resource.openai.azure.com/openai');
			expect(model.builder).toBe('chat');
			expect(model.useDeploymentBasedUrls).toBe(true);
		});

		it('should use the user-provided deploymentName as the deployment id for classic', () => {
			const model = createModel({
				id: 'azure-openai/gpt-4o',
				apiKey: 'az-key',
				resourceName: 'my-resource',
				apiVersion: '2024-02-01',
				endpointType: 'classic',
				deploymentName: 'my-gpt4o-deployment',
			}) as unknown as Record<string, unknown>;
			// The catalog model id is not the Azure deployment id; the factory
			// hands the user's deployment name to .chat(...).
			expect(model.modelId).toBe('my-gpt4o-deployment');
			expect(model.builder).toBe('chat');
			expect(model.useDeploymentBasedUrls).toBe(true);
		});

		it('should fall back to the catalog model id when classic has no deploymentName', () => {
			const model = createModel({
				id: 'azure-openai/gpt-4o',
				apiKey: 'az-key',
				resourceName: 'my-resource',
				apiVersion: '2024-02-01',
				endpointType: 'classic',
			}) as unknown as Record<string, unknown>;
			expect(model.modelId).toBe('gpt-4o');
			expect(model.builder).toBe('chat');
		});

		it('should drive a Foundry endpoint as OpenAI-compatible when endpointType is foundry', () => {
			const foundryURL = 'https://my-resource.services.ai.azure.com/openai/v1';
			const model = createModel({
				id: 'azure-openai/gpt-4o',
				apiKey: 'az-key',
				endpointType: 'foundry',
				baseURL: foundryURL,
			}) as unknown as Record<string, unknown>;
			// Routed through @ai-sdk/openai-compatible, which uses the base verbatim.
			expect(model.provider).toBe('azure-openai');
			expect(model.modelId).toBe('gpt-4o');
			expect(model.baseURL).toBe(foundryURL);
			expect(model.builder).toBeUndefined();
			expect(model.useDeploymentBasedUrls).toBeUndefined();
		});

		it('should treat a foundry endpoint without resourceName as valid', () => {
			expect(() =>
				createModel({
					id: 'azure-openai/gpt-4o',
					apiKey: 'az-key',
					endpointType: 'foundry',
					baseURL: 'https://my-resource.services.ai.azure.com/openai/v1',
				}),
			).not.toThrow();
		});

		it('should throw if a classic endpoint is missing resourceName', () => {
			expect(() =>
				createModel({
					id: 'azure-openai/gpt-4o',
					apiKey: 'az-key',
					endpointType: 'classic',
				}),
			).toThrow(/Invalid credentials for provider "azure-openai"[\s\S]*resourceName/);
		});

		it('should throw if resourceName is missing when endpointType is omitted', () => {
			expect(() =>
				createModel({
					id: 'azure-openai/gpt-4o',
					apiKey: 'az-key',
				}),
			).toThrow(/Invalid credentials for provider "azure-openai"[\s\S]*resourceName/);
		});

		it('should throw if a foundry endpoint is missing baseURL', () => {
			expect(() =>
				createModel({
					id: 'azure-openai/gpt-4o',
					apiKey: 'az-key',
					endpointType: 'foundry',
				}),
			).toThrow(/Invalid credentials for provider "azure-openai"[\s\S]*baseURL/);
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

	describe('google-vertex-anthropic', () => {
		it('should create model with project, location, and service-account JSON', () => {
			const model = createModel({
				id: 'google-vertex-anthropic/claude-opus-4-8',
				project: 'my-project',
				location: 'global',
				googleCredentials: JSON.stringify({
					client_email: 'svc@my-project.iam.gserviceaccount.com',
					private_key: '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n',
				}),
			}) as unknown as Record<string, unknown>;
			expect(model.provider).toBe('google-vertex-anthropic');
			expect(model.modelId).toBe('claude-opus-4-8');
			expect(model.project).toBe('my-project');
			expect(model.location).toBe('global');
			expect(model.googleAuthOptions).toEqual({
				credentials: {
					client_email: 'svc@my-project.iam.gserviceaccount.com',
					private_key: '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n',
				},
			});
		});

		it('should default location to global when omitted', () => {
			const model = createModel({
				id: 'google-vertex-anthropic/claude-opus-4-8',
				project: 'my-project',
			}) as unknown as Record<string, unknown>;
			expect(model.location).toBe('global');
			expect(model.googleAuthOptions).toBeUndefined();
		});

		it('should throw if project is missing', () => {
			expect(() =>
				createModel({
					id: 'google-vertex-anthropic/claude-opus-4-8',
					location: 'global',
				}),
			).toThrow(/Invalid credentials for provider "google-vertex-anthropic"/);
		});

		it('should throw if googleCredentials is not valid JSON', () => {
			expect(() =>
				createModel({
					id: 'google-vertex-anthropic/claude-opus-4-8',
					project: 'my-project',
					googleCredentials: 'not-json',
				}),
			).toThrow(/googleCredentials must be valid JSON/);
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

describe('createEmbeddingModel', () => {
	it('should accept a legacy api key string', () => {
		const model = createEmbeddingModel(
			'openai/text-embedding-3-small',
			'sk-test',
		) as unknown as Record<string, unknown>;

		expect(model.provider).toBe('openai');
		expect(model.modelId).toBe('text-embedding-3-small');
		expect(model.apiKey).toBe('sk-test');
	});

	it('should pass baseURL through to OpenAI-compatible embedding providers', () => {
		const model = createEmbeddingModel('openai/text-embedding-3-small', {
			apiKey: 'sk-test',
			baseURL: 'https://custom.example/v1',
		}) as unknown as Record<string, unknown>;

		expect(model.provider).toBe('openai');
		expect(model.modelId).toBe('text-embedding-3-small');
		expect(model.apiKey).toBe('sk-test');
		expect(model.baseURL).toBe('https://custom.example/v1');
	});
});
