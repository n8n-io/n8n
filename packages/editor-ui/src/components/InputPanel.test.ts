import { createTestNode, createTestWorkflow, createTestWorkflowObject } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import InputPanel, { type Props } from '@/components/InputPanel.vue';
import { STORES } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import { NodeConnectionType, type IConnections, type INodeExecutionData } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { mockedStore } from '../__tests__/utils';
import { waitFor } from '@testing-library/vue';

vi.mock('vue-router', () => {
	return {
		useRouter: () => ({}),
		useRoute: () => ({ meta: {} }),
		RouterLink: vi.fn(),
	};
});

const nodes = [
	createTestNode({ id: 'node1', name: 'Node 1' }),
	createTestNode({ id: 'node2', name: 'Node 2' }),
	createTestNode({ name: 'Agent' }),
	createTestNode({ name: 'Tool' }),
];

const render = (props: Partial<Props> = {}, pinData?: INodeExecutionData[]) => {
	const connections: IConnections = {
		[nodes[0].name]: {
			[NodeConnectionType.Main]: [
				[{ node: nodes[1].name, type: NodeConnectionType.Main, index: 0 }],
			],
		},
		[nodes[1].name]: {
			[NodeConnectionType.Main]: [
				[{ node: nodes[2].name, type: NodeConnectionType.Main, index: 0 }],
			],
		},
		[nodes[3].name]: {
			[NodeConnectionType.AiMemory]: [
				[{ node: nodes[2].name, type: NodeConnectionType.AiMemory, index: 0 }],
			],
		},
	};

	const pinia = createTestingPinia({
		stubActions: false,
		initialState: { [STORES.NDV]: { activeNodeName: props.currentNodeName ?? nodes[1].name } },
	});
	setActivePinia(pinia);

	const workflow = createTestWorkflow({ nodes, connections });
	useWorkflowsStore().setWorkflow(workflow);

	if (pinData) {
		mockedStore(useWorkflowsStore).pinDataByNodeName.mockReturnValue(pinData);
	}

	const workflowObject = createTestWorkflowObject({
		nodes,
		connections,
	});

	return createComponentRenderer(InputPanel, {
		props: {
			pushRef: 'pushRef',
			runIndex: 0,
			currentNodeName: nodes[1].name,
			workflow: workflowObject,
		},
		global: {
			stubs: {
				InputPanelPinButton: { template: '<button data-test-id="ndv-pin-data"></button>' },
			},
		},
	})({ props });
};

describe('InputPanel', () => {
	it('should render', async () => {
		const { container, queryByTestId } = render({}, [{ json: { name: 'Test' } }]);

		await waitFor(() => expect(queryByTestId('ndv-data-size-warning')).not.toBeInTheDocument());
		expect(container).toMatchSnapshot();
	});
});
