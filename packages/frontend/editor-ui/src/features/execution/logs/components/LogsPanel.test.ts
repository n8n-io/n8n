import { renderComponent } from '@/__tests__/render';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { mockedStore } from '@/__tests__/utils';
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { computed, h, nextTick, ref } from 'vue';
import {
	aiAgentNode,
	aiChatExecutionResponse as aiChatExecutionResponseTemplate,
	aiChatWorkflow,
	aiManualExecutionResponse,
	aiManualWorkflow,
	nodeTypes,
} from '../__test__/data';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { IN_PROGRESS_EXECUTION_ID, WorkflowStateKey } from '@/app/constants';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { createRunExecutionData, deepCopy } from 'n8n-workflow';
import { createTestTaskData } from '@/__tests__/mocks';
import { useLogsStore } from '@/app/stores/logs.store';
import { useUIStore } from '@/app/stores/ui.store';
import { LOGS_PANEL_STATE } from '../logs.constants';
import { ChatOptionsSymbol, ChatSymbol } from '@n8n/chat/constants';
import { userEvent } from '@testing-library/user-event';
import type { ChatMessage } from '@n8n/chat/types';
import * as useChatMessaging from '@/features/execution/logs/composables/useChatMessaging';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowState, type WorkflowState } from '@/app/composables/useWorkflowState';
import type * as useNodeHelpersModule from '@/app/composables/useNodeHelpers';

vi.mock('@/app/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return {
		useToast: () => {
			return {
				showMessage,
				showError,
				clearAllStickyNotifications: vi.fn(),
			};
		},
	};
});

const mockCopy = vi.fn();
vi.mock('@vueuse/core', async () => {
	const actual = await vi.importActual('@vueuse/core');
	return {
		...actual,
		useClipboard: () => {
			return {
				copy: mockCopy,
			};
		},
	};
});

vi.mock('@/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		isConnected: true,
	}),
}));

// Use a mutable reference so the mock always returns the current workflowState
const workflowStateRef: { current: WorkflowState | undefined } = { current: undefined };

vi.mock('@/app/composables/useNodeHelpers', async (importOriginal) => {
	const actual = await importOriginal<typeof useNodeHelpersModule>();
	return {
		...actual,
		useNodeHelpers: (opts = {}) =>
			actual.useNodeHelpers({ ...opts, workflowState: workflowStateRef.current }),
	};
});

describe('LogsPanel', () => {
	const VIEWPORT_HEIGHT = 800;

	let pinia: TestingPinia;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let nodeTypeStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let logsStore: ReturnType<typeof mockedStore<typeof useLogsStore>>;
	let ndvStore: ReturnType<typeof mockedStore<typeof useNDVStore>>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
	let workflowState: WorkflowState;

	let aiChatExecutionResponse: typeof aiChatExecutionResponseTemplate;

	function render() {
		const wrapper = renderComponent(LogsPanel, {
			global: {
				provide: {
					[ChatSymbol as symbol]: {},
					[ChatOptionsSymbol as symbol]: {},
					[WorkflowStateKey as symbol]: workflowState,
				},
				plugins: [
					createRouter({
						history: createWebHistory(),
						routes: [{ path: '/', component: () => h('div') }],
					}),
					pinia,
				],
			},
		});

		vi.advanceTimersByTime(1000);

		return wrapper;
	}

	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });

		pinia = createTestingPinia({ stubActions: false, fakeApp: true });

		setActivePinia(pinia);

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowState = useWorkflowState();
		workflowStateRef.current = workflowState;
		workflowState.setWorkflowExecutionData(null);

		logsStore = mockedStore(useLogsStore);
		logsStore.toggleOpen(false);

		nodeTypeStore = mockedStore(useNodeTypesStore);
		nodeTypeStore.setNodeTypes(nodeTypes);

		ndvStore = mockedStore(useNDVStore);

		uiStore = mockedStore(useUIStore);

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

		localStorage.clear();

		aiChatExecutionResponse = deepCopy(aiChatExecutionResponseTemplate);
	});

	afterEach(async () => {
		await flushPromises();
		await vi.runOnlyPendingTimersAsync();
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

	it('should render only output panel of selected node by default', async () => {
		logsStore.toggleOpen(true);
		workflowsStore.setWorkflow(aiManualWorkflow);
		workflowState.setWorkflowExecutionData(aiManualExecutionResponse);

		const rendered = render();

		await waitFor(() =>
			expect(rendered.queryByTestId('log-details-header')).toHaveTextContent('AI Agent'),
		);
		expect(rendered.queryByTestId('log-details-input')).not.toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).toBeInTheDocument();
	});

	it('should render both input and output panel of selected node by default if it is sub node', async () => {
		logsStore.toggleOpen(true);
		workflowsStore.setWorkflow(aiChatWorkflow);
		workflowState.setWorkflowExecutionData(aiChatExecutionResponse);

		const rendered = render();

		await waitFor(() =>
			expect(rendered.queryByTestId('log-details-header')).toHaveTextContent('AI Model'),
		);
		expect(rendered.queryByTestId('log-details-input')).toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).toBeInTheDocument();
	});

	it('toggles panel when header is clicked', async () => {
		workflowsStore.setWorkflow(aiChatWorkflow);

		const rendered = render();

		await fireEvent.click(await rendered.findByTestId('logs-overview-header'));

		expect(await rendered.findByTestId('logs-overview-empty')).toBeInTheDocument();

		await fireEvent.click(await rendered.findByTestId('logs-overview-header'));

		await waitFor(() =>
			expect(rendered.queryByTestId('logs-overview-empty')).not.toBeInTheDocument(),
		);
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
		workflowState.setWorkflowExecutionData(aiChatExecutionResponse);

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
		workflowState.setWorkflowExecutionData(aiChatExecutionResponse);

		const rendered = render();

		await fireEvent.click(await rendered.findByTestId('logs-overview-header'));
		await fireEvent.click(await rendered.findByText('AI Agent'));

		// Click the toggle button to close the panel
		await fireEvent.click(
			within(rendered.getByTestId('log-details')).getByLabelText('Collapse panel'),
		);
		expect(rendered.queryByTestId('logs-overview-body')).not.toBeInTheDocument();

		// Click again to open the panel
		await fireEvent.click(
			within(rendered.getByTestId('logs-overview')).getByLabelText('Open panel'),
		);
		expect(await rendered.findByTestId('logs-overview-body')).toBeInTheDocument();
	});

	it('should open itself by pulling up the resizer', async () => {
		logsStore.toggleOpen(false);

		const rendered = render();

		expect(logsStore.state).toBe(LOGS_PANEL_STATE.CLOSED);
		expect(rendered.queryByTestId('logs-overview-body')).not.toBeInTheDocument();

		await fireEvent.mouseDown(rendered.getByTestId('resize-handle'));

		window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }));
		window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 0, clientY: 0 }));

		await waitFor(() => {
			expect(logsStore.state).toBe(LOGS_PANEL_STATE.ATTACHED);
			expect(rendered.queryByTestId('logs-overview-body')).toBeInTheDocument();
		});
	});

	it('should close itself by pulling down the resizer', async () => {
		logsStore.toggleOpen(true);

		const rendered = render();

		expect(logsStore.state).toBe(LOGS_PANEL_STATE.ATTACHED);
		expect(rendered.queryByTestId('logs-overview-body')).toBeInTheDocument();

		await fireEvent.mouseDown(rendered.getByTestId('resize-handle'));

		window.dispatchEvent(
			new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: VIEWPORT_HEIGHT }),
		);
		window.dispatchEvent(
			new MouseEvent('mouseup', { bubbles: true, clientX: 0, clientY: VIEWPORT_HEIGHT }),
		);

		await waitFor(() => {
			expect(logsStore.state).toBe(LOGS_PANEL_STATE.CLOSED);
			expect(rendered.queryByTestId('logs-overview-body')).not.toBeInTheDocument();
		});
	});

	it('should reflect changes to execution data in workflow store if execution is in progress', async () => {
		logsStore.toggleOpen(true);
		workflowsStore.setWorkflow(aiChatWorkflow);
		workflowState.setWorkflowExecutionData({
			...aiChatExecutionResponse,
			id: IN_PROGRESS_EXECUTION_ID,
			status: 'running',
			finished: false,
			startedAt: new Date('2025-04-20T12:34:50.000Z'),
			stoppedAt: undefined,
			data: createRunExecutionData({
				resultData: { runData: { Chat: [createTestTaskData()] } },
			}),
		});

		const rendered = render();

		await waitFor(() => expect(rendered.getByText('Overview')).toBeInTheDocument());
		await fireEvent.click(rendered.getByText('Overview'));

		expect(rendered.getByText(/Running/)).toBeInTheDocument();
		expect(rendered.queryByText('AI Agent')).not.toBeInTheDocument();

		workflowsStore.addNodeExecutionStartedData({
			nodeName: 'AI Agent',
			executionId: '567',
			data: { executionIndex: 0, startTime: Date.parse('2025-04-20T12:34:51.000Z'), source: [] },
		});

		vi.advanceTimersByTime(2000);

		const lastTreeItem = await waitFor(() => {
			const items = rendered.getAllByRole('treeitem');

			expect(items).toHaveLength(2);
			return within(items[1]);
		});

		expect(lastTreeItem.getByText('AI Agent')).toBeInTheDocument();
		expect(lastTreeItem.getByText(/Running/)).toBeInTheDocument();

		workflowsStore.updateNodeExecutionStatus({
			nodeName: 'AI Agent',
			executionId: '567',
			itemCountByConnectionType: { ai_agent: [1] },
			data: {
				executionIndex: 0,
				startTime: Date.parse('2025-04-20T12:34:51.000Z'),
				source: [],
				executionTime: 33,
				executionStatus: 'success',
			},
		});

		vi.advanceTimersByTime(1000);

		expect(await lastTreeItem.findByText('AI Agent')).toBeInTheDocument();
		expect(await lastTreeItem.findByText('Success')).toBeInTheDocument();
		expect(lastTreeItem.getByText('in 33ms')).toBeInTheDocument();

		workflowState.setWorkflowExecutionData({
			...workflowsStore.workflowExecutionData!,
			id: '1234',
			status: 'success',
			finished: true,
			startedAt: new Date('2025-04-20T12:34:50.000Z'),
			stoppedAt: new Date('2025-04-20T12:34:56.000Z'),
		});

		vi.advanceTimersByTime(1000);

		expect(await rendered.findByText('Success in 6s')).toBeInTheDocument();
		expect(rendered.queryByText('AI Agent')).toBeInTheDocument();
	});

	it('should still show logs for a removed node', async () => {
		const operations = useCanvasOperations();

		workflowsStore.setWorkflow(deepCopy(aiChatWorkflow));
		logsStore.toggleOpen(true);
		workflowState.setWorkflowExecutionData({
			...aiChatExecutionResponse,
			id: '2345',
			status: 'success',
			finished: true,
			startedAt: new Date('2025-04-20T12:34:50.000Z'),
			stoppedAt: new Date('2025-04-20T12:34:56.000Z'),
		});

		const rendered = render();

		expect(await rendered.findByText('AI Agent')).toBeInTheDocument();

		operations.deleteNode(aiAgentNode.id);

		await nextTick();

		expect(workflowsStore.nodesByName['AI Agent']).toBeUndefined();
		expect(rendered.queryByText('AI Agent')).toBeInTheDocument();
	});

	it('should open NDV if the button is clicked', async () => {
		logsStore.toggleOpen(true);
		workflowsStore.setWorkflow(aiChatWorkflow);
		workflowState.setWorkflowExecutionData(aiChatExecutionResponse);

		const rendered = render();
		const aiAgentRow = (await rendered.findAllByRole('treeitem'))[0];

		expect(ndvStore.activeNodeName).toBe(null);
		expect(ndvStore.output.run).toBe(undefined);

		await fireEvent.click(within(aiAgentRow).getAllByLabelText('Open...')[0]);

		await waitFor(() => {
			expect(ndvStore.activeNodeName).toBe('AI Agent');
			expect(ndvStore.output.run).toBe(0);
		});
	});

	it('should toggle subtree when chevron icon button is pressed', async () => {
		logsStore.toggleOpen(true);
		workflowsStore.setWorkflow(aiChatWorkflow);
		workflowState.setWorkflowExecutionData(aiChatExecutionResponse);

		const rendered = render();
		const overview = within(rendered.getByTestId('logs-overview'));

		await waitFor(() => expect(overview.queryAllByRole('treeitem')).toHaveLength(2));
		expect(overview.queryByText('AI Agent')).toBeInTheDocument();
		expect(overview.queryByText('AI Model')).toBeInTheDocument();

		// Close subtree of AI Agent
		await fireEvent.click(overview.getAllByLabelText('Toggle row')[0]);

		await waitFor(() => expect(overview.queryAllByRole('treeitem')).toHaveLength(1));
		expect(overview.queryByText('AI Agent')).toBeInTheDocument();
		expect(overview.queryByText('AI Model')).not.toBeInTheDocument();

		// Re-open subtree of AI Agent
		await fireEvent.click(overview.getAllByLabelText('Toggle row')[0]);

		await waitFor(() => expect(overview.queryAllByRole('treeitem')).toHaveLength(2));
		expect(overview.queryByText('AI Agent')).toBeInTheDocument();
		expect(overview.queryByText('AI Model')).toBeInTheDocument();
	});

	it('should toggle input and output panel when the button is clicked', async () => {
		logsStore.toggleOpen(true);
		workflowsStore.setWorkflow(aiChatWorkflow);
		workflowState.setWorkflowExecutionData(aiChatExecutionResponse);

		const rendered = render();

		await waitFor(() => expect(rendered.getByTestId('log-details-header')).toBeInTheDocument());
		const header = within(rendered.getByTestId('log-details-header'));

		expect(rendered.queryByTestId('log-details-input')).toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).toBeInTheDocument();

		await fireEvent.click(header.getByText('Input'));

		expect(rendered.queryByTestId('log-details-input')).not.toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).toBeInTheDocument();

		await fireEvent.click(header.getByText('Output'));

		expect(rendered.queryByTestId('log-details-input')).toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).not.toBeInTheDocument();
	});

	it('should show new name when a node is renamed', async () => {
		const canvasOperations = useCanvasOperations();

		logsStore.toggleOpen(true);

		// Create deep copy so that renaming doesn't affect other test cases
		workflowsStore.setWorkflow(deepCopy(aiChatWorkflow));
		workflowState.setWorkflowExecutionData(aiChatExecutionResponse);

		const rendered = render();

		await nextTick();

		expect(
			within(rendered.getByTestId('log-details-header')).getByText('AI Model'),
		).toBeInTheDocument();
		expect(within(rendered.getByRole('tree')).getByText('AI Model')).toBeInTheDocument();

		await canvasOperations.renameNode('AI Model', 'Renamed!!');

		await waitFor(() => {
			expect(
				within(rendered.getByTestId('log-details-header')).getByText('Renamed!!'),
			).toBeInTheDocument();
			expect(within(rendered.getByRole('tree')).getByText('Renamed!!')).toBeInTheDocument();
		});
	});

	describe('selection', () => {
		beforeEach(() => {
			logsStore.toggleOpen(true);
			workflowsStore.setWorkflow(aiChatWorkflow);
			workflowState.setWorkflowExecutionData(aiChatExecutionResponse);
		});

		it('should allow to select previous and next row via keyboard shortcut', async () => {
			const { getByTestId, findByRole } = render();
			const overview = getByTestId('logs-overview');

			await waitFor(async () =>
				expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Model/),
			);
			await fireEvent.keyDown(overview, { key: 'K' });
			expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Agent/);
			await fireEvent.keyDown(overview, { key: 'J' });
			expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Model/);
		});

		it('should not select a log for the selected node on canvas if sync is disabled', async () => {
			logsStore.toggleLogSelectionSync(false);

			const { findByRole, rerender } = render();

			expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Model/);
			uiStore.lastSelectedNode = 'AI Agent';
			await rerender({});
			expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Model/);
		});

		it('should automatically select a log for the selected node on canvas if sync is enabled', async () => {
			logsStore.toggleLogSelectionSync(true);

			const { rerender, findByRole } = render();

			expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Model/);
			uiStore.lastSelectedNode = 'AI Agent';
			await rerender({});
			expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Agent/);
		});

		it('should automatically expand and select a log for the selected node on canvas if the log entry is collapsed', async () => {
			logsStore.toggleLogSelectionSync(true);

			const { rerender, findByRole, getByLabelText, findByText, queryByText } = render();

			await fireEvent.click(await findByText('AI Agent'));
			expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Agent/);
			await fireEvent.click(getByLabelText('Toggle row'));
			await rerender({});
			expect(queryByText(/AI Model/)).not.toBeInTheDocument();
			uiStore.lastSelectedNode = 'AI Model';
			await rerender({});
			expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Model/);
		});

		it("should automatically select a log for the selected node on canvas even after it's renamed", async () => {
			const canvasOperations = useCanvasOperations();

			workflowsStore.setWorkflow(deepCopy(aiChatWorkflow));
			workflowState.setWorkflowExecutionData(aiChatExecutionResponse);

			logsStore.toggleLogSelectionSync(true);

			const { rerender, findByRole } = render();

			await waitFor(async () =>
				expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Model/),
			);

			await canvasOperations.renameNode('AI Agent', 'Renamed Agent');
			uiStore.lastSelectedNode = 'Renamed Agent';

			await rerender({});
			expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/Renamed Agent/);
		});
	});

	describe('chat', () => {
		beforeEach(() => {
			logsStore.toggleOpen(true);
			workflowsStore.setWorkflow(aiChatWorkflow);
		});

		describe('rendering', () => {
			it('should render chat when panel is open', () => {
				const { getByTestId } = render();
				expect(getByTestId('canvas-chat-body')).toBeInTheDocument();
			});

			it('should not render chat when panel is closed', async () => {
				const { queryByTestId } = render();
				logsStore.toggleOpen(false);
				await waitFor(() => expect(queryByTestId('canvas-chat-body')).not.toBeVisible());
			});

			it('should show correct input placeholder', async () => {
				const { findByTestId } = render();
				expect(await findByTestId('chat-input')).toBeInTheDocument();
			});
		});

		describe('session management', () => {
			const mockMessages: ChatMessage[] = [
				{
					id: '1',
					text: 'Existing message',
					sender: 'user',
				},
			];

			beforeEach(() => {
				vi.spyOn(useChatMessaging, 'useChatMessaging').mockImplementation(
					({ onNewMessage: addChatMessage }) => {
						addChatMessage(mockMessages[0]);

						return {
							sendMessage: vi.fn(),
							previousMessageIndex: ref(0),
							isLoading: computed(() => false),
							setLoadingState: vi.fn(),
						};
					},
				);
			});

			it('should allow copying session ID', async () => {
				const { getByTestId } = render();

				const sessionIdElement = getByTestId('chat-session-id');

				await userEvent.click(sessionIdElement);

				// Verify clipboard was called with the full session ID
				expect(mockCopy).toHaveBeenCalledTimes(1);
				const copiedSessionId = mockCopy.mock.calls[0][0];
				expect(typeof copiedSessionId).toBe('string');

				// Verify toast was shown
				const toast = useToast();
				expect(toast.showMessage).toHaveBeenCalledWith({
					message: '',
					title: 'Copied to clipboard',
					type: 'success',
				});
			});

			it('should refresh session when messages exist', async () => {
				const { getByTestId } = render();

				const originalSessionId = getByTestId('chat-session-id').textContent;
				await userEvent.click(getByTestId('refresh-session-button'));

				expect(getByTestId('chat-session-id').textContent).not.toEqual(originalSessionId);
			});
		});
	});
});
