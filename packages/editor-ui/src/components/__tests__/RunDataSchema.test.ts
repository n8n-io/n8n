import { createComponentRenderer } from '@/__tests__/render';
import RunDataJsonSchema from '@/components/RunDataSchema.vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { userEvent } from '@testing-library/user-event';
import { cleanup, within, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import {
	createTestNode,
	defaultNodeDescriptions,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { IF_NODE_TYPE, SET_NODE_TYPE } from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { mock } from 'vitest-mock-extended';
import type { IWorkflowDb } from '@/Interface';
import { NodeConnectionType, type IDataObject } from 'n8n-workflow';
import * as nodeHelpers from '@/composables/useNodeHelpers';

const mockNode1 = createTestNode({
	name: 'Set1',
	type: SET_NODE_TYPE,
	typeVersion: 1,
	disabled: false,
});

const mockNode2 = createTestNode({
	name: 'Set2',
	type: SET_NODE_TYPE,
	typeVersion: 1,
	disabled: false,
});

const disabledNode = createTestNode({
	name: 'Disabled Node',
	type: SET_NODE_TYPE,
	typeVersion: 1,
	disabled: true,
});

const ifNode = createTestNode({
	name: 'If',
	type: IF_NODE_TYPE,
	typeVersion: 1,
	disabled: false,
});

const aiTool = createTestNode({
	name: 'AI Tool',
	type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
	typeVersion: 1,
	disabled: false,
});

async function setupStore() {
	const workflow = mock<IWorkflowDb>({
		id: '123',
		name: 'Test Workflow',
		connections: {},
		active: true,
		nodes: [mockNode1, mockNode2, disabledNode, ifNode, aiTool],
	});

	const pinia = createPinia();
	setActivePinia(pinia);

	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();

	nodeTypesStore.setNodeTypes([
		...defaultNodeDescriptions,
		mockNodeTypeDescription({
			name: IF_NODE_TYPE,
			outputs: [NodeConnectionType.Main, NodeConnectionType.Main],
		}),
	]);
	workflowsStore.workflow = workflow;

	return pinia;
}

function mockNodeOutputData(nodeName: string, data: IDataObject[], outputIndex = 0) {
	const originalNodeHelpers = nodeHelpers.useNodeHelpers();
	vi.spyOn(nodeHelpers, 'useNodeHelpers').mockImplementation(() => {
		return {
			...originalNodeHelpers,
			getNodeInputData: vi.fn((node, _, output) => {
				if (node.name === nodeName && output === outputIndex) {
					return data.map((json) => ({ json }));
				}
				return [];
			}),
		};
	});
}

describe('RunDataSchema.vue', () => {
	let renderComponent: ReturnType<typeof createComponentRenderer>;

	beforeEach(async () => {
		cleanup();
		renderComponent = createComponentRenderer(RunDataJsonSchema, {
			global: {
				stubs: ['font-awesome-icon'],
			},
			pinia: await setupStore(),
			props: {
				mappingEnabled: true,
				runIndex: 1,
				outputIndex: 0,
				totalRuns: 2,
				paneType: 'input',
				connectionType: 'main',
				search: '',
				nodes: [
					{ name: 'Set1', indicies: [], depth: 1 },
					{ name: 'Set2', indicies: [], depth: 2 },
				],
			},
		});
	});

	it('renders schema for empty data', async () => {
		const { getAllByTestId } = renderComponent();
		expect(getAllByTestId('run-data-schema-empty').length).toBe(1);

		// Expand second node
		await userEvent.click(getAllByTestId('run-data-schema-node-name')[1]);
		expect(getAllByTestId('run-data-schema-empty').length).toBe(2);
	});

	it('renders schema for data', async () => {
		useWorkflowsStore().pinData({
			node: mockNode1,
			data: [
				{ json: { name: 'John', age: 22, hobbies: ['surfing', 'traveling'] } },
				{ json: { name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] } },
			],
		});
		useWorkflowsStore().pinData({
			node: mockNode2,
			data: [
				{ json: { name: 'John', age: 22, hobbies: ['surfing', 'traveling'] } },
				{ json: { name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] } },
			],
		});

		const { getAllByTestId } = renderComponent();
		const nodes = getAllByTestId('run-data-schema-node');
		expect(nodes.length).toBe(2);
		const firstNodeName = await within(nodes[0]).findByTestId('run-data-schema-node-name');
		const firstNodeItemCount = await within(nodes[0]).findByTestId(
			'run-data-schema-node-item-count',
		);
		expect(firstNodeName).toHaveTextContent('Set1');
		expect(firstNodeItemCount).toHaveTextContent('2 items');
		expect(within(nodes[0]).getByTestId('run-data-schema-node-schema')).toMatchSnapshot();

		const secondNodeName = await within(nodes[1]).findByTestId('run-data-schema-node-name');
		expect(secondNodeName).toHaveTextContent('Set2');

		// Expand second node
		await userEvent.click(secondNodeName);
		expect(within(nodes[1]).getByTestId('run-data-schema-node-schema')).toMatchSnapshot();
	});

	it('renders schema in output pane', async () => {
		const { container } = renderComponent({
			props: {
				nodes: [],
				paneType: 'output',
				node: mockNode1,
				data: [
					{ name: 'John', age: 22, hobbies: ['surfing', 'traveling'] },
					{ name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] },
				],
			},
		});

		expect(container).toMatchSnapshot();
	});

	it('renders schema with spaces and dots', () => {
		useWorkflowsStore().pinData({
			node: mockNode1,
			data: [
				{
					json: {
						'hello world': [
							{
								test: {
									'more to think about': 1,
								},
								'test.how': 'ignore',
							},
						],
					},
				},
			],
		});

		const { container } = renderComponent();
		expect(container).toMatchSnapshot();
	});

	it('renders no data to show for data empty objects', () => {
		useWorkflowsStore().pinData({
			node: mockNode1,
			data: [{ json: {} }, { json: {} }],
		});

		const { getAllByTestId } = renderComponent();
		expect(getAllByTestId('run-data-schema-empty').length).toBe(1);
	});

	it('renders disabled nodes correctly', () => {
		const { getByTestId } = renderComponent({
			props: {
				nodes: [{ name: disabledNode.name, indicies: [], depth: 1 }],
			},
		});
		expect(getByTestId('run-data-schema-disabled')).toBeInTheDocument();
		expect(getByTestId('run-data-schema-node-name')).toHaveTextContent(
			`${disabledNode.name} (Deactivated)`,
		);
	});

	it('renders schema for correct output branch', async () => {
		mockNodeOutputData(
			'If',
			[
				{ id: 1, name: 'John' },
				{ id: 2, name: 'Jane' },
			],
			1,
		);
		const { getByTestId } = renderComponent({
			props: {
				nodes: [{ name: 'If', indicies: [1], depth: 2 }],
			},
		});

		await waitFor(() => {
			expect(getByTestId('run-data-schema-node-name')).toHaveTextContent('If');
			expect(getByTestId('run-data-schema-node-item-count')).toHaveTextContent('2 items');
			expect(getByTestId('run-data-schema-node-schema')).toMatchSnapshot();
		});
	});

	it('renders previous nodes schema for AI tools', async () => {
		mockNodeOutputData(
			'If',
			[
				{ id: 1, name: 'John' },
				{ id: 2, name: 'Jane' },
			],
			0,
		);
		const { getByTestId } = renderComponent({
			props: {
				nodes: [
					{
						name: 'If',
						indicies: [], // indicies are not set for AI tools
						depth: 2,
					},
				],
				node: aiTool,
			},
		});

		await waitFor(() => {
			expect(getByTestId('run-data-schema-node-name')).toHaveTextContent('If');
			expect(getByTestId('run-data-schema-node-item-count')).toHaveTextContent('2 items');
			expect(getByTestId('run-data-schema-node-schema')).toMatchSnapshot();
		});
	});

	it('renders its own data for AI tools in debug mode', async () => {
		const { getByTestId } = renderComponent({
			props: {
				nodes: [], // in debug mode nodes are empty
				node: aiTool,
				data: [{ output: 'AI tool output' }],
			},
		});

		await waitFor(() => {
			expect(getByTestId('run-data-schema-node-schema')).toMatchSnapshot();
		});
	});

	test.each([[[{ tx: false }, { tx: false }]], [[{ tx: '' }, { tx: '' }]], [[{ tx: [] }]]])(
		'renders schema instead of showing no data for %o',
		(data) => {
			useWorkflowsStore().pinData({
				node: mockNode1,
				data: data.map((item) => ({ json: item })),
			});

			const { queryByTestId } = renderComponent();
			expect(queryByTestId('run-data-schema-empty')).not.toBeInTheDocument();
		},
	);
});
