import NodeDetailsView from '@/components/NodeDetailsView.vue';
import { VIEWS } from '@/constants';
import { createComponentRenderer } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';
import { uuid } from '@jsplumb/util';
import type { INode } from 'n8n-workflow';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createPinia, setActivePinia } from 'pinia';
import { defaultMockNodeTypesArray } from '@/__tests__/defaults';
import { setupServer } from '@/__tests__/server';

async function createPiniaWithActiveNode(node: INode) {
	const workflowId = uuid();
	const workflow = createTestWorkflow({
		id: workflowId,
		name: 'Test Workflow',
		connections: {},
		active: true,
		nodes: [node],
	});

	const pinia = createPinia();
	setActivePinia(pinia);

	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const ndvStore = useNDVStore();

	nodeTypesStore.setNodeTypes(defaultMockNodeTypesArray);
	workflowsStore.workflow = workflow;
	ndvStore.activeNodeName = node.name;

	await useSettingsStore().getSettings();
	await useUsersStore().loginWithCookie();

	return pinia;
}

const renderComponent = createComponentRenderer(NodeDetailsView, {
	props: {
		teleported: false,
		appendToBody: false,
	},
	global: {
		mocks: {
			$route: {
				name: VIEWS.WORKFLOW,
			},
		},
	},
});

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
		const wrapper = renderComponent({
			pinia: await createPiniaWithActiveNode(
				createTestNode({
					name: 'Manual Trigger',
					type: 'manualTrigger',
				}),
			),
		});

		await waitFor(() =>
			expect(wrapper.container.querySelector('.ndv-wrapper')).toBeInTheDocument(),
		);
	});
});
