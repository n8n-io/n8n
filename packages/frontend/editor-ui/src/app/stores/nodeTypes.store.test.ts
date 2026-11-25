import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import * as nodeTypesApi from '@n8n/rest-api-client/api/nodeTypes';
import { LOCAL_STORAGE_DATA_WORKER } from '@/app/constants/localStorage';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { CommunityNodeType } from '@n8n/api-types';

const mocks = vi.hoisted(() => ({
	rootStore: {
		baseUrl: 'http://localhost:5678/',
		restApiContext: { baseUrl: 'http://localhost:5678', pushRef: 'test' },
		defaultLocale: 'en',
		versionCli: '2.0.0',
	},
	initialize: vi.fn(),
	loadNodeTypes: vi.fn(),
	getAllNodeTypes: vi.fn(),
	getNodeType: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => mocks.rootStore),
}));

vi.mock('@/app/workers', () => ({
	initialize: mocks.initialize,
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

	describe('isNodeTypeUnavailable', () => {
		beforeEach(() => {
			setActivePinia(createTestingPinia({ stubActions: false }));
			store = useNodeTypesStore();
			store.setNodeTypes([makeNodeType({ name: 'n8n-nodes-test.loaded', outputs: ['main'] })]);
		});

		it('should return false for a loaded node type', () => {
			expect(store.isNodeTypeUnavailable('n8n-nodes-test.loaded')).toBe(false);
		});

		it('should return false for a loaded node type named with the preview token', () => {
			expect(store.isNodeTypeUnavailable('n8n-nodes-preview-test.loaded')).toBe(false);
		});

		it('should return true for a node type that is not loaded', () => {
			expect(store.isNodeTypeUnavailable('n8n-nodes-test.missing')).toBe(true);
		});

		it('should return false before any node types are loaded', () => {
			store.nodeTypes = {};

			expect(store.isNodeTypeUnavailable('n8n-nodes-test.missing')).toBe(false);
		});

		it('should return false for a vetted community node type that is not installed', async () => {
			vi.spyOn(useSettingsStore(), 'isCommunityNodesFeatureEnabled', 'get').mockReturnValue(true);
			vi.mocked(nodeTypesApi.fetchCommunityNodeTypes).mockResolvedValueOnce([
				{ name: 'n8n-nodes-vetted.node', nodeDescription: { name: 'n8n-nodes-vetted.node' } },
			] as CommunityNodeType[]);
			await store.fetchCommunityNodePreviews();

			expect(store.isNodeTypeUnavailable('n8n-nodes-vetted.node')).toBe(false);
		});
	});

	describe('visibleNodeTypes module gating', () => {
		const DATA_TABLE = 'n8n-nodes-base.dataTable';
		const MESSAGE_AN_AGENT = 'n8n-nodes-base.messageAnAgent';
		const decisionNodes = [
			'n8n-nodes-base.agentDecisionTrigger',
			'n8n-nodes-base.agentDecisionResponse',
		];

		let activeModules: string[];

		beforeEach(() => {
			setActivePinia(createTestingPinia({ stubActions: false }));
			store = useNodeTypesStore();
			store.setNodeTypes([
				makeNodeType({ name: 'n8n-nodes-test.plain', outputs: ['main'] }),
				makeNodeType({ name: DATA_TABLE, outputs: ['main'] }),
				makeNodeType({ name: MESSAGE_AN_AGENT, outputs: ['main'] }),
				...decisionNodes.map((name) => makeNodeType({ name, outputs: ['main'] })),
			]);

			activeModules = ['data-table', 'agents'];
			const settingsStore = useSettingsStore();
			vi.spyOn(settingsStore, 'isModuleActive').mockImplementation((name) =>
				activeModules.includes(name),
			);
			vi.spyOn(settingsStore, 'isAgentsEnabled', 'get').mockImplementation(() =>
				activeModules.includes('agents'),
			);
		});

		const visibleNames = () => store.visibleNodeTypes.map((nodeType) => nodeType.name);

		it('should list module-gated nodes while their modules are enabled', () => {
			expect(visibleNames()).toEqual(
				expect.arrayContaining(['n8n-nodes-test.plain', DATA_TABLE, MESSAGE_AN_AGENT]),
			);
		});

		it('should hide the Data table node while the data-table module is inactive', () => {
			activeModules = ['agents'];

			expect(visibleNames()).not.toContain(DATA_TABLE);
			expect(visibleNames()).toContain(MESSAGE_AN_AGENT);
			expect(store.isNodeTypeModuleDisabled(DATA_TABLE)).toBe(true);
		});

		it('should hide the Message an Agent node while agents are disabled', () => {
			activeModules = ['data-table'];

			expect(visibleNames()).not.toContain(MESSAGE_AN_AGENT);
			expect(visibleNames()).toContain(DATA_TABLE);
			expect(store.isNodeTypeModuleDisabled(MESSAGE_AN_AGENT)).toBe(true);
		});

		it('only offers the approval nodes when Agents and Human Review are enabled', () => {
			const settingsStore = useSettingsStore();
			const gate = vi
				.spyOn(settingsStore, 'isAgentModuleActive')
				.mockImplementation(
					(feature) =>
						feature === 'human-review' &&
						activeModules.includes('agents') &&
						activeModules.includes(feature),
				);

			for (const name of decisionNodes) expect(visibleNames()).not.toContain(name);

			activeModules = ['agents', 'human-review'];
			for (const name of decisionNodes) expect(store.isNodeTypeModuleDisabled(name)).toBe(false);
			expect(gate).toHaveBeenCalledWith('human-review');

			activeModules = ['human-review'];
			for (const name of decisionNodes) expect(store.isNodeTypeModuleDisabled(name)).toBe(true);
		});

		it('should never treat a node type without a module as disabled', () => {
			activeModules = [];

			expect(store.isNodeTypeModuleDisabled('n8n-nodes-test.plain')).toBe(false);
		});
	});

	describe('deprecated node types', () => {
		beforeEach(() => {
			setActivePinia(createTestingPinia({ stubActions: false }));
			store = useNodeTypesStore();
			store.setNodeTypes([
				makeNodeType({ name: 'n8n-nodes-test.plain', outputs: ['main'] }),
				makeNodeType({ name: 'n8n-nodes-test.deprecated', outputs: ['main'], deprecated: true }),
			]);
		});

		it('should report whether a node type version is deprecated', () => {
			expect(store.isNodeDeprecated({ type: 'n8n-nodes-test.deprecated', typeVersion: 1 })).toBe(
				true,
			);
			expect(store.isNodeDeprecated({ type: 'n8n-nodes-test.plain', typeVersion: 1 })).toBe(false);
		});

		it('should omit deprecated node types from visibleNodeTypes', () => {
			const visibleNames = store.visibleNodeTypes.map((nodeType) => nodeType.name);

			expect(visibleNames).toContain('n8n-nodes-test.plain');
			expect(visibleNames).not.toContain('n8n-nodes-test.deprecated');
		});
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
			mocks.initialize.mockResolvedValue(undefined);
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

		it('should initialize the data worker before it syncs the local database', async () => {
			window.localStorage.setItem(LOCAL_STORAGE_DATA_WORKER, 'true');
			const calls: string[] = [];
			mocks.initialize.mockImplementation(async () => {
				calls.push('initialize');
			});
			mocks.loadNodeTypes.mockImplementation(async () => {
				calls.push('loadNodeTypes');
			});
			const store = useNodeTypesStore();

			await store.getNodeTypes();

			expect(mocks.initialize).toHaveBeenCalledWith({ version: mocks.rootStore.versionCli });
			expect(calls).toEqual(['initialize', 'loadNodeTypes']);
		});

		it('should fall back to REST when the data worker cannot initialize', async () => {
			window.localStorage.setItem(LOCAL_STORAGE_DATA_WORKER, 'true');
			mocks.initialize.mockRejectedValue(new Error('worker unavailable'));
			const store = useNodeTypesStore();

			await store.getNodeTypes();

			expect(mocks.loadNodeTypes).not.toHaveBeenCalled();
			expect(nodeTypesApi.getNodeTypes).toHaveBeenCalledWith(mocks.rootStore.baseUrl);
			expect(store.nodeTypes[restNode.name]).toBeDefined();
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

	describe('loadNodeTypesIfNotLoaded', () => {
		const restNode = makeNodeType({
			name: 'n8n-nodes-base.restNode',
			outputs: [NodeConnectionTypes.Main],
		});

		beforeEach(() => {
			setActivePinia(createTestingPinia({ stubActions: false }));
			vi.clearAllMocks();
			window.localStorage.clear();
			mocks.initialize.mockResolvedValue(undefined);
			mocks.loadNodeTypes.mockResolvedValue(undefined);
			mocks.getAllNodeTypes.mockResolvedValue([restNode]);
		});

		it('should share one request between calls that start together', async () => {
			const { promise, resolve } = Promise.withResolvers<INodeTypeDescription[]>();
			vi.mocked(nodeTypesApi.getNodeTypes).mockReturnValueOnce(promise);
			const store = useNodeTypesStore();

			const first = store.loadNodeTypesIfNotLoaded();
			const second = store.loadNodeTypesIfNotLoaded();
			resolve([restNode]);
			await Promise.all([first, second]);

			expect(nodeTypesApi.getNodeTypes).toHaveBeenCalledTimes(1);
			expect(store.nodeTypes[restNode.name]).toBeDefined();
		});

		it('should reject every caller of a failed load, and retry on the next call', async () => {
			const error = new Error('node types');
			vi.mocked(nodeTypesApi.getNodeTypes)
				.mockRejectedValueOnce(error)
				.mockResolvedValueOnce([restNode]);
			const store = useNodeTypesStore();

			const first = store.loadNodeTypesIfNotLoaded();
			const second = store.loadNodeTypesIfNotLoaded();
			await expect(first).rejects.toBe(error);
			await expect(second).rejects.toBe(error);
			expect(nodeTypesApi.getNodeTypes).toHaveBeenCalledTimes(1);

			await store.loadNodeTypesIfNotLoaded();

			expect(nodeTypesApi.getNodeTypes).toHaveBeenCalledTimes(2);
			expect(store.nodeTypes[restNode.name]).toBeDefined();
		});

		it('should send no request when the node types are already loaded', async () => {
			const store = useNodeTypesStore();
			store.setNodeTypes([restNode]);

			await store.loadNodeTypesIfNotLoaded();

			expect(nodeTypesApi.getNodeTypes).not.toHaveBeenCalled();
		});

		it('should initialize the data worker once for calls that start together', async () => {
			window.localStorage.setItem(LOCAL_STORAGE_DATA_WORKER, 'true');
			const store = useNodeTypesStore();

			await Promise.all([store.loadNodeTypesIfNotLoaded(), store.loadNodeTypesIfNotLoaded()]);

			expect(mocks.initialize).toHaveBeenCalledTimes(1);
			expect(mocks.loadNodeTypes).toHaveBeenCalledTimes(1);
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
