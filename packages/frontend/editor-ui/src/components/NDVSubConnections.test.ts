import { render, waitFor } from '@testing-library/vue';
import NDVSubConnections from '@/components/NDVSubConnections.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import type { INodeUi } from '@/Interface';
import type { INodeTypeDescription, WorkflowParameters } from 'n8n-workflow';
import { NodeConnectionTypes, Workflow } from 'n8n-workflow';
import { nextTick } from 'vue';

const nodeType: INodeTypeDescription = {
	displayName: 'OpenAI',
	name: '@n8n/n8n-nodes-langchain.openAi',
	version: [1],
	inputs: [
		{ type: NodeConnectionTypes.Main },
		{ type: NodeConnectionTypes.AiTool, displayName: 'Tools' },
	],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'openAiApi',
			required: true,
		},
	],
	properties: [],
	defaults: { color: '', name: '' },
	group: [],
	description: '',
};

const node: INodeUi = {
	parameters: {
		resource: 'assistant',
		assistantId: {
			__rl: true,
			mode: 'list',
			value: '',
		},
		options: {},
	},
	id: 'f30c2cbc-c1b1-4014-87f7-22e6ae7afcc8',
	name: 'OpenAI',
	type: '@n8n/n8n-nodes-langchain.openAi',
	typeVersion: 1.6,
	position: [1300, 540],
};

const workflow: WorkflowParameters = {
	nodes: [node],
	connections: {},
	pinData: {},
	active: false,
	nodeTypes: {
		getByName: vi.fn(),
		getByNameAndVersion: vi.fn(),
		getKnownTypes: vi.fn(),
	},
};

const getNodeType = vi.fn();
let mockWorkflowData = workflow;
let mockGetNodeByName = vi.fn(() => node);

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType,
	})),
}));

vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		getCurrentWorkflow: vi.fn(() => new Workflow(mockWorkflowData)),
		getNodeByName: mockGetNodeByName,
	})),
}));

describe('NDVSubConnections', () => {
	beforeAll(() => {
		vi.useFakeTimers();
		setActivePinia(createTestingPinia());
		vi.restoreAllMocks();
	});

	it('should render container if possible connections', async () => {
		getNodeType.mockReturnValue(nodeType);
		const { getByTestId, html } = render(NDVSubConnections, {
			props: {
				rootNode: node,
			},
			global: {
				stubs: {
					N8nButton: true,
				},
			},
		});
		vi.advanceTimersByTime(1000); // Event debounce time

		await waitFor(() => {});
		expect(getByTestId('subnode-connection-group-ai_tool-0')).toBeVisible();
		expect(html()).toMatchSnapshot();
	});

	it('should not render container if no possible connections', async () => {
		getNodeType.mockReturnValue(null);
		const component = render(NDVSubConnections, {
			props: {
				rootNode: node,
			},
		});
		vi.advanceTimersByTime(1000); // Event debounce time

		await waitFor(() => {});
		expect(component.html()).toEqual('<!--v-if-->');
	});

	it('should render multiple connections of the same type separately', async () => {
		// Mock a ModelSelector-like node with multiple ai_languageModel connections
		const multiConnectionNodeType: INodeTypeDescription = {
			displayName: 'Model Selector',
			name: 'modelSelector',
			version: [1],
			inputs: [
				{ type: NodeConnectionTypes.Main },
				{
					type: NodeConnectionTypes.AiLanguageModel,
					displayName: 'Model 1',
					required: true,
					maxConnections: 1,
				},
				{
					type: NodeConnectionTypes.AiLanguageModel,
					displayName: 'Model 2',
					required: true,
					maxConnections: 1,
				},
				{
					type: NodeConnectionTypes.AiLanguageModel,
					displayName: 'Model 3',
					required: true,
					maxConnections: 1,
				},
			],
			outputs: [NodeConnectionTypes.AiLanguageModel],
			properties: [],
			defaults: { color: '', name: '' },
			group: [],
			description: '',
		};

		const multiConnectionNode: INodeUi = {
			...node,
			name: 'ModelSelector',
			type: 'modelSelector',
		};

		// Mock connected nodes
		const mockWorkflow = {
			...workflow,
			nodes: [multiConnectionNode],
			connectionsByDestinationNode: {
				ModelSelector: {
					[NodeConnectionTypes.AiLanguageModel]: [
						null, // Main input (index 0) - no ai_languageModel connection
						[{ node: 'OpenAI1', type: NodeConnectionTypes.AiLanguageModel, index: 0 }], // Model 1 (index 1)
						[{ node: 'Claude', type: NodeConnectionTypes.AiLanguageModel, index: 0 }], // Model 2 (index 2)
						[], // Model 3 (index 3) - no connection
					],
				},
			},
		};

		// Mock additional nodes
		const openAI1Node: INodeUi = {
			...node,
			name: 'OpenAI1',
			type: '@n8n/n8n-nodes-langchain.openAi',
		};
		const claudeNode: INodeUi = {
			...node,
			name: 'Claude',
			type: '@n8n/n8n-nodes-langchain.claude',
		};

		getNodeType.mockReturnValue(multiConnectionNodeType);

		// Update mock data for this test
		mockWorkflowData = mockWorkflow;
		mockGetNodeByName = vi.fn((name: string) => {
			if (name === 'ModelSelector') return multiConnectionNode;
			if (name === 'OpenAI1') return openAI1Node;
			if (name === 'Claude') return claudeNode;
			return null;
		});

		const { getByTestId } = render(NDVSubConnections, {
			props: {
				rootNode: multiConnectionNode,
			},
		});
		vi.advanceTimersByTime(1);

		await nextTick();

		expect(getByTestId('subnode-connection-group-ai_languageModel-0')).toBeVisible(); // Model 1
		expect(getByTestId('subnode-connection-group-ai_languageModel-1')).toBeVisible(); // Model 2
		expect(getByTestId('subnode-connection-group-ai_languageModel-2')).toBeVisible(); // Model 3

		expect(getByTestId('add-subnode-ai_languageModel-0')).toBeVisible();
		expect(getByTestId('add-subnode-ai_languageModel-1')).toBeVisible();
		expect(getByTestId('add-subnode-ai_languageModel-2')).toBeVisible();
	});
});
