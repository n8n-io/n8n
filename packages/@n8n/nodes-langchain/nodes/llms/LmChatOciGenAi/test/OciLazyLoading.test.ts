import type { ILoadOptionsFunctions, INode, ISupplyDataFunctions } from 'n8n-workflow';

const { runtimeImports, listModels } = vi.hoisted(() => ({
	runtimeImports: {
		common: 0,
		catalog: 0,
		inference: 0,
		langchain: 0,
	},
	listModels: vi.fn(),
}));

vi.mock('oci-common', () => {
	runtimeImports.common += 1;

	return {
		Region: {
			fromRegionId: (regionId: string) => ({
				regionId,
				realm: { secondLevelDomain: 'oraclecloud.com' },
			}),
		},
		MaxAttemptsTerminationStrategy: class {
			constructor(_maxAttempts: number) {}
		},
		SimpleAuthenticationDetailsProvider: class {
			constructor(..._args: unknown[]) {}
		},
	};
});

vi.mock('oci-generativeai', () => {
	runtimeImports.catalog += 1;

	return {
		models: { ModelCapability: { Chat: 'CHAT' } },
		GenerativeAiClient: class {
			listModels = listModels;
		},
	};
});

vi.mock('oci-generativeaiinference', () => {
	runtimeImports.inference += 1;

	return {
		GenerativeAiInferenceClient: class {},
	};
});

vi.mock('@oracle/langchain-oci', () => {
	runtimeImports.langchain += 1;

	return {
		OciGenAiGenericChat: class {
			constructor(..._args: unknown[]) {}
		},
	};
});

const node: INode = {
	id: '1',
	name: 'OCI Generative AI Chat Model',
	type: '@n8n/n8n-nodes-langchain.lmChatOciGenAi',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const credentials = {
	authentication: 'apiKey' as const,
	regionId: 'us-phoenix-1',
	tenancyId: 'ocid1.tenancy.oc1..test',
	userId: 'ocid1.user.oc1..test',
	fingerprint: 'test',
	privateKey: 'test-key',
};

function resetRuntimeImports(): void {
	runtimeImports.common = 0;
	runtimeImports.catalog = 0;
	runtimeImports.inference = 0;
	runtimeImports.langchain = 0;
	listModels.mockReset();
}

async function loadChatNode() {
	return await import('../LmChatOciGenAi.node.js');
}

describe.sequential('OCI runtime lazy loading', () => {
	beforeAll(() => {
		vi.resetModules();
		resetRuntimeImports();
	});

	it('does not load OCI runtime packages while node definitions are loaded', async () => {
		const [{ LmChatOciGenAi }, { EmbeddingsOciGenAi }] = await Promise.all([
			loadChatNode(),
			import('../../../embeddings/EmbeddingsOciGenAi/EmbeddingsOciGenAi.node.js'),
		]);

		expect(LmChatOciGenAi).toBeTypeOf('function');
		expect(EmbeddingsOciGenAi).toBeTypeOf('function');
		expect(runtimeImports).toEqual({ common: 0, catalog: 0, inference: 0, langchain: 0 });
	});

	it('loads all OCI runtime packages when supplying a model', async () => {
		const { LmChatOciGenAi } = await loadChatNode();
		const chatNode = new LmChatOciGenAi();
		const context = {
			getCredentials: async () => credentials,
			getNode: () => node,
			getNodeParameter: (name: string) => {
				if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
				if (name === 'servingMode') return 'onDemand';
				if (name === 'model') return 'xai.grok-4.6';
				if (name === 'options') return {};
				return '';
			},
			helpers: { getSecureEgressFilter: () => undefined },
		} as unknown as ISupplyDataFunctions;

		await chatNode.supplyData.call(context, 0);

		expect(runtimeImports.common).toBeGreaterThan(0);
		expect(runtimeImports.catalog).toBeGreaterThan(0);
		expect(runtimeImports.inference).toBeGreaterThan(0);
		expect(runtimeImports.langchain).toBeGreaterThan(0);
	});

	it('reuses the OCI runtime modules for model discovery', async () => {
		listModels.mockResolvedValue({
			modelCollection: { items: [{ id: 'xai.grok-4.6', displayName: 'xai.grok-4.6' }] },
		});
		const { LmChatOciGenAi } = await loadChatNode();
		const chatNode = new LmChatOciGenAi();
		const importsBeforeSearch = { ...runtimeImports };
		const context = {
			getNodeParameter: (name: string) => {
				if (name === 'compartmentId') return 'ocid1.compartment.oc1..test';
				if (name === 'vendor') return '';
				return '';
			},
			getCredentials: async () => credentials,
			getNode: () => node,
			helpers: { getSecureEgressFilter: () => undefined },
		} as unknown as ILoadOptionsFunctions;

		const result = await chatNode.methods.listSearch.searchChatModels.call(context);

		expect(result.results).toEqual([{ name: 'xai.grok-4.6', value: 'xai.grok-4.6' }]);
		expect(runtimeImports).toEqual(importsBeforeSearch);
	});

	it('retries OCI runtime loading after an import failure', async () => {
		vi.resetModules();
		let commonLoadAttempts = 0;

		vi.doMock('oci-common', () => {
			commonLoadAttempts += 1;
			if (commonLoadAttempts === 1) {
				throw new Error('OCI Common module unavailable');
			}

			return {};
		});
		vi.doMock('oci-generativeai', () => ({}));
		vi.doMock('oci-generativeaiinference', () => ({}));
		vi.doMock('@oracle/langchain-oci', () => ({}));

		const { loadOciSdk } = await import('../../../../utils/ociGenAi.js');

		await expect(loadOciSdk()).rejects.toThrow();
		await expect(loadOciSdk()).resolves.toEqual(
			expect.objectContaining({ common: {}, genai: {}, genaiInference: {}, langchainOci: {} }),
		);
		expect(commonLoadAttempts).toBe(2);
	});
});
