import { reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { mockNode } from '@/__tests__/mocks';
import { CODE_NODE_TYPE } from '@/constants';
import NodeExecuteButton from '@/components/NodeExecuteButton.vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => reactive({}),
	RouterLink: vi.fn(),
}));

let renderComponent: ReturnType<typeof createComponentRenderer>;
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let uiStore: MockedStore<typeof useUIStore>;
let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;

describe('NodeExecuteButton', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(NodeExecuteButton, {
			pinia: createTestingPinia(),
		});

		workflowsStore = mockedStore(useWorkflowsStore);
		uiStore = mockedStore(useUIStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);
	});

	it('renders without error', () => {
		expect(() =>
			renderComponent({
				props: {
					nodeName: 'test',
					telemetrySource: 'test',
				},
			}),
		).not.toThrow();
	});

	it('should be disabled if the node is disabled and show tooltip', async () => {
		workflowsStore.getNodeByName.mockReturnValue(
			mockNode({ name: 'test', type: CODE_NODE_TYPE, disabled: true }),
		);

		const { getByRole, queryByRole } = renderComponent({
			props: {
				nodeName: 'test',
				telemetrySource: 'test',
			},
		});

		const button = getByRole('button');
		expect(button).toBeDisabled();
		expect(queryByRole('tooltip')).not.toBeInTheDocument();

		await userEvent.hover(button);
		expect(getByRole('tooltip')).toBeVisible();
		expect(getByRole('tooltip')).toHaveTextContent('Enable node to execute');
	});

	it('should be disabled when workflow is running but node is not executing', async () => {
		uiStore.isActionActive.workflowRunning = true;
		workflowsStore.isNodeExecuting.mockReturnValue(false);
		workflowsStore.getNodeByName.mockReturnValue(mockNode({ name: 'test', type: CODE_NODE_TYPE }));

		const { getByRole, queryByRole } = renderComponent({
			props: {
				nodeName: 'test',
				telemetrySource: 'test',
			},
		});

		const button = getByRole('button');
		expect(button).toBeDisabled();
		expect(queryByRole('tooltip')).not.toBeInTheDocument();

		await userEvent.hover(button);
		expect(getByRole('tooltip')).toBeVisible();
		expect(getByRole('tooltip')).toHaveTextContent('Workflow is already running');
	});

	it('disables button when trigger node has issues', async () => {
		nodeTypesStore.isTriggerNode = () => true;
		workflowsStore.getNodeByName.mockReturnValue(
			mockNode({
				name: 'test',
				type: CODE_NODE_TYPE,
				issues: {
					typeUnknown: true,
				},
			}),
		);

		const { getByRole } = renderComponent({
			props: {
				nodeName: 'test',
				telemetrySource: 'test',
			},
		});

		expect(getByRole('button')).toBeDisabled();
	});
});
