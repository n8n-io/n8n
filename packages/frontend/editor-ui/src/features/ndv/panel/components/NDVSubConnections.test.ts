import { render, waitFor } from '@testing-library/vue';
import NDVSubConnections from './NDVSubConnections.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import type { INodeUi } from '@/Interface';
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { nextTick, shallowRef } from 'vue';
import { type Mock } from 'vitest';
import {
	createWorkflowDocumentId,
	injectWorkflowDocumentStore,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

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

const getNodeType = vi.fn();
let mockGetNodeByName: Mock<(name: string) => INodeUi | null> = vi.fn(() => node);

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType,
	})),
}));

vi.mock('@/app/stores/workflowDocument.store', async (importActual) => ({
	...(await importActual()),
	injectWorkflowDocumentStore: vi.fn(),
}));

describe('NDVSubConnections', () => {
	beforeAll(() => {
		vi.useFakeTimers();
		setActivePinia(createTestingPinia());
		vi.restoreAllMocks();
		vi.mocked(injectWorkflowDocumentStore).mockReturnValue(
			shallowRef({
				...useWorkflowDocumentStore(createWorkflowDocumentId('wf0')),
				getNodeByName: mockGetNodeByName,
			}),
		);
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
