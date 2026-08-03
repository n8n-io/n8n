import { ref } from 'vue';
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

const inlineAgentsEnabled = ref(true);
vi.mock('@/experiments/inlineAgents/useInlineAgentsExperiment', () => ({
	useInlineAgentsExperiment: () => ({ isFeatureEnabled: inlineAgentsEnabled }),
}));

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
		inlineAgentsEnabled.value = true;
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

	describe('setNodeTypes / removeNodeTypes', () => {
		const nodeType = makeNodeType({
			name: 'n8n-nodes-base.testNode',
			outputs: [NodeConnectionTypes.Main],
		});

		beforeEach(() => {
			setActivePinia(createTestingPinia({ stubActions: false }));
		});

		it('should update computed dependents when the catalog is replaced', () => {
			const store = useNodeTypesStore();

			// Read before writing so the computeds cache and track the catalog ref
			expect(store.allNodeTypes).toEqual([]);
			expect(store.getNodeType(nodeType.name)).toBeNull();

			store.setNodeTypes([nodeType]);

			expect(store.allNodeTypes).toEqual([nodeType]);
			expect(store.getNodeType(nodeType.name)).toEqual(nodeType);

			store.removeNodeTypes([nodeType]);

			expect(store.allNodeTypes).toEqual([]);
			expect(store.getNodeType(nodeType.name)).toBeNull();
		});
	});

	describe('AI Agent node name with the inline agents flag', () => {
		const agentNodeType = makeNodeType({
			name: 'n8n-nodes-base.messageAnAgent',
			displayName: 'AI Agent V2',
			defaults: { name: 'AI Agent V2' },
			outputs: [NodeConnectionTypes.Main],
		});

		beforeEach(() => {
			setActivePinia(createTestingPinia({ stubActions: false }));
		});

		it('keeps the shipped name when the flag is on', () => {
			const store = useNodeTypesStore();
			store.setNodeTypes([agentNodeType]);

			const nodeType = store.getNodeType(agentNodeType.name);
			expect(nodeType?.displayName).toBe('AI Agent V2');
			expect(nodeType?.defaults.name).toBe('AI Agent V2');
		});

		it('renames the node to Message an Agent when the flag is off', () => {
			inlineAgentsEnabled.value = false;
			const store = useNodeTypesStore();
			store.setNodeTypes([agentNodeType]);

			const nodeType = store.getNodeType(agentNodeType.name);
			expect(nodeType?.displayName).toBe('Message an Agent');
			expect(nodeType?.defaults.name).toBe('Message an Agent');
		});

		it('does not bake the flag-off rename into the catalog', () => {
			inlineAgentsEnabled.value = false;
			const store = useNodeTypesStore();
			store.setNodeTypes([agentNodeType]);
			expect(store.getNodeType(agentNodeType.name)?.displayName).toBe('Message an Agent');

			inlineAgentsEnabled.value = true;
			// Adding any node re-derives the catalog; the shipped name must survive
			store.setNodeTypes([makeNodeType({ name: 'n8n-nodes-base.other', outputs: [] })]);
			expect(store.getNodeType(agentNodeType.name)?.displayName).toBe('AI Agent V2');
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
