import { createTestNode } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { SET_NODE_TYPE } from '@/constants';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import ExperimentalNodeDetailsDrawer from './ExperimentalNodeDetailsDrawer.vue';
import { nextTick } from 'vue';
import { fireEvent } from '@testing-library/vue';
import {
	injectWorkflowState,
	useWorkflowState,
	type WorkflowState,
} from '@/composables/useWorkflowState';

vi.mock('@/composables/useWorkflowState', async () => {
	const actual = await vi.importActual('@/composables/useWorkflowState');
	return {
		...actual,
		injectWorkflowState: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(ExperimentalNodeDetailsDrawer);

describe('ExperimentalNodeDetailsDrawer', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let ndvStore: ReturnType<typeof useNDVStore>;
	let workflowState: WorkflowState;

	const mockNodes = [
		createTestNode({
			id: 'node1',
			name: 'Node 1',
			type: SET_NODE_TYPE,
			parameters: { p0: 'before update' },
		}),
		createTestNode({ id: 'node2', name: 'Node 2', type: SET_NODE_TYPE }),
		createTestNode({ id: 'node3', name: 'Node 3', type: SET_NODE_TYPE }),
	];

	beforeEach(() => {
		pinia = createTestingPinia({
			stubActions: false,
		});

		workflowsStore = useWorkflowsStore(pinia);
		workflowsStore.setNodes(mockNodes);
		nodeTypesStore = useNodeTypesStore(pinia);
		nodeTypesStore.setNodeTypes([
			{
				name: SET_NODE_TYPE,
				properties: [{ name: 'p0', displayName: 'P0', type: 'string', default: '' }],
				version: 1,
				defaults: {},
				inputs: ['main'],
				outputs: ['main'],
				displayName: 'T0',
				group: [],
				description: '',
			},
		]);
		ndvStore = useNDVStore();

		workflowState = useWorkflowState();
		vi.mocked(injectWorkflowState).mockReturnValue(workflowState);
	});

	it('should show updated parameter after closing NDV', async () => {
		const rendered = renderComponent({
			pinia,
			props: {
				node: mockNodes[0],
				nodeIds: ['node1'],
			},
		});

		await rendered.findByDisplayValue('before update');

		// Simulate parameter update in NDV
		ndvStore.setActiveNodeName('Node 1', 'other');
		await nextTick();
		workflowState.setNodeParameters({ name: 'Node 1', value: { p0: 'after update' } });
		ndvStore.unsetActiveNodeName();
		await nextTick();

		await rendered.findByDisplayValue('after update');
	});

	describe('when multiple nodes are selected', () => {
		it('should show the number of selected nodes and available actions', () => {
			const rendered = renderComponent({
				pinia,
				props: {
					node: mockNodes[0],
					nodeIds: ['node1', 'node2'],
				},
			});

			expect(rendered.getByText('2 nodes selected')).toBeInTheDocument();

			const buttons = rendered.getAllByRole('button');
			expect(buttons.length).toBeGreaterThan(0);

			expect(rendered.getByText('Copy 2 nodes')).toBeInTheDocument();
			expect(rendered.getByText('Duplicate 2 nodes')).toBeInTheDocument();
			expect(rendered.getByText('Delete 2 nodes')).toBeInTheDocument();
		});

		it('should emit contextMenuAction event when a button is pressed', async () => {
			const rendered = renderComponent({
				pinia,
				props: {
					node: mockNodes[0],
					nodeIds: ['node1', 'node2'],
				},
			});

			const copyButton = rendered.getByText('Copy 2 nodes').closest('button')!;

			await fireEvent.click(copyButton);

			expect(rendered.emitted('contextMenuAction')).toBeTruthy();
			expect(rendered.emitted('contextMenuAction')?.[0]).toEqual(['copy', ['node1', 'node2']]);
		});
	});
});
