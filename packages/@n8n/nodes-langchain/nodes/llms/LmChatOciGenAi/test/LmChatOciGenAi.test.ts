import { OciGenAiGenericChat } from '@oracle/langchain-oci';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { ILoadOptionsFunctions, INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

const {
	createClient,
	getCachedCatalog,
	getConnectionHint,
	ociGenAiGenericChatConstructor,
	validateModelId,
	validateVendor,
} = vi.hoisted(() => ({
	createClient: vi.fn(),
	getCachedCatalog: vi.fn(),
	getConnectionHint: vi.fn(() => ({
		displayName: 'Connection hint',
		name: 'connectionHint',
		type: 'notice',
		default: '',
	})),
	validateModelId: vi.fn((value: string) => {
		if (value === 'invalid-model') throw new Error('Invalid OCI Generative AI model ID');
		return value;
	}),
	validateVendor: vi.fn((value: string) => {
		const normalized = value.trim().toLowerCase();
		if (normalized.includes('/') || normalized.includes(' ')) throw new Error('Invalid OCI vendor');
		return normalized || undefined;
	}),
	ociGenAiGenericChatConstructor: vi.fn().mockImplementation(function MockOciGenAiGenericChat() {}),
}));

vi.mock('@n8n/ai-utilities', () => ({
	getConnectionHintNoticeField: getConnectionHint,
}));

vi.mock('@oracle/langchain-oci', () => ({
	OciGenAiGenericChat: ociGenAiGenericChatConstructor,
}));

vi.mock('../../../../utils/ociGenAi', () => ({
	createOciGenAiClient: createClient,
	getCachedOciGenAiModelCatalogPage: getCachedCatalog,
	isOciGenAiCredentials: () => true,
	loadOciSdk: async () => ({
		genai: { models: { ModelCapability: { Chat: 'CHAT' } } },
		langchainOci: { OciGenAiGenericChat: ociGenAiGenericChatConstructor },
	}),
	validateOciCompartmentId: (value: string) => {
		if (!value.startsWith('ocid1.compartment.')) throw new Error('Invalid OCI Compartment OCID');
		return value;
	},
	validateOciModelId: validateModelId,
	validateOciVendor: validateVendor,
}));

import { LmChatOciGenAi } from '../LmChatOciGenAi.node';

const MockedOciGenAiGenericChat = vi.mocked(OciGenAiGenericChat);

describe('LmChatOciGenAi', () => {
	const mockNode: INode = {
		id: '1',
		name: 'OCI Generative AI Chat Model',
		type: '@n8n/n8n-nodes-langchain.lmChatOciGenAi',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	const createContext = (): Mocked<ISupplyDataFunctions> => {
		const context = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;
		context.getCredentials = vi.fn().mockResolvedValue({
			authentication: 'apiKey',
			regionId: 'us-phoenix-1',
		});
		context.getNode = vi.fn().mockReturnValue(mockNode);
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return 'meta.llama-3.3-70b-instruct';
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'onDemand';
			if (name === 'options') {
				return {
					temperature: 0.2,
					maxTokens: 512,
					topP: 0.8,
					topK: 40,
					seed: 42,
					timeout: 45000,
				};
			}
			return '';
		});
		return context;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		createClient.mockResolvedValue({ client: 'inference' });
	});

	it('does not run a credential test when the credential editor opens', () => {
		const node = new LmChatOciGenAi();

		expect(node.description.credentials).toEqual([{ name: 'ociGenAiApi', required: true }]);
		expect(node.methods).not.toHaveProperty('credentialTest');
		expect(getConnectionHint).toHaveBeenCalledWith(['ai_chain', 'ai_agent']);
	});

	it('describes the seed option as model-dependent reproducibility', () => {
		const node = new LmChatOciGenAi();
		const options = node.description.properties.find((property) => property.name === 'options');
		const seed = options?.options?.find((property) => property.name === 'seed');

		expect(seed).toMatchObject({
			description: 'Seed used for reproducible generation where supported by the selected model',
		});
	});

	it('uses the OpenAI chat timeout default and units', () => {
		const node = new LmChatOciGenAi();
		const options = node.description.properties.find((property) => property.name === 'options');
		const timeout = options?.options?.find((property) => property.name === 'timeout');

		expect(timeout).toMatchObject({
			default: 60000,
			typeOptions: { minValue: 1 },
			description:
				'Maximum amount of time an OCI request is allowed to take, including retries, in milliseconds',
		});
	});

	it('explains the provider model ID required for manual model entry', () => {
		const node = new LmChatOciGenAi();
		const model = node.description.properties.find((property) => property.name === 'model');
		const idMode = model?.modes?.find((mode) => mode.name === 'id');

		expect(model?.description).toBe(
			'Select a chat model from the OCI catalog, or enter its provider model ID, such as xai.grok-4.6. Do not enter the OCI model OCID.',
		);
		expect(idMode?.placeholder).toBe('xai.grok-4.6');
	});

	it('passes the selected timeout to the OCI client and creates a chat model with the selected options', async () => {
		const node = new LmChatOciGenAi();
		const context = createContext();

		const result = await node.supplyData.call(context, 0);

		// The OCI SDK applies request timeouts when its signed client is constructed.
		expect(createClient).toHaveBeenCalledWith(
			expect.objectContaining({ regionId: 'us-phoenix-1' }),
			expect.anything(),
			45000,
		);
		expect(MockedOciGenAiGenericChat).toHaveBeenCalledWith(
			expect.objectContaining({
				client: { client: 'inference' },
				compartmentId: 'ocid1.compartment.oc1..test',
				onDemandModelId: 'meta.llama-3.3-70b-instruct',
				maxRetries: 0,
				defaultRequestParams: { temperature: 0.2, maxTokens: 512, topP: 0.8, topK: 40, seed: 42 },
			}),
		);
		expect(result.response).toBeInstanceOf(MockedOciGenAiGenericChat);
	});

	it('uses chat defaults and omits optional sampling parameters when they are unset', async () => {
		const node = new LmChatOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return 'meta.llama-3.3-70b-instruct';
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'onDemand';
			if (name === 'options') return {};
			return '';
		});

		await node.supplyData.call(context, 0);
		expect(createClient).toHaveBeenCalledWith(
			expect.objectContaining({ regionId: 'us-phoenix-1' }),
			expect.anything(),
			60000,
		);

		expect(MockedOciGenAiGenericChat).toHaveBeenCalledWith(
			expect.objectContaining({
				defaultRequestParams: { temperature: 0.7, maxTokens: 1024, topP: 0.9 },
			}),
		);
	});

	it('supports a resource-locator model ID and preserves seed zero', async () => {
		const node = new LmChatOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return { mode: 'id', value: 'xai.grok-4.3' };
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'onDemand';
			if (name === 'options') return { topK: 0, seed: 0 };
			return '';
		});

		await node.supplyData.call(context, 0);

		expect(MockedOciGenAiGenericChat).toHaveBeenCalledWith(
			expect.objectContaining({
				onDemandModelId: 'xai.grok-4.3',
				defaultRequestParams: { temperature: 0.7, maxTokens: 1024, topP: 0.9, seed: 0 },
			}),
		);
	});

	it('uses a dedicated endpoint without retrieving or validating an on-demand model', async () => {
		const node = new LmChatOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') throw new Error('Model must not be read for dedicated serving');
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'dedicated';
			if (name === 'dedicatedEndpointId') {
				return 'ocid1.generativeaidededicatedaiendpoint.oc1..test';
			}
			if (name === 'options') return {};
			return '';
		});

		await node.supplyData.call(context, 0);

		expect(validateModelId).not.toHaveBeenCalled();
		expect(MockedOciGenAiGenericChat).toHaveBeenCalledWith(
			expect.objectContaining({
				dedicatedEndpointId: 'ocid1.generativeaidededicatedaiendpoint.oc1..test',
			}),
		);

		const modelProperty = node.description.properties.find((property) => property.name === 'model');
		expect(modelProperty?.displayOptions).toEqual({ show: { servingMode: ['onDemand'] } });
		const vendorProperty = node.description.properties.find(
			(property) => property.name === 'vendor',
		);
		expect(vendorProperty?.displayOptions).toEqual({ show: { servingMode: ['onDemand'] } });
	});

	it('requires a dedicated endpoint before creating an inference client', async () => {
		const node = new LmChatOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'dedicated';
			if (name === 'options') return {};
			return '';
		});

		await expect(node.supplyData.call(context, 0)).rejects.toThrow(
			'Dedicated Endpoint ID is required',
		);
		expect(createClient).not.toHaveBeenCalled();
	});

	it('rejects an invalid on-demand model before creating an inference client', async () => {
		const node = new LmChatOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return 'invalid-model';
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'onDemand';
			if (name === 'options') return {};
			return '';
		});

		await expect(node.supplyData.call(context, 0)).rejects.toThrow(
			'Invalid OCI Generative AI model ID',
		);
		expect(createClient).not.toHaveBeenCalled();
	});

	it('rejects an invalid compartment before creating an inference client', async () => {
		const node = new LmChatOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'compartmentId') return 'not-an-ocid';
			return name === 'options' ? {} : '';
		});

		await expect(node.supplyData.call(context, 0)).rejects.toThrow('Invalid OCI Compartment OCID');
		expect(createClient).not.toHaveBeenCalled();
	});

	it.each([
		[0, 'Timeout must be a positive integer in milliseconds.'],
		[1.5, 'Timeout must be a positive integer in milliseconds.'],
	])('rejects an invalid timeout of %s', async (timeout, errorMessage) => {
		const node = new LmChatOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'model') return 'meta.llama-3.3-70b-instruct';
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'servingMode') return 'onDemand';
			if (name === 'options') return { timeout };
			return '';
		});

		await expect(node.supplyData.call(context, 0)).rejects.toThrow(errorMessage);
		expect(createClient).not.toHaveBeenCalled();
	});

	it('filters cached chat models locally during model search', async () => {
		const node = new LmChatOciGenAi();
		const context = createContext();
		getCachedCatalog.mockResolvedValue({
			searchModels: [
				{ id: 'meta.llama-3.3-70b-instruct', name: 'Meta Llama', searchText: 'meta llama' },
				{ id: 'cohere.command-r', name: 'Cohere Command R', searchText: 'cohere command r' },
			],
		});

		const search = node.methods.listSearch?.searchChatModels;
		if (!search) throw new Error('Chat model search is not configured');
		const result = await search.call(context as unknown as ILoadOptionsFunctions, 'llama');

		expect(result.results).toEqual([{ name: 'Meta Llama', value: 'meta.llama-3.3-70b-instruct' }]);
	});

	it('uses an exact OCI catalog lookup for a typed provider model ID', async () => {
		const node = new LmChatOciGenAi();
		const context = createContext();
		getCachedCatalog.mockResolvedValue({
			searchModels: [{ id: 'xai.grok-4.6', name: 'xai.grok-4.6', searchText: 'xai.grok-4.6' }],
		});

		const search = node.methods.listSearch?.searchChatModels;
		if (!search) throw new Error('Chat model search is not configured');
		const result = await search.call(context as unknown as ILoadOptionsFunctions, 'xai.grok-4.6');

		expect(getCachedCatalog).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ modelId: 'xai.grok-4.6' }),
			expect.anything(),
		);
		expect(result.results).toEqual([{ name: 'xai.grok-4.6', value: 'xai.grok-4.6' }]);
	});

	it('returns the OCI pagination token from model search', async () => {
		const node = new LmChatOciGenAi();
		const context = createContext();
		getCachedCatalog.mockResolvedValue({ searchModels: [], nextPage: 'next-page' });

		const search = node.methods.listSearch?.searchChatModels;
		if (!search) throw new Error('Chat model search is not configured');
		const result = await search.call(
			context as unknown as ILoadOptionsFunctions,
			undefined,
			'current-page',
		);

		expect(getCachedCatalog).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ paginationToken: 'current-page' }),
			expect.anything(),
		);
		expect(result).toEqual({ results: [], paginationToken: 'next-page' });
	});

	it('returns guidance instead of loading models for an invalid compartment', async () => {
		const node = new LmChatOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi
			.fn()
			.mockImplementation((name: string) =>
				name === 'compartmentId' ? 'invalid-compartment' : '',
			);

		const search = node.methods.listSearch?.searchChatModels;
		if (!search) throw new Error('Chat model search is not configured');
		const result = await search.call(context as unknown as ILoadOptionsFunctions);

		expect(result.results).toEqual([
			{ name: 'Enter a Valid Compartment OCID to Load Models', value: '' },
		]);
		expect(getCachedCatalog).not.toHaveBeenCalled();
	});

	it('normalizes the vendor filter before searching chat models', async () => {
		const node = new LmChatOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'vendor') return ' OpenAI ';
			return '';
		});
		getCachedCatalog.mockResolvedValue({ searchModels: [] });

		const search = node.methods.listSearch?.searchChatModels;
		if (!search) throw new Error('Chat model search is not configured');
		await search.call(context as unknown as ILoadOptionsFunctions);

		expect(validateVendor).toHaveBeenCalledWith(' OpenAI ');
		expect(getCachedCatalog).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ vendor: 'openai' }),
			expect.anything(),
		);
	});

	it('rejects an invalid vendor filter before searching chat models', async () => {
		const node = new LmChatOciGenAi();
		const context = createContext();
		context.getNodeParameter = vi.fn().mockImplementation((name: string) => {
			if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
			if (name === 'vendor') return 'vendor/name';
			return '';
		});

		const search = node.methods.listSearch?.searchChatModels;
		if (!search) throw new Error('Chat model search is not configured');
		await expect(search.call(context as unknown as ILoadOptionsFunctions)).rejects.toThrow(
			'Invalid OCI vendor',
		);
		expect(getCachedCatalog).not.toHaveBeenCalled();
	});
});
