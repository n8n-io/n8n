import { createPinia, setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import { mock } from 'vitest-mock-extended';

import NodeDetailsView from '@/components/NodeDetailsView.vue';
import { VIEWS } from '@/constants';
import type { IWorkflowDb } from '@/Interface';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

import { createComponentRenderer } from '@/__tests__/render';
import { setupServer } from '@/__tests__/server';
import { defaultNodeDescriptions, mockNodes } from '@/__tests__/mocks';
import { cleanupAppModals, createAppModals } from '@/__tests__/utils';

vi.mock('vue-router', () => {
	return {
		useRouter: () => ({}),
		useRoute: () => ({ meta: {} }),
		RouterLink: vi.fn(),
	};
});

async function createPiniaWithActiveNode() {
	const node = mockNodes[0];
	const workflow = mock<IWorkflowDb>({
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
	workflowsStore.nodeMetadata[node.name] = { pristine: true };
	ndvStore.activeNodeName = node.name;

	await useSettingsStore().getSettings();
	await useUsersStore().loginWithCookie();

	return { pinia, currentWorkflow: workflowsStore.getCurrentWorkflow() };
}

describe('NodeDetailsView', () => {
	let server: ReturnType<typeof setupServer>;

	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(() => {
		createAppModals();
	});

	afterEach(() => {
		cleanupAppModals();
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render correctly', async () => {
		const { pinia, currentWorkflow } = await createPiniaWithActiveNode();

		const renderComponent = createComponentRenderer(NodeDetailsView, {
			props: {
				teleported: false,
				appendToBody: false,
				workflowObject: currentWorkflow,
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
});
