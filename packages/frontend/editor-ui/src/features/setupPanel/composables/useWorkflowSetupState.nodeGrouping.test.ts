import { createTestingPinia } from '@pinia/testing';

import { createTestNode } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { INodeUi } from '@/Interface';

import { useWorkflowSetupState } from '@/features/setupPanel/composables/useWorkflowSetupState';

const mockProjectsStore = {
	currentProjectId: undefined as string | undefined,
	personalProject: null as { id: string } | null,
};
const mockRoute = {
	params: {} as Record<string, string>,
	query: {} as Record<string, string>,
};

vi.mock('@/features/credentials/credentials.store', async () => {
	const actual = await vi.importActual('@/features/credentials/credentials.store');
	return {
		...actual,
		listenForCredentialChanges: vi.fn(() => vi.fn()),
	};
});

const mockUpdateNodeProperties = vi.fn();
const mockUpdateNodeCredentialIssuesByName = vi.fn();
const mockUpdateNodesCredentialsIssues = vi.fn();

const mockWorkflowDocumentStore = {
	allNodes: [] as INodeUi[],
	getNodeByName: vi.fn() as ReturnType<typeof vi.fn>,
	getNodes: vi.fn() as ReturnType<typeof vi.fn>,
	updateNodeProperties: mockUpdateNodeProperties,
	name: '',
	settings: {},
	getPinDataSnapshot: vi.fn().mockReturnValue({}),
};

vi.mock('@/app/stores/workflowDocument.store', async () => {
	const actual = await vi.importActual('@/app/stores/workflowDocument.store');
	return {
		...actual,
		useWorkflowDocumentStore: vi.fn(() => mockWorkflowDocumentStore),
		createWorkflowDocumentId: vi.fn().mockReturnValue('test-id'),
	};
});

vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: vi.fn(() => ({
		updateNodeCredentialIssuesByName: mockUpdateNodeCredentialIssuesByName,
		updateNodesCredentialsIssues: mockUpdateNodesCredentialsIssues,
	})),
}));

const mockGetNodeTypeDisplayableCredentials = vi.fn().mockReturnValue([]);
const mockGetNodeParametersIssues = vi.fn().mockReturnValue({});

vi.mock('@/app/utils/nodes/nodeTransforms', () => ({
	getNodeTypeDisplayableCredentials: (...args: unknown[]) =>
		mockGetNodeTypeDisplayableCredentials(...args),
}));

vi.mock('@/features/setupPanel/setupPanel.utils', async () => {
	const actual = await vi.importActual('@/features/setupPanel/setupPanel.utils');
	return {
		...actual,
		getNodeParametersIssues: (...args: unknown[]) => mockGetNodeParametersIssues(...args),
	};
});

// Sorting/filtering by execution order is tested in setupPanel.utils.test.ts.
// Use a pass-through mock here so non-sorting tests are not affected.
vi.mock('@/app/utils/workflowUtils', async () => {
	const actual = await vi.importActual('@/app/utils/workflowUtils');
	return {
		...actual,
		sortNodesByExecutionOrder: (nodes: unknown[]) => nodes,
	};
});

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: vi.fn(() => mockProjectsStore),
}));

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRoute: vi.fn(() => mockRoute),
	};
});

const createNode = (overrides: Partial<INodeUi> = {}): INodeUi =>
	createTestNode({
		name: 'TestNode',
		type: 'n8n-nodes-base.testNode',
		typeVersion: 1,
		position: [0, 0],
		...overrides,
	}) as INodeUi;

describe('useWorkflowSetupState – node grouping', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		createTestingPinia();
		workflowsStore = mockedStore(useWorkflowsStore);
		credentialsStore = mockedStore(useCredentialsStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);

		workflowsStore.workflowId = 'test-workflow';
		credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue(undefined);
		credentialsStore.getCredentialById = vi.fn().mockReturnValue(undefined);
		credentialsStore.getNodesWithAccess = vi.fn().mockReturnValue([]);
		credentialsStore.isCredentialTestedOk = vi.fn().mockReturnValue(true);
		credentialsStore.isCredentialTestPending = vi.fn().mockReturnValue(false);
		credentialsStore.getCredentialData = vi.fn().mockResolvedValue(undefined);
		credentialsStore.fetchAllCredentials = vi.fn().mockResolvedValue([]);
		credentialsStore.fetchAllCredentialsForWorkflow = vi.fn().mockResolvedValue([]);
		nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(false);
		workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

		mockGetNodeTypeDisplayableCredentials.mockReturnValue([]);
		mockWorkflowDocumentStore.allNodes = [];
		mockWorkflowDocumentStore.getNodeByName = vi.fn();
		mockWorkflowDocumentStore.getNodes = vi.fn();
		mockUpdateNodeProperties.mockReset();
		mockUpdateNodeCredentialIssuesByName.mockReset();
		mockUpdateNodesCredentialsIssues.mockReset();
		mockGetNodeParametersIssues.mockReset().mockReturnValue({});
		mockProjectsStore.currentProjectId = undefined;
		mockProjectsStore.personalProject = null;
		mockRoute.params = {};
		mockRoute.query = {};
	});

	it('should create a node group for an agent with an LLM sub-node', () => {
		const agentNode = createNode({
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
		});
		const llmNode = createNode({
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		});

		mockWorkflowDocumentStore.allNodes = [agentNode, llmNode];

		// LLM node needs openAiApi credential
		mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
			if ((node as INodeUi).type === '@n8n/n8n-nodes-langchain.lmChatOpenAi')
				return [{ name: 'openAiApi' }];
			return [];
		});
		credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
			displayName: 'OpenAI API',
		});
		mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
			if (name === 'AI Agent') return agentNode;
			if (name === 'OpenAI Chat Model') return llmNode;
			return null;
		});

		// AI connection: LLM → Agent via ai_languageModel
		workflowsStore.connectionsByDestinationNode = {
			'AI Agent': {
				ai_languageModel: [[{ node: 'OpenAI Chat Model', type: 'ai_languageModel', index: 0 }]],
			},
		};

		const { setupCards } = useWorkflowSetupState();

		// Should have ONE item which is a nodeGroup
		expect(setupCards.value).toHaveLength(1);
		const card = setupCards.value[0];
		expect(card.nodeGroup).toBeDefined();
		expect(card.nodeGroup!.parentNode.name).toBe('AI Agent');
		expect(card.nodeGroup!.subnodeCards).toHaveLength(1);
		expect(card.nodeGroup!.subnodeCards[0].node.name).toBe('OpenAI Chat Model');
	});

	it('should create a node group for a chain with an LLM sub-node', () => {
		const chainNode = createNode({
			name: 'Basic LLM Chain',
			type: '@n8n/n8n-nodes-langchain.chainLlm',
		});
		const llmNode = createNode({
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		});

		mockWorkflowDocumentStore.allNodes = [chainNode, llmNode];

		// LLM node needs openAiApi credential
		mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
			if ((node as INodeUi).type === '@n8n/n8n-nodes-langchain.lmChatOpenAi')
				return [{ name: 'openAiApi' }];
			return [];
		});
		credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
			displayName: 'OpenAI API',
		});
		mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
			if (name === 'Basic LLM Chain') return chainNode;
			if (name === 'OpenAI Chat Model') return llmNode;
			return null;
		});

		// AI connection: LLM → Chain via ai_languageModel
		workflowsStore.connectionsByDestinationNode = {
			'Basic LLM Chain': {
				ai_languageModel: [[{ node: 'OpenAI Chat Model', type: 'ai_languageModel', index: 0 }]],
			},
		};

		const { setupCards } = useWorkflowSetupState();

		// Should have ONE item which is a nodeGroup
		expect(setupCards.value).toHaveLength(1);
		const card = setupCards.value[0];
		expect(card.nodeGroup).toBeDefined();
		expect(card.nodeGroup!.parentNode.name).toBe('Basic LLM Chain');
		expect(card.nodeGroup!.subnodeCards).toHaveLength(1);
		expect(card.nodeGroup!.subnodeCards[0].node.name).toBe('OpenAI Chat Model');
	});

	it('should recursively collect transitive sub-nodes into one group', () => {
		const chainNode = createNode({
			name: 'Basic LLM Chain',
			type: '@n8n/n8n-nodes-langchain.chainLlm',
		});
		const retrieverNode = createNode({
			name: 'Retriever',
			type: '@n8n/n8n-nodes-langchain.retrieverVectorStore',
		});
		const vectorStoreNode = createNode({
			name: 'Vector Store',
			type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
		});
		const embeddingNode = createNode({
			name: 'Embedding',
			type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
		});

		mockWorkflowDocumentStore.allNodes = [chainNode, retrieverNode, vectorStoreNode, embeddingNode];

		// Only Embedding needs credential
		mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
			if ((node as INodeUi).type === '@n8n/n8n-nodes-langchain.embeddingsOpenAi')
				return [{ name: 'openAiApi' }];
			return [];
		});
		credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
			displayName: 'OpenAI API',
		});
		mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
			if (name === 'Basic LLM Chain') return chainNode;
			if (name === 'Retriever') return retrieverNode;
			if (name === 'Vector Store') return vectorStoreNode;
			if (name === 'Embedding') return embeddingNode;
			return null;
		});

		// Chain → Retriever (ai_retriever), Retriever → VectorStore (ai_vectorStore), VectorStore → Embedding (ai_embedding)
		workflowsStore.connectionsByDestinationNode = {
			'Basic LLM Chain': {
				ai_retriever: [[{ node: 'Retriever', type: 'ai_retriever', index: 0 }]],
			},
			Retriever: {
				ai_vectorStore: [[{ node: 'Vector Store', type: 'ai_vectorStore', index: 0 }]],
			},
			'Vector Store': {
				ai_embedding: [[{ node: 'Embedding', type: 'ai_embedding', index: 0 }]],
			},
		};

		const { setupCards } = useWorkflowSetupState();

		// Should have ONE group with Chain as parent, containing Retriever, VectorStore, and Embedding
		expect(setupCards.value).toHaveLength(1);
		const card = setupCards.value[0];
		expect(card.nodeGroup).toBeDefined();
		expect(card.nodeGroup!.parentNode.name).toBe('Basic LLM Chain');

		const subnodeNames = card.nodeGroup!.subnodeCards.map((s) => s.node.name);
		// At minimum, the Embedding node must appear (it has credential needs).
		// Retriever and VectorStore may also appear depending on implementation.
		expect(subnodeNames).toContain('Embedding');
	});

	it('should not create a separate group for a node that is both parent and sub-node', () => {
		const agentNode = createNode({
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
		});
		const toolCodeNode = createNode({
			name: 'Tool Code',
			type: '@n8n/n8n-nodes-langchain.toolCode',
		});
		const vectorStoreNode = createNode({
			name: 'Vector Store',
			type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
		});
		const embeddingNode = createNode({
			name: 'Embedding',
			type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
		});

		mockWorkflowDocumentStore.allNodes = [agentNode, toolCodeNode, vectorStoreNode, embeddingNode];

		// Only Embedding needs credential
		mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
			if ((node as INodeUi).type === '@n8n/n8n-nodes-langchain.embeddingsOpenAi')
				return [{ name: 'openAiApi' }];
			return [];
		});
		credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
			displayName: 'OpenAI API',
		});
		mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
			if (name === 'AI Agent') return agentNode;
			if (name === 'Tool Code') return toolCodeNode;
			if (name === 'Vector Store') return vectorStoreNode;
			if (name === 'Embedding') return embeddingNode;
			return null;
		});

		// Agent → Tool Code (ai_tool), Tool Code → VectorStore (ai_vectorStore), VectorStore → Embedding (ai_embedding)
		workflowsStore.connectionsByDestinationNode = {
			'AI Agent': {
				ai_tool: [[{ node: 'Tool Code', type: 'ai_tool', index: 0 }]],
			},
			'Tool Code': {
				ai_vectorStore: [[{ node: 'Vector Store', type: 'ai_vectorStore', index: 0 }]],
			},
			'Vector Store': {
				ai_embedding: [[{ node: 'Embedding', type: 'ai_embedding', index: 0 }]],
			},
		};

		const { setupCards } = useWorkflowSetupState();

		// Should produce ONE group under Agent, not separate groups for Tool Code and Vector Store
		const nodeGroupCards = setupCards.value.filter((c) => c.nodeGroup);
		expect(nodeGroupCards).toHaveLength(1);
		expect(nodeGroupCards[0].nodeGroup!.parentNode.name).toBe('AI Agent');
	});

	it('should not group regular nodes without AI connections', () => {
		const scheduleTrigger = createNode({
			name: 'Schedule Trigger',
			type: 'n8n-nodes-base.scheduleTrigger',
		});
		const slackNode = createNode({
			name: 'Slack',
			type: 'n8n-nodes-base.slack',
		});

		mockWorkflowDocumentStore.allNodes = [scheduleTrigger, slackNode];
		nodeTypesStore.isTriggerNode = vi.fn(
			(type: string) => type === 'n8n-nodes-base.scheduleTrigger',
		);
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({});

		// Slack needs slackApi credential
		mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
			if ((node as INodeUi).type === 'n8n-nodes-base.slack') return [{ name: 'slackApi' }];
			return [];
		});
		credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
			displayName: 'Slack API',
		});
		mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
			if (name === 'Schedule Trigger') return scheduleTrigger;
			if (name === 'Slack') return slackNode;
			return null;
		});

		// Main connection only (no AI connections)
		workflowsStore.connectionsByDestinationNode = {
			Slack: {
				main: [[{ node: 'Schedule Trigger', type: 'main', index: 0 }]],
			},
		};

		const { setupCards } = useWorkflowSetupState();

		// Should have a regular card for Slack (with state, no nodeGroup)
		const regularCards = setupCards.value.filter((c) => c.state && !c.nodeGroup);
		expect(regularCards.length).toBeGreaterThanOrEqual(1);

		const slackCard = regularCards.find((c) => c.state!.node.name === 'Slack');
		expect(slackCard).toBeDefined();
		expect(slackCard!.state).toBeDefined();
		expect(slackCard!.nodeGroup).toBeUndefined();
	});

	it('should keep parent node as regular card if no sub-nodes need setup', () => {
		const agentNode = createNode({
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
		});
		const toolCodeNode = createNode({
			name: 'Tool Code',
			type: '@n8n/n8n-nodes-langchain.toolCode',
		});

		mockWorkflowDocumentStore.allNodes = [agentNode, toolCodeNode];

		// Neither node needs credentials
		mockGetNodeTypeDisplayableCredentials.mockReturnValue([]);
		mockWorkflowDocumentStore.getNodeByName = vi.fn((name: string) => {
			if (name === 'AI Agent') return agentNode;
			if (name === 'Tool Code') return toolCodeNode;
			return null;
		});

		// AI connection: Tool Code → Agent via ai_tool
		workflowsStore.connectionsByDestinationNode = {
			'AI Agent': {
				ai_tool: [[{ node: 'Tool Code', type: 'ai_tool', index: 0 }]],
			},
		};

		const { setupCards } = useWorkflowSetupState();

		// No node group should be created (tool has no setup needs)
		const nodeGroupCards = setupCards.value.filter((c) => c.nodeGroup);
		expect(nodeGroupCards).toHaveLength(0);
	});
});
