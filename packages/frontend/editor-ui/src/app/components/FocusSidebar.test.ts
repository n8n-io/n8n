import { createCanvasGraphNode } from '@/features/workflows/canvas/__tests__/utils';
import { createTestNode, createTestWorkflow, mockNodeTypeDescription } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { SET_NODE_TYPE } from '@/app/constants';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import { useVueFlow } from '@vue-flow/core';
import type { INodeProperties } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { reactive } from 'vue';
import { useExperimentalNdvStore } from '@/features/workflows/canvas/experimental/experimentalNdv.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import FocusSidebar from './FocusSidebar.vue';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => reactive({}),
	RouterLink: vi.fn(),
}));

describe('FocusSidebar', () => {
	const renderComponent = createComponentRenderer(FocusSidebar, {
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
	let setupPanelStore: ReturnType<typeof mockedStore<typeof useSetupPanelStore>>;

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

		setupPanelStore = mockedStore(useSetupPanelStore);
		setupPanelStore.isFeatureEnabled = false;

		experimentalNdvStore = mockedStore(useExperimentalNdvStore);
		experimentalNdvStore.isNdvInFocusPanelEnabled = true;
	});

	describe('when setup panel feature is enabled', () => {
		beforeEach(() => {
			setupPanelStore.isFeatureEnabled = true;
		});

		it('should render the setup panel tabs', async () => {
			const rendered = renderComponent({});

			expect(await rendered.findByTestId('setup-panel-tabs')).toBeInTheDocument();
		});

		it('should render the setup panel content by default', async () => {
			const rendered = renderComponent({});

			expect(await rendered.findByTestId('setup-panel-container')).toBeInTheDocument();
		});

		it('should switch to focus tab when a parameter is focused', async () => {
			const rendered = renderComponent({});

			// Initially shows setup panel
			expect(await rendered.findByTestId('setup-panel-container')).toBeInTheDocument();

			// Focus a parameter
			focusPanelStore.openWithFocusedNodeParameter({
				nodeId: 'n0',
				parameter: parameter0,
				parameterPath: 'parameters.p0',
			});

			// Should now show the focus parameter view
			expect(await rendered.findByTestId('focus-parameter')).toBeInTheDocument();
			expect(rendered.queryByTestId('setup-panel-container')).not.toBeInTheDocument();
		});

		it('should show parameter displayName as focus tab label when parameter is focused', async () => {
			const rendered = renderComponent({});

			focusPanelStore.openWithFocusedNodeParameter({
				nodeId: 'n0',
				parameter: parameter0,
				parameterPath: 'parameters.p0',
			});

			await rendered.findByTestId('focus-parameter');

			const tabs = rendered.getByTestId('setup-panel-tabs');
			expect(tabs).toHaveTextContent('P0');
		});

		it('should show node name as focus tab label when node is selected but no parameter is focused', async () => {
			const graphNode = createCanvasGraphNode({ id: 'n0' });
			const vueFlow = useVueFlow('w0');
			const rendered = renderComponent({});

			vueFlow.addNodes([graphNode]);
			vueFlow.addSelectedNodes([graphNode]);

			await rendered.findByTestId('setup-panel-tabs');

			const tabs = rendered.getByTestId('setup-panel-tabs');
			expect(tabs).toHaveTextContent('N0');
		});
	});
});
