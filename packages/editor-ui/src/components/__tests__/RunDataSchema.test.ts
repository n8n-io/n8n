import { createComponentRenderer } from '@/__tests__/render';
import RunDataJsonSchema from '@/components/RunDataSchema.vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { userEvent } from '@testing-library/user-event';
import { cleanup, within } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { createTestNode, defaultNodeDescriptions } from '@/__tests__/mocks';
import { SET_NODE_TYPE } from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { mock } from 'vitest-mock-extended';
import type { IWorkflowDb } from '@/Interface';

const mockNode1 = createTestNode({
	name: 'Set1',
	type: SET_NODE_TYPE,
	typeVersion: 1,
});

const mockNode2 = createTestNode({
	name: 'Set2',
	type: SET_NODE_TYPE,
	typeVersion: 1,
});

async function setupStore() {
	const workflow = mock<IWorkflowDb>({
		id: '123',
		name: 'Test Workflow',
		connections: {},
		active: true,
		nodes: [mockNode1, mockNode2],
	});

	const pinia = createPinia();
	setActivePinia(pinia);

	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();

	nodeTypesStore.setNodeTypes(defaultNodeDescriptions);
	workflowsStore.workflow = workflow;

	return pinia;
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

	it('renders schema for in output pane', async () => {
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
