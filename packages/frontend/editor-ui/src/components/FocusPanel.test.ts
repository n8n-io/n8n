import { createCanvasGraphNode } from '@/__tests__/data';
import { createTestNode, createTestWorkflow, mockNodeTypeDescription } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { SET_NODE_TYPE } from '@/constants';
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import { useVueFlow } from '@vue-flow/core';
import type { INodeProperties } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { reactive } from 'vue';
import { useExperimentalNdvStore } from './canvas/experimental/experimentalNdv.store';
import FocusPanel from './FocusPanel.vue';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => reactive({}),
	RouterLink: vi.fn(),
}));

describe('FocusPanel', () => {
	const renderComponent = createComponentRenderer(FocusPanel, {
		props: {
			isCanvasReadOnly: false,
		},
	});

	const parameter0: INodeProperties = {
		displayName: 'P0',
		name: 'p0',
		type: 'string',
		default: '',
		description: '',
		validateType: 'string',
	};
	const parameter1: INodeProperties = {
		displayName: 'P1',
		name: 'p1',
		type: 'string',
		default: '',
		description: '',
		validateType: 'string',
	};

	let experimentalNdvStore: ReturnType<typeof mockedStore<typeof useExperimentalNdvStore>>;
	let focusPanelStore: ReturnType<typeof useFocusPanelStore>;
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;

	beforeEach(() => {
		const pinia = setActivePinia(createTestingPinia({ stubActions: false }));

		localStorage.clear();

		nodeTypesStore = useNodeTypesStore(pinia);
		nodeTypesStore.setNodeTypes([
			mockNodeTypeDescription({
				name: SET_NODE_TYPE,
				properties: [parameter0, parameter1],
			}),
		]);
		workflowsStore = useWorkflowsStore(pinia);
		workflowsStore.setWorkflow(createTestWorkflow({ id: 'w0' }));
		workflowsStore.setNodes([
			createTestNode({ id: 'n0', name: 'N0', parameters: { p0: 'v0' }, type: SET_NODE_TYPE }),
		]);
		focusPanelStore = useFocusPanelStore(pinia);
		focusPanelStore.toggleFocusPanel();
	});

	describe('when experimental NDV is enabled', () => {
		beforeEach(() => {
			experimentalNdvStore = mockedStore(useExperimentalNdvStore);
			experimentalNdvStore.isNdvInFocusPanelEnabled = true;
		});

		it('should render empty state when neither a node nor a parameter is selected', async () => {
			const rendered = renderComponent({});

			expect(await rendered.findByText('Select a node to edit it here'));
		});

		it('should render the parameter focus input when a parameter is selected', async () => {
			const rendered = renderComponent({});

			focusPanelStore.openWithFocusedNodeParameter({
				nodeId: 'n0',
				parameter: parameter0,
				parameterPath: 'parameters.p0',
			});

			expect(await rendered.findByTestId('focus-parameter')).toBeInTheDocument();
			expect(rendered.getByText('N0')).toBeInTheDocument(); // title in header
			expect(rendered.getByText('P0')).toBeInTheDocument(); // title in header
			expect(rendered.getByDisplayValue('v0')).toBeInTheDocument(); // current value of the parameter
		});

		it('should render node parameters when a node is selected on canvas', async () => {
			const graphNode = createCanvasGraphNode({ id: 'n0' });
			const vueFlow = useVueFlow('w0');
			const rendered = renderComponent({});

			vueFlow.addNodes([graphNode]);
			vueFlow.addSelectedNodes([graphNode]);

			expect(await rendered.findByTestId('node-parameters')).toBeInTheDocument();
			expect(rendered.getByText('N0')).toBeInTheDocument(); // title in header
			expect(rendered.getByText('P0')).toBeInTheDocument(); // parameter 0
			expect(rendered.getByText('P1')).toBeInTheDocument(); // parameter 1
		});

		it('should render the parameters when a node is selected on canvas and a parameter is selected', async () => {
			const graphNode = createCanvasGraphNode({ id: 'n0' });
			const vueFlow = useVueFlow('w0');
			const rendered = renderComponent({});

			vueFlow.addNodes([graphNode]);
			vueFlow.addSelectedNodes([graphNode]);

			focusPanelStore.openWithFocusedNodeParameter({
				nodeId: 'n0',
				parameter: parameter0,
				parameterPath: 'parameters.p0',
			});

			expect(await rendered.findByTestId('focus-parameter')).toBeInTheDocument();
			expect(rendered.getByText('N0')).toBeInTheDocument(); // title in header
			expect(rendered.getByText('P0')).toBeInTheDocument(); // title in header
			expect(rendered.getByDisplayValue('v0')).toBeInTheDocument(); // current value of the parameter
		});
	});
});
