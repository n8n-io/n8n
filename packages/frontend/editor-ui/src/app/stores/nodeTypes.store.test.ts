import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import * as nodeTypesApi from '@n8n/rest-api-client/api/nodeTypes';
import { LOCAL_STORAGE_DATA_WORKER } from '@/app/constants/localStorage';

const mocks = vi.hoisted(() => ({
	rootStore: {
		baseUrl: 'http://localhost:5678/',
		restApiContext: { baseUrl: 'http://localhost:5678', pushRef: 'test' },
		defaultLocale: 'en',
	},
	loadNodeTypes: vi.fn(),
	getAllNodeTypes: vi.fn(),
	getNodeType: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => mocks.rootStore),
}));

vi.mock('@/app/workers', () => ({
	loadNodeTypes: mocks.loadNodeTypes,
	getAllNodeTypes: mocks.getAllNodeTypes,
	getNodeType: mocks.getNodeType,
}));

vi.mock('@n8n/rest-api-client/api/nodeTypes');

function makeNodeType(
	overrides: Partial<INodeTypeDescription> & Pick<INodeTypeDescription, 'name' | 'outputs'>,
): INodeTypeDescription {
	return {
		displayName: overrides.name,
		group: ['transform'],
		description: '',
		version: 1,
		defaults: {},
		inputs: ['main'],
		properties: [],
		...overrides,
	} as INodeTypeDescription;
}

describe('useNodeTypesStore', () => {
	let store: ReturnType<typeof useNodeTypesStore>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: true }));
		store = useNodeTypesStore();
	});

	describe('isModelNode', () => {
		it('should return true for a node that outputs AiLanguageModel', () => {
			const nodeType = makeNodeType({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
				outputs: [NodeConnectionTypes.AiLanguageModel],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isModelNode(nodeType.name)).toBe(true);
		});

		it('should return true when outputs contain object format with AiLanguageModel type', () => {
			const nodeType = makeNodeType({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				outputs: [{ type: NodeConnectionTypes.AiLanguageModel, displayName: 'Model' }],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isModelNode(nodeType.name)).toBe(true);
		});

		it('should return false for a node that outputs Main', () => {
			const nodeType = makeNodeType({
				name: 'n8n-nodes-base.httpRequest',
				outputs: [NodeConnectionTypes.Main],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isModelNode(nodeType.name)).toBe(false);
		});

		it('should return false for a tool node', () => {
			const nodeType = makeNodeType({
				name: '@n8n/n8n-nodes-langchain.toolCalculator',
				outputs: [NodeConnectionTypes.AiTool],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isModelNode(nodeType.name)).toBe(false);
		});

		it('should return false for an unknown node type', () => {
			expect(store.isModelNode('nonexistent.node')).toBe(false);
		});
	});

	describe('isToolNode', () => {
		it('should return true for a node that outputs AiTool', () => {
			const nodeType = makeNodeType({
				name: '@n8n/n8n-nodes-langchain.toolCalculator',
				outputs: [NodeConnectionTypes.AiTool],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isToolNode(nodeType.name)).toBe(true);
		});

		it('should return false for a model node', () => {
			const nodeType = makeNodeType({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
				outputs: [NodeConnectionTypes.AiLanguageModel],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isToolNode(nodeType.name)).toBe(false);
		});

		it('should return false for a regular main node', () => {
			const nodeType = makeNodeType({
				name: 'n8n-nodes-base.httpRequest',
				outputs: [NodeConnectionTypes.Main],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isToolNode(nodeType.name)).toBe(false);
		});

		it('should return false for an unknown node type', () => {
			expect(store.isToolNode('nonexistent.node')).toBe(false);
		});
	});

	describe('getNodeTypes', () => {
		const restNode = makeNodeType({
			name: 'n8n-nodes-base.restNode',
			outputs: [NodeConnectionTypes.Main],
		});
		const dbNode = makeNodeType({
			name: 'n8n-nodes-base.dbNode',
			outputs: [NodeConnectionTypes.Main],
		});

		beforeEach(() => {
			setActivePinia(createTestingPinia({ stubActions: false }));
			vi.clearAllMocks();
			window.localStorage.clear();
			mocks.rootStore.defaultLocale = 'en';
			vi.mocked(nodeTypesApi.getNodeTypes).mockResolvedValue([restNode]);
			mocks.loadNodeTypes.mockResolvedValue(undefined);
			mocks.getAllNodeTypes.mockResolvedValue([dbNode]);
		});

		it('should load node types from REST when the data worker is disabled', async () => {
			const store = useNodeTypesStore();

			await store.getNodeTypes();

			expect(nodeTypesApi.getNodeTypes).toHaveBeenCalledWith(mocks.rootStore.baseUrl);
			expect(mocks.getAllNodeTypes).not.toHaveBeenCalled();
			expect(store.nodeTypes[restNode.name]).toBeDefined();
		});

		it('should sync and read from the local database when the data worker is enabled', async () => {
			window.localStorage.setItem(LOCAL_STORAGE_DATA_WORKER, 'true');
			const store = useNodeTypesStore();

			await store.getNodeTypes();

			expect(mocks.loadNodeTypes).toHaveBeenCalledWith(mocks.rootStore.baseUrl);
			expect(mocks.getAllNodeTypes).toHaveBeenCalled();
			expect(nodeTypesApi.getNodeTypes).not.toHaveBeenCalled();
			expect(store.nodeTypes[dbNode.name]).toBeDefined();
		});

		it('should fall back to REST when the local database is empty', async () => {
			window.localStorage.setItem(LOCAL_STORAGE_DATA_WORKER, 'true');
			mocks.getAllNodeTypes.mockResolvedValue([]);
			const store = useNodeTypesStore();

			await store.getNodeTypes();

			expect(nodeTypesApi.getNodeTypes).toHaveBeenCalledWith(mocks.rootStore.baseUrl);
			expect(store.nodeTypes[restNode.name]).toBeDefined();
		});

		it('should fall back to REST when the local database read throws', async () => {
			window.localStorage.setItem(LOCAL_STORAGE_DATA_WORKER, 'true');
			mocks.loadNodeTypes.mockRejectedValue(new Error('worker unavailable'));
			const store = useNodeTypesStore();

			await store.getNodeTypes();

			expect(nodeTypesApi.getNodeTypes).toHaveBeenCalledWith(mocks.rootStore.baseUrl);
			expect(store.nodeTypes[restNode.name]).toBeDefined();
		});
	});

	describe('getNodesInformation', () => {
		const nodeInfo = { name: 'n8n-nodes-base.set', version: 1 };
		const otherInfo = { name: 'n8n-nodes-base.if', version: 1 };
		const dbNode = makeNodeType({ name: nodeInfo.name, outputs: [NodeConnectionTypes.Main] });
		const restNode = makeNodeType({ name: otherInfo.name, outputs: [NodeConnectionTypes.Main] });

		beforeEach(() => {
			setActivePinia(createTestingPinia({ stubActions: false }));
			vi.clearAllMocks();
			window.localStorage.clear();
			mocks.rootStore.defaultLocale = 'en';
			vi.mocked(nodeTypesApi.getNodesInformation).mockResolvedValue([restNode]);
			mocks.getNodeType.mockResolvedValue(dbNode);
		});

		it('should read from the local database for the English locale', async () => {
			window.localStorage.setItem(LOCAL_STORAGE_DATA_WORKER, 'true');
			const store = useNodeTypesStore();

			const result = await store.getNodesInformation([nodeInfo]);

			expect(mocks.getNodeType).toHaveBeenCalledWith(nodeInfo.name, nodeInfo.version);
			expect(nodeTypesApi.getNodesInformation).not.toHaveBeenCalled();
			expect(result).toEqual([dbNode]);
		});

		it('should use REST for non-English locales', async () => {
			window.localStorage.setItem(LOCAL_STORAGE_DATA_WORKER, 'true');
			mocks.rootStore.defaultLocale = 'de';
			const store = useNodeTypesStore();

			await store.getNodesInformation([nodeInfo]);

			expect(mocks.getNodeType).not.toHaveBeenCalled();
			expect(nodeTypesApi.getNodesInformation).toHaveBeenCalledWith(
				mocks.rootStore.restApiContext,
				[nodeInfo],
			);
		});

		it('should fetch nodes missing from the local database over REST', async () => {
			window.localStorage.setItem(LOCAL_STORAGE_DATA_WORKER, 'true');
			mocks.getNodeType.mockImplementation(async (name: string) =>
				name === nodeInfo.name ? dbNode : null,
			);
			const store = useNodeTypesStore();

			const result = await store.getNodesInformation([nodeInfo, otherInfo]);

			expect(nodeTypesApi.getNodesInformation).toHaveBeenCalledWith(
				mocks.rootStore.restApiContext,
				[otherInfo],
			);
			expect(result).toEqual([dbNode, restNode]);
		});

		it('should use REST when the data worker is disabled', async () => {
			const store = useNodeTypesStore();

			await store.getNodesInformation([nodeInfo]);

			expect(mocks.getNodeType).not.toHaveBeenCalled();
			expect(nodeTypesApi.getNodesInformation).toHaveBeenCalledWith(
				mocks.rootStore.restApiContext,
				[nodeInfo],
			);
		});
	});
});
