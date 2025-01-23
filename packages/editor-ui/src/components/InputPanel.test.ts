import { createTestNode, createTestWorkflow, createTestWorkflowObject } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import InputPanel, { type Props } from '@/components/InputPanel.vue';
import { STORES } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import {
	NodeConnectionType,
	type IConnections,
	type INodeExecutionData,
	type IRunData,
} from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { mockedStore } from '../__tests__/utils';

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

const render = (props: Partial<Props> = {}, pinData?: INodeExecutionData[], runData?: IRunData) => {
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
	const workflowStore = useWorkflowsStore();

	workflowStore.setWorkflow(workflow);

	if (pinData) {
		mockedStore(useWorkflowsStore).pinDataByNodeName.mockReturnValue(pinData);
	}

	if (runData) {
		workflowStore.setWorkflowExecutionData({
			id: '',
			workflowData: {
				id: '',
				name: '',
				active: false,
				createdAt: '',
				updatedAt: '',
				nodes,
				connections,
				versionId: '',
			},
			finished: false,
			mode: 'trigger',
			status: 'success',
			startedAt: new Date(),
			createdAt: new Date(),
			data: {
				resultData: { runData },
			},
		});
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

	it("opens mapping tab by default if the node hasn't run yet", async () => {
		const { findByTestId } = render({ currentNodeName: 'Tool' });

		expect((await findByTestId('radio-button-mapping')).parentNode).toBeChecked();
		expect((await findByTestId('radio-button-debugging')).parentNode).not.toBeChecked();
	});

	it('opens debugging tab by default if the node has already run', async () => {
		const { findByTestId } = render({ currentNodeName: 'Tool' }, undefined, {
			Tool: [
				{
					startTime: 0,
					executionTime: 0,
					source: [],
					data: {},
				},
			],
		});

		expect((await findByTestId('radio-button-mapping')).parentNode).not.toBeChecked();
		expect((await findByTestId('radio-button-debugging')).parentNode).toBeChecked();
	});
});
