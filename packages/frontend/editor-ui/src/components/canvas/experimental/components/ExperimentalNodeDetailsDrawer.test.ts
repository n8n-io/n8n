import { createTestNode, defaultNodeDescriptions } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import ExperimentalNodeDetailsDrawer from './ExperimentalNodeDetailsDrawer.vue';

const renderComponent = createComponentRenderer(ExperimentalNodeDetailsDrawer);

describe('ExperimentalNodeDetailsDrawer', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;

	const mockNodes = [
		createTestNode({ id: 'node1', name: 'Node 1' }),
		createTestNode({ id: 'node2', name: 'Node 2' }),
		createTestNode({ id: 'node3', name: 'Node 3' }),
	];

	beforeEach(() => {
		pinia = createTestingPinia({
			stubActions: false,
		});

		// Initialize stores in describe scope
		workflowsStore = useWorkflowsStore(pinia);
		workflowsStore.setNodes(mockNodes);
		nodeTypesStore = useNodeTypesStore(pinia);
		nodeTypesStore.setNodeTypes(defaultNodeDescriptions);
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
