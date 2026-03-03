import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import NodeDetailsViewV2 from '@/features/ndv/shared/views/NodeDetailsViewV2.vue';
import { MANUAL_TRIGGER_NODE_TYPE, SET_NODE_TYPE, STICKY_NODE_TYPE, VIEWS } from '@/app/constants';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

import { createComponentRenderer } from '@/__tests__/render';
import {
	createTestNode,
	createTestWorkflow,
	createTestWorkflowObject,
	defaultNodeDescriptions,
} from '@/__tests__/mocks';
import type { Workflow } from 'n8n-workflow';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => ({ meta: {} }),
	RouterLink: vi.fn(),
}));

const setupStore = (nodes: Array<ReturnType<typeof createTestNode>>) => {
	const pinia = createTestingPinia({
		stubActions: false,
	});
	setActivePinia(pinia);

	const workflow = createTestWorkflow({
		connections: {},
		active: true,
		nodes,
	});

	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();

	nodeTypesStore.setNodeTypes(defaultNodeDescriptions);
	workflowsStore.workflow = workflow;
	workflowsStore.workflowObject = createTestWorkflowObject(workflow);
	workflowsStore.nodeMetadata = nodes.reduce(
		(acc, node) => ({ ...acc, [node.name]: { pristine: true } }),
		{},
	);

	return {
		pinia,
		workflowObject: workflowsStore.workflowObject as Workflow,
	};
};

describe('NodeDetailsViewV2', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let workflowObject: Workflow;
	const manualTriggerNode = createTestNode({
		name: 'Manual Trigger',
		type: MANUAL_TRIGGER_NODE_TYPE,
	});
	const setNode = createTestNode({ name: 'Set', type: SET_NODE_TYPE });
	const stickyNode = createTestNode({ name: 'Sticky', type: STICKY_NODE_TYPE });

	const renderComponent = (props: { readOnly?: boolean; activeNodeName?: string | null } = {}) => {
		const { activeNodeName = null, ...componentProps } = props;

		const ndvStore = useNDVStore();
		if (activeNodeName) {
			ndvStore.setActiveNodeName(activeNodeName, 'other');
		} else {
			ndvStore.unsetActiveNodeName();
		}

		const render = createComponentRenderer(NodeDetailsViewV2, {
			props: {
				workflowObject,
				...componentProps,
			},
			global: {
				mocks: {
					$route: {
						name: VIEWS.WORKFLOW,
					},
				},
				stubs: {
					InputPanel: { template: '<div data-test-id="input-panel"></div>' },
					OutputPanel: { template: '<div data-test-id="output-panel"></div>' },
					TriggerPanel: {
						template: '<div data-test-id="trigger-panel"></div>',
						emits: ['execute', 'activate'],
					},
					NodeSettings: { template: '<div data-test-id="node-settings"></div>' },
				},
			},
		});

		return render({ pinia });
	};

	beforeEach(() => {
		HTMLDialogElement.prototype.show = vi.fn();
		HTMLDialogElement.prototype.close = vi.fn();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		beforeEach(() => {
			const store = setupStore([manualTriggerNode, setNode, stickyNode]);
			pinia = store.pinia;
			workflowObject = store.workflowObject;
		});

		test('should not render when no node is active', () => {
			const { queryByTestId } = renderComponent({ activeNodeName: null });
			expect(queryByTestId('ndv')).not.toBeInTheDocument();
		});

		test('should not render for sticky nodes', () => {
			const { queryByTestId } = renderComponent({ activeNodeName: 'Sticky' });
			expect(queryByTestId('ndv')).not.toBeInTheDocument();
		});

		test('should render for regular nodes', async () => {
			const { getByTestId } = renderComponent({ activeNodeName: 'Set' });
			await waitFor(() => expect(getByTestId('ndv')).toBeInTheDocument());
		});

		test('should render trigger panel for trigger nodes', async () => {
			const { getByTestId, queryByTestId } = renderComponent({ activeNodeName: 'Manual Trigger' });

			await waitFor(() => {
				expect(getByTestId('ndv')).toBeInTheDocument();
				expect(getByTestId('trigger-panel')).toBeInTheDocument();
				expect(queryByTestId('input-panel')).not.toBeInTheDocument();
			});
		});

		test('should render input panel for non-trigger nodes', async () => {
			const { getByTestId, queryByTestId } = renderComponent({ activeNodeName: 'Set' });

			await waitFor(() => {
				expect(getByTestId('ndv')).toBeInTheDocument();
				expect(getByTestId('input-panel')).toBeInTheDocument();
				expect(queryByTestId('trigger-panel')).not.toBeInTheDocument();
			});
		});
	});

	describe('keyboard shortcuts', () => {
		beforeEach(() => {
			const store = setupStore([manualTriggerNode, setNode, stickyNode]);
			pinia = store.pinia;
			workflowObject = store.workflowObject;
		});

		test('should register keydown listener on mount', async () => {
			const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

			renderComponent({ activeNodeName: 'Manual Trigger' });

			await waitFor(() => {
				expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
			});

			addEventListenerSpy.mockRestore();
		});

		test('should unregister keydown listener on unmount', async () => {
			const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

			const { getByTestId, unmount } = renderComponent({ activeNodeName: 'Manual Trigger' });

			await waitFor(() => expect(getByTestId('ndv')).toBeInTheDocument());

			unmount();

			expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
			removeEventListenerSpy.mockRestore();
		});
	});

	describe('lifecycle', () => {
		beforeEach(() => {
			const store = setupStore([manualTriggerNode, setNode, stickyNode]);
			pinia = store.pinia;
			workflowObject = store.workflowObject;
		});

		test('should open dialog on mount', async () => {
			const showSpy = vi.spyOn(HTMLDialogElement.prototype, 'show');

			renderComponent({ activeNodeName: 'Manual Trigger' });

			await waitFor(() => {
				expect(showSpy).toHaveBeenCalled();
			});

			showSpy.mockRestore();
		});

		test('should handle dynamic node activation', async () => {
			const { getByTestId, queryByTestId } = renderComponent({ activeNodeName: null });

			// Initially no NDV
			expect(queryByTestId('ndv')).not.toBeInTheDocument();

			// Activate a node
			const ndvStore = useNDVStore();
			ndvStore.setActiveNodeName('Set', 'other');

			// NDV should appear
			await waitFor(() => {
				expect(getByTestId('ndv')).toBeInTheDocument();
			});
		});
	});

	describe('user interactions', () => {
		beforeEach(() => {
			const store = setupStore([manualTriggerNode, setNode, stickyNode]);
			pinia = store.pinia;
			workflowObject = store.workflowObject;
		});

		test('should close NDV when close button is clicked', async () => {
			const user = userEvent.setup();
			const { getByRole, getByTestId } = renderComponent({ activeNodeName: 'Manual Trigger' });

			await waitFor(() => expect(getByRole('dialog')).toBeInTheDocument());

			const closeButton = getByTestId('ndv-close-button');
			await user.click(closeButton);

			const ndvStore = useNDVStore();
			await waitFor(() => {
				expect(ndvStore.activeNodeName).toBeNull();
			});
		});

		test('should close NDV when backdrop is clicked', async () => {
			const user = userEvent.setup();
			const { getByRole, getByTestId } = renderComponent({ activeNodeName: 'Manual Trigger' });

			await waitFor(() => expect(getByRole('dialog')).toBeInTheDocument());

			const backdrop = getByTestId('ndv-backdrop');
			await user.click(backdrop);

			const ndvStore = useNDVStore();
			await waitFor(() => {
				expect(ndvStore.activeNodeName).toBeNull();
			});
		});

		test('should emit renameNode when node name is edited', async () => {
			const user = userEvent.setup();
			const { emitted, getByRole, getByTestId } = renderComponent({
				activeNodeName: 'Manual Trigger',
			});

			await waitFor(() => expect(getByRole('dialog')).toBeInTheDocument());

			const editableArea = getByTestId('inline-editable-area');
			await user.click(editableArea);

			const input = getByTestId('inline-edit-input');
			expect(input).toHaveValue('Manual Trigger');

			await user.clear(input);
			await user.type(input, 'Renamed Trigger');
			await user.tab();

			await waitFor(() => {
				expect(emitted().renameNode).toEqual([['Renamed Trigger']]);
			});
		});
	});
});
