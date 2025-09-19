import { createPinia, setActivePinia } from 'pinia';
import { waitFor, fireEvent } from '@testing-library/vue';

import NodeDetailsViewV2 from '@/components/NodeDetailsViewV2.vue';
import { VIEWS } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

import { createComponentRenderer } from '@/__tests__/render';
import { setupServer } from '@/__tests__/server';
import {
	createTestWorkflow,
	createTestWorkflowObject,
	defaultNodeDescriptions,
	mockNodes,
} from '@/__tests__/mocks';

vi.mock('vue-router', () => {
	return {
		useRouter: () => ({}),
		useRoute: () => ({ meta: {} }),
		RouterLink: vi.fn(),
	};
});

async function createPiniaStore(
	{ activeNodeName }: { activeNodeName: string | null } = { activeNodeName: null },
) {
	const workflow = createTestWorkflow({
		connections: {},
		active: true,
		nodes: mockNodes,
	});

	const pinia = createPinia();
	setActivePinia(pinia);

	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const ndvStore = useNDVStore();

	nodeTypesStore.setNodeTypes(defaultNodeDescriptions);
	workflowsStore.workflow = workflow;
	workflowsStore.workflowObject = createTestWorkflowObject(workflow);
	workflowsStore.nodeMetadata = mockNodes.reduce(
		(acc, node) => ({ ...acc, [node.name]: { pristine: true } }),
		{},
	);

	if (activeNodeName) {
		ndvStore.setActiveNodeName(activeNodeName, 'other');
	} else {
		ndvStore.unsetActiveNodeName();
	}

	await useSettingsStore().getSettings();
	await useUsersStore().loginWithCookie();

	return {
		pinia,
		workflowObject: workflowsStore.workflowObject,
	};
}

describe('NodeDetailsViewV2', () => {
	let server: ReturnType<typeof setupServer>;

	beforeAll(() => {
		HTMLDialogElement.prototype.show = vi.fn();
		server = setupServer();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	test('should render correctly', async () => {
		const { pinia, workflowObject } = await createPiniaStore({ activeNodeName: 'Manual Trigger' });

		const renderComponent = createComponentRenderer(NodeDetailsViewV2, {
			props: {
				teleported: false,
				appendToBody: false,
				workflowObject,
			},
			global: {
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

	test('should not render for stickies', async () => {
		const { pinia, workflowObject } = await createPiniaStore({ activeNodeName: 'Sticky' });

		const renderComponent = createComponentRenderer(NodeDetailsViewV2, {
			props: {
				teleported: false,
				appendToBody: false,
				workflowObject,
			},
			global: {
				mocks: {
					$route: {
						name: VIEWS.WORKFLOW,
					},
				},
			},
		});

		const { queryByTestId } = renderComponent({
			pinia,
		});

		expect(queryByTestId('ndv')).not.toBeInTheDocument();
	});

	describe('keyboard listener', () => {
		test('should register and unregister keydown listener based on modal open state', async () => {
			const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
			const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

			const { pinia, workflowObject } = await createPiniaStore({
				activeNodeName: 'Manual Trigger',
			});

			const renderComponent = createComponentRenderer(NodeDetailsViewV2, {
				props: {
					teleported: false,
					appendToBody: false,
					workflowObject,
				},
				global: {
					mocks: {
						$route: {
							name: VIEWS.WORKFLOW,
						},
					},
				},
			});

			const { getByTestId, unmount } = renderComponent({
				pinia,
			});

			await waitFor(() => expect(getByTestId('ndv')).toBeInTheDocument());

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
			const { pinia, workflowObject } = await createPiniaStore();
			const ndvStore = useNDVStore();

			const renderComponent = createComponentRenderer(NodeDetailsViewV2, {
				props: {
					teleported: false,
					appendToBody: false,
					workflowObject,
				},
				global: {
					mocks: {
						$route: {
							name: VIEWS.WORKFLOW,
						},
					},
				},
			});

			const { getByTestId, unmount } = renderComponent({
				pinia,
			});

			ndvStore.setActiveNodeName('Manual Trigger', 'other');

			await waitFor(() => expect(getByTestId('ndv')).toBeInTheDocument());

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

		test("should emit 'saveKeyboardShortcut' when save shortcut keybind is pressed", async () => {
			const { pinia, workflowObject } = await createPiniaStore({
				activeNodeName: 'Manual Trigger',
			});

			const renderComponent = createComponentRenderer(NodeDetailsViewV2, {
				props: {
					teleported: false,
					appendToBody: false,
					workflowObject,
				},
				global: {
					mocks: {
						$route: {
							name: VIEWS.WORKFLOW,
						},
					},
				},
			});

			const { getByTestId, emitted } = renderComponent({
				pinia,
			});

			await waitFor(() => expect(getByTestId('ndv')).toBeInTheDocument());

			await fireEvent.keyDown(getByTestId('ndv'), {
				key: 's',
				ctrlKey: true,
				bubbles: true,
				cancelable: true,
			});

			expect(emitted().saveKeyboardShortcut).toBeTruthy();
		});
	});
});
