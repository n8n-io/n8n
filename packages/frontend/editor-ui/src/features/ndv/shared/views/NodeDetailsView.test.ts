import { createPinia, setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';

import NodeDetailsView from '@/features/ndv/shared/views/NodeDetailsView.vue';
import { VIEWS } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

import { createComponentRenderer } from '@/__tests__/render';
import { setupServer } from '@/__tests__/server';
import { createTestWorkflow, defaultNodeDescriptions, mockNodes } from '@/__tests__/mocks';
import { computed, shallowRef } from 'vue';
import { WorkflowDocumentStoreKey, WorkflowIdKey } from '@/app/constants/injectionKeys';

vi.mock('vue-router', () => {
	return {
		useRouter: () => ({}),
		useRoute: () => ({ meta: {} }),
		RouterLink: vi.fn(),
	};
});

async function createPiniaStore(isActiveNode: boolean) {
	const node = mockNodes[0];
	const workflow = createTestWorkflow({
		connections: {},
		active: true,
		nodes: [node],
	});

	const pinia = createPinia();
	setActivePinia(pinia);

	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const ndvStore = useNDVStore();

	nodeTypesStore.setNodeTypes(defaultNodeDescriptions);
	workflowsStore.workflow = workflow;
	const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id));
	workflowDocumentStore.setNodes(workflow.nodes);
	workflowDocumentStore.setConnections(workflow.connections);
	workflowDocumentStore.setSettings(workflow.settings ?? { executionOrder: 'v1' });
	workflowDocumentStore.initPristineNodeMetadata(node.name);

	const workflowDocumentStoreRef = shallowRef(workflowDocumentStore);

	if (isActiveNode) {
		ndvStore.setActiveNodeName(node.name, 'other');
	}

	await useSettingsStore().getSettings();
	await useUsersStore().loginWithCookie();

	return {
		pinia,
		workflow,
		workflowDocumentStoreRef,
		nodeName: node.name,
	};
}

describe('NodeDetailsView', () => {
	let server: ReturnType<typeof setupServer>;

	beforeAll(() => {
		server = setupServer();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render correctly', async () => {
		const { pinia, workflow, workflowDocumentStoreRef } = await createPiniaStore(true);

		const renderComponent = createComponentRenderer(NodeDetailsView, {
			global: {
				provide: {
					[WorkflowIdKey as unknown as string]: computed(() => workflow.id),
					[WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef,
				},
				mocks: {
					$route: {
						name: VIEWS.WORKFLOW,
					},
				},
			},
		});

		const { getByTestId } = renderComponent({
			pinia,
		});

		await waitFor(() => expect(getByTestId('ndv')).toBeInTheDocument());
	});

	describe('keyboard listener', () => {
		test('should register and unregister keydown listener based on modal open state', async () => {
			const { pinia, workflow, workflowDocumentStoreRef } = await createPiniaStore(true);

			const renderComponent = createComponentRenderer(NodeDetailsView, {
				global: {
					provide: {
						[WorkflowIdKey as unknown as string]: computed(() => workflow.id),
						[WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef,
					},
					mocks: {
						$route: {
							name: VIEWS.WORKFLOW,
						},
					},
				},
			});

			const { getByTestId, queryByTestId, unmount } = renderComponent({ pinia });

			const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
			const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

			await waitFor(() => expect(getByTestId('ndv')).toBeInTheDocument());
			await waitFor(() => expect(queryByTestId('ndv-modal')).toBeInTheDocument());

			expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
			expect(removeEventListenerSpy).not.toHaveBeenCalledWith(
				'keydown',
				expect.any(Function),
				true,
			);

			unmount();

			expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);

			addEventListenerSpy.mockRestore();
			removeEventListenerSpy.mockRestore();
		});

		test('should unregister keydown listener on unmount', async () => {
			const { pinia, workflow, workflowDocumentStoreRef, nodeName } = await createPiniaStore(false);
			const ndvStore = useNDVStore(pinia);

			const renderComponent = createComponentRenderer(NodeDetailsView, {
				global: {
					provide: {
						[WorkflowIdKey as unknown as string]: computed(() => workflow.id),
						[WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef,
					},
					mocks: {
						$route: {
							name: VIEWS.WORKFLOW,
						},
					},
				},
			});

			const { getByTestId, queryByTestId, unmount } = renderComponent({ pinia });

			ndvStore.setActiveNodeName(nodeName, 'other');

			await waitFor(() => expect(getByTestId('ndv')).toBeInTheDocument());
			await waitFor(() => expect(queryByTestId('ndv-modal')).toBeInTheDocument());

			const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
			expect(removeEventListenerSpy).not.toHaveBeenCalledWith(
				'keydown',
				expect.any(Function),
				true,
			);

			unmount();

			expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);

			removeEventListenerSpy.mockRestore();
		});
	});
});
