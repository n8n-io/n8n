import { createComponentRenderer } from '@/__tests__/render';
import RunDataJsonSchema from '@/components/RunDataSchema.vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { userEvent } from '@testing-library/user-event';
import { cleanup, waitFor } from '@testing-library/vue';
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

	const DynamicScrollerStub = {
		props: {
			items: Array,
		},
		template:
			'<div><template v-for="item in items"><slot v-bind="{ item }"></slot></template></div>',
	};

	const DynamicScrollerItemStub = {
		template: '<slot></slot>',
	};

	beforeEach(async () => {
		cleanup();
		renderComponent = createComponentRenderer(RunDataJsonSchema, {
			global: {
				stubs: {
					DynamicScroller: DynamicScrollerStub,
					DynamicScrollerItem: DynamicScrollerItemStub,
					FontAwesomeIcon: true,
				},
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
		const { getAllByText, getAllByTestId } = renderComponent();

		expect(getAllByText("No fields - item(s) exist, but they're empty").length).toBe(2);

		// Collapse second node
		await userEvent.click(getAllByTestId('run-data-schema-header')[1]);
		expect(getAllByText("No fields - item(s) exist, but they're empty").length).toBe(1);
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
		const headers = getAllByTestId('run-data-schema-header');
		expect(headers.length).toBe(2);
		expect(headers[0]).toHaveTextContent('Set1');
		expect(headers[0]).toHaveTextContent('2 items');
		expect(headers[1]).toHaveTextContent('Set2');

		const items = getAllByTestId('run-data-schema-item');

		expect(items[0]).toHaveTextContent('nameJohn');
		expect(items[1]).toHaveTextContent('age22');
		expect(items[2]).toHaveTextContent('hobbies');
		expect(items[3]).toHaveTextContent('hobbies[0]surfing');
		expect(items[4]).toHaveTextContent('hobbies[1]traveling');
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

		const { getAllByText } = renderComponent();
		expect(getAllByText("No fields - item(s) exist, but they're empty").length).toBe(2);
	});

	it('renders disabled nodes correctly', () => {
		const { getByTestId } = renderComponent({
			props: {
				nodes: [{ name: disabledNode.name, indicies: [], depth: 1 }],
			},
		});
		expect(getByTestId('run-data-schema-header')).toHaveTextContent(
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
			expect(getByTestId('run-data-schema-header')).toHaveTextContent('If');
			expect(getByTestId('run-data-schema-header')).toHaveTextContent('2 items');
			expect(getByTestId('run-data-schema-header')).toMatchSnapshot();
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
			expect(getByTestId('run-data-schema-header')).toHaveTextContent('If');
			expect(getByTestId('run-data-schema-header')).toHaveTextContent('2 items');
			expect(getByTestId('run-data-schema-header')).toMatchSnapshot();
		});
	});

	it('renders its own data for AI tools in debug mode', async () => {
		const { getByTestId } = renderComponent({
			props: {
				paneType: 'output',
				nodes: [], // in debug mode nodes are empty
				node: aiTool,
				data: [{ output: 'AI tool output' }],
			},
		});

		expect(getByTestId('run-data-schema-item')).toHaveTextContent('AI tool output');
	});

	test.each([[[{ tx: false }, { tx: false }]], [[{ tx: '' }, { tx: '' }]], [[{ tx: [] }]]])(
		'renders schema instead of showing no data for %o',
		(data) => {
			useWorkflowsStore().pinData({
				node: mockNode1,
				data: data.map((item) => ({ json: item })),
			});

			const { getAllByTestId } = renderComponent();
			expect(getAllByTestId('run-data-schema-item')[0]).toHaveTextContent('tx');
		},
	);
});
