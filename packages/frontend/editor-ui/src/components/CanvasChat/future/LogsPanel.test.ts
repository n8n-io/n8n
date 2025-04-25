import { renderComponent } from '@/__tests__/render';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { mockedStore } from '@/__tests__/utils';
import LogsPanel from '@/components/CanvasChat/future/LogsPanel.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createRouter, createWebHistory, useRouter } from 'vue-router';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { h, nextTick } from 'vue';
import {
	aiAgentNode,
	aiChatExecutionResponse,
	aiChatWorkflow,
	aiManualWorkflow,
	nodeTypes,
} from '../__test__/data';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { LOGS_PANEL_STATE } from '../types/logs';
import { IN_PROGRESS_EXECUTION_ID } from '@/constants';
import { useCanvasOperations } from '@/composables/useCanvasOperations';

describe('LogsPanel', () => {
	const VIEWPORT_HEIGHT = 800;

	let pinia: TestingPinia;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let nodeTypeStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	function render() {
		return renderComponent(LogsPanel, {
			global: {
				plugins: [
					createRouter({
						history: createWebHistory(),
						routes: [{ path: '/', component: () => h('div') }],
					}),
					pinia,
				],
			},
		});
	}

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false, fakeApp: true });

		setActivePinia(pinia);

		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isNewLogsEnabled = true;

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.setWorkflowExecutionData(null);
		workflowsStore.toggleLogsPanelOpen(false);

		nodeTypeStore = mockedStore(useNodeTypesStore);
		nodeTypeStore.setNodeTypes(nodeTypes);

		Object.defineProperty(document.body, 'offsetHeight', {
			configurable: true,
			get() {
				return VIEWPORT_HEIGHT;
			},
		});
		vi.spyOn(document.body, 'getBoundingClientRect').mockReturnValue({
			y: 0,
			height: VIEWPORT_HEIGHT,
		} as DOMRect);
	});

	it('should render collapsed panel by default', async () => {
		const rendered = render();

		expect(await rendered.findByTestId('logs-overview-header')).toBeInTheDocument();
		expect(rendered.queryByTestId('logs-overview-empty')).not.toBeInTheDocument();
	});

	it('should only render logs panel if the workflow has no chat trigger', async () => {
		workflowsStore.setWorkflow(aiManualWorkflow);

		const rendered = render();

		expect(await rendered.findByTestId('logs-overview-header')).toBeInTheDocument();
		expect(rendered.queryByTestId('chat-header')).not.toBeInTheDocument();
	});

	it('should render chat panel and logs panel if the workflow has chat trigger', async () => {
		workflowsStore.setWorkflow(aiChatWorkflow);

		const rendered = render();

		expect(await rendered.findByTestId('logs-overview-header')).toBeInTheDocument();
		expect(await rendered.findByTestId('chat-header')).toBeInTheDocument();
	});

	it('opens collapsed panel when clicked', async () => {
		workflowsStore.setWorkflow(aiChatWorkflow);

		const rendered = render();

		await fireEvent.click(await rendered.findByTestId('logs-overview-header'));

		expect(await rendered.findByTestId('logs-overview-empty')).toBeInTheDocument();
	});

	it('should toggle panel when chevron icon button in the overview panel is clicked', async () => {
		workflowsStore.setWorkflow(aiChatWorkflow);

		const rendered = render();

		const overviewPanel = await rendered.findByTestId('logs-overview-header');

		await fireEvent.click(within(overviewPanel).getByLabelText('Open panel'));
		expect(rendered.getByTestId('logs-overview-empty')).toBeInTheDocument();

		await fireEvent.click(within(overviewPanel).getByLabelText('Collapse panel'));
		expect(rendered.queryByTestId('logs-overview-empty')).not.toBeInTheDocument();
	});

	it('should open log details panel when a log entry is clicked in the logs overview panel', async () => {
		workflowsStore.setWorkflow(aiChatWorkflow);
		workflowsStore.setWorkflowExecutionData(aiChatExecutionResponse);

		const rendered = render();

		await fireEvent.click(await rendered.findByTestId('logs-overview-header'));
		await fireEvent.click(await rendered.findByText('AI Agent'));
		expect(rendered.getByTestId('log-details')).toBeInTheDocument();

		// Click again to close the panel
		await fireEvent.click(
			await within(rendered.getByTestId('logs-overview-body')).findByText('AI Agent'),
		);
		expect(rendered.queryByTestId('log-details')).not.toBeInTheDocument();
	});

	it("should show the button to toggle panel in the header of log details panel when it's opened", async () => {
		workflowsStore.setWorkflow(aiChatWorkflow);
		workflowsStore.setWorkflowExecutionData(aiChatExecutionResponse);

		const rendered = render();

		await fireEvent.click(await rendered.findByTestId('logs-overview-header'));
		await fireEvent.click(await rendered.findByText('AI Agent'));

		// Click the toggle button to close the panel
		await fireEvent.click(
			within(rendered.getByTestId('log-details')).getByLabelText('Collapse panel'),
		);
		expect(rendered.queryByTestId('chat-messages-empty')).not.toBeInTheDocument();
		expect(rendered.queryByTestId('logs-overview-body')).not.toBeInTheDocument();

		// Click again to open the panel
		await fireEvent.click(
			within(rendered.getByTestId('logs-overview')).getByLabelText('Open panel'),
		);
		expect(await rendered.findByTestId('chat-messages-empty')).toBeInTheDocument();
		expect(await rendered.findByTestId('logs-overview-body')).toBeInTheDocument();
	});

	it('should open itself by pulling up the resizer', async () => {
		workflowsStore.toggleLogsPanelOpen(false);

		const rendered = render();

		expect(workflowsStore.logsPanelState).toBe(LOGS_PANEL_STATE.CLOSED);
		expect(rendered.queryByTestId('logs-overview-body')).not.toBeInTheDocument();

		await fireEvent.mouseDown(rendered.getByTestId('resize-handle'));

		window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }));
		window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 0, clientY: 0 }));

		await waitFor(() => {
			expect(workflowsStore.logsPanelState).toBe(LOGS_PANEL_STATE.ATTACHED);
			expect(rendered.queryByTestId('logs-overview-body')).toBeInTheDocument();
		});
	});

	it('should close itself by pulling down the resizer', async () => {
		workflowsStore.toggleLogsPanelOpen(true);

		const rendered = render();

		expect(workflowsStore.logsPanelState).toBe(LOGS_PANEL_STATE.ATTACHED);
		expect(rendered.queryByTestId('logs-overview-body')).toBeInTheDocument();

		await fireEvent.mouseDown(rendered.getByTestId('resize-handle'));

		window.dispatchEvent(
			new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: VIEWPORT_HEIGHT }),
		);
		window.dispatchEvent(
			new MouseEvent('mouseup', { bubbles: true, clientX: 0, clientY: VIEWPORT_HEIGHT }),
		);

		await waitFor(() => {
			expect(workflowsStore.logsPanelState).toBe(LOGS_PANEL_STATE.CLOSED);
			expect(rendered.queryByTestId('logs-overview-body')).not.toBeInTheDocument();
		});
	});

	it('should reflect changes to execution data in workflow store if execution is in progress', async () => {
		workflowsStore.toggleLogsPanelOpen(true);
		workflowsStore.setWorkflow(aiChatWorkflow);
		workflowsStore.setWorkflowExecutionData({
			...aiChatExecutionResponse,
			id: IN_PROGRESS_EXECUTION_ID,
			status: 'running',
			finished: false,
			startedAt: new Date('2025-04-20T12:34:50.000Z'),
			stoppedAt: undefined,
			data: { resultData: { runData: {} } },
		});

		const rendered = render();

		await fireEvent.click(rendered.getByText('Overview'));

		expect(rendered.getByText('Running')).toBeInTheDocument();
		expect(rendered.queryByText('AI Agent')).not.toBeInTheDocument();

		workflowsStore.setNodeExecuting({
			nodeName: 'AI Agent',
			executionId: '567',
			data: { executionIndex: 0, startTime: Date.parse('2025-04-20T12:34:51.000Z'), source: [] },
		});

		const treeItem = within(await rendered.findByRole('treeitem'));

		expect(treeItem.getByText('AI Agent')).toBeInTheDocument();
		expect(treeItem.getByText('Running')).toBeInTheDocument();

		workflowsStore.updateNodeExecutionData({
			nodeName: 'AI Agent',
			executionId: '567',
			data: {
				executionIndex: 0,
				startTime: Date.parse('2025-04-20T12:34:51.000Z'),
				source: [],
				executionTime: 33,
				executionStatus: 'success',
			},
		});

		expect(await treeItem.findByText('AI Agent')).toBeInTheDocument();
		expect(treeItem.getByText('Success in 33ms')).toBeInTheDocument();

		workflowsStore.setWorkflowExecutionData({
			...aiChatExecutionResponse,
			id: '1234',
			status: 'success',
			finished: true,
			startedAt: new Date('2025-04-20T12:34:50.000Z'),
			stoppedAt: new Date('2025-04-20T12:34:56.000Z'),
		});

		expect(await rendered.findByText('Success in 6s')).toBeInTheDocument();
		expect(rendered.queryByText('AI Agent')).toBeInTheDocument();
	});

	it('should still show logs for a removed node', async () => {
		const router = useRouter();
		const operations = useCanvasOperations({ router });

		workflowsStore.toggleLogsPanelOpen(true);
		workflowsStore.setWorkflow(aiChatWorkflow);
		workflowsStore.setWorkflowExecutionData({
			...aiChatExecutionResponse,
			id: '2345',
			status: 'success',
			finished: true,
			startedAt: new Date('2025-04-20T12:34:50.000Z'),
			stoppedAt: new Date('2025-04-20T12:34:56.000Z'),
		});

		const rendered = render();

		expect(rendered.getByText('AI Agent')).toBeInTheDocument();

		operations.deleteNode(aiAgentNode.id);

		await nextTick();

		expect(workflowsStore.nodesByName['AI Agent']).toBeUndefined();
		expect(rendered.queryByText('AI Agent')).toBeInTheDocument();
	});
});
