import NodeDetailsView from '@/components/NodeDetailsView.vue';
import { createTestingPinia } from '@pinia/testing';
import { MANUAL_TRIGGER_NODE_TYPE, STORES } from '@/constants';
import { createComponentRenderer } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';
import { uuid } from '@jsplumb/util';
import type { INode } from 'n8n-workflow';
import { createTestWorkflow } from '@/__tests__/mocks';
import { useNDVStore, useNodeTypesStore, useWorkflowsStore } from '@/stores';
import { createPinia, setActivePinia } from 'pinia';
import { defaultMockNodeTypesArray } from '@/__tests__/defaults';

function createTestActiveNode(
	node: Partial<INode> & { name: INode['name']; type: INode['type'] },
): INode {
	return {
		id: uuid(),
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
		...node,
	};
}

function createPiniaWithActiveNode(node: INode) {
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
	console.log({ defaultMockNodeTypesArray });

	workflowsStore.workflow = workflow;
	ndvStore.activeNodeName = node.name;

	return pinia;
}

const renderComponent = createComponentRenderer(NodeDetailsView, {
	props: {
		teleported: false,
		appendToBody: false,
	},
});

describe('NodeDetailsView', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render correctly', async () => {
		const wrapper = renderComponent({
			pinia: createPiniaWithActiveNode(
				createTestActiveNode({
					name: 'Manual Trigger',
					type: 'manualTrigger',
				}),
			),
		});

		await waitFor(() =>
			expect(wrapper.container.querySelector('.modal-content')).toBeInTheDocument(),
		);
	});
});
