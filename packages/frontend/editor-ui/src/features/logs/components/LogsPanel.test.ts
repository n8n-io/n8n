import { renderComponent } from '@/__tests__/render';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { mockedStore } from '@/__tests__/utils';
import LogsPanel from '@/features/logs/components/LogsPanel.vue';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed, h, nextTick, ref } from 'vue';
import {
	aiAgentNode,
	aiChatExecutionResponse,
	aiChatWorkflow,
	aiManualExecutionResponse,
	aiManualWorkflow,
	chatTriggerNode,
	nodeTypes,
} from '../__test__/data';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { IN_PROGRESS_EXECUTION_ID } from '@/constants';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useNDVStore } from '@/stores/ndv.store';
import { deepCopy } from 'n8n-workflow';
import { createTestTaskData } from '@/__tests__/mocks';
import { useLogsStore } from '@/stores/logs.store';
import { useUIStore } from '@/stores/ui.store';
import { LOGS_PANEL_STATE } from '../logs.constants';
import { ChatOptionsSymbol, ChatSymbol } from '@n8n/chat/constants';
import { userEvent } from '@testing-library/user-event';
import type { ChatMessage } from '@n8n/chat/types';
import * as useChatMessaging from '@/features/logs/composables/useChatMessaging';
import { chatEventBus } from '@n8n/chat/event-buses';
import { useToast } from '@/composables/useToast';

vi.mock('@/composables/useToast', () => {
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

vi.mock('@/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		isConnected: true,
	}),
}));

describe('LogsPanel', () => {
	const VIEWPORT_HEIGHT = 800;

	let pinia: TestingPinia;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let nodeTypeStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let logsStore: ReturnType<typeof mockedStore<typeof useLogsStore>>;
	let ndvStore: ReturnType<typeof mockedStore<typeof useNDVStore>>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

	function render() {
		return renderComponent(LogsPanel, {
			global: {
				provide: {
					[ChatSymbol as symbol]: {},
					[ChatOptionsSymbol as symbol]: {},
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
	}

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false, fakeApp: true });

		setActivePinia(pinia);

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.setWorkflowExecutionData(null);

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
	});

	afterEach(() => {
		vi.clearAllMocks();
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
		workflowsStore.setWorkflowExecutionData(aiManualExecutionResponse);

		const rendered = render();

		expect(rendered.queryByTestId('log-details-header')).toHaveTextContent('AI Agent');
		expect(rendered.queryByTestId('log-details-input')).not.toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).toBeInTheDocument();
	});

	it('should render both input and output panel of selected node by default if it is sub node', async () => {
		logsStore.toggleOpen(true);
		workflowsStore.setWorkflow(aiChatWorkflow);
		workflowsStore.setWorkflowExecutionData(aiChatExecutionResponse);

		const rendered = render();

		expect(rendered.queryByTestId('log-details-header')).toHaveTextContent('AI Model');
		expect(rendered.queryByTestId('log-details-input')).toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).toBeInTheDocument();
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
		workflowsStore.setWorkflowExecutionData({
			...aiChatExecutionResponse,
			id: IN_PROGRESS_EXECUTION_ID,
			status: 'running',
			finished: false,
			startedAt: new Date('2025-04-20T12:34:50.000Z'),
			stoppedAt: undefined,
			data: {
				resultData: { runData: { Chat: [createTestTaskData()] } },
			},
		});

		const rendered = render();

		await fireEvent.click(rendered.getByText('Overview'));

		expect(rendered.getByText(/Running/)).toBeInTheDocument();
		expect(rendered.queryByText('AI Agent')).not.toBeInTheDocument();

		workflowsStore.addNodeExecutionStartedData({
			nodeName: 'AI Agent',
			executionId: '567',
			data: { executionIndex: 0, startTime: Date.parse('2025-04-20T12:34:51.000Z'), source: [] },
		});

		const lastTreeItem = await waitFor(() => {
			const items = rendered.getAllByRole('treeitem');

			expect(items).toHaveLength(2);
			return within(items[1]);
		});

		expect(lastTreeItem.getByText('AI Agent')).toBeInTheDocument();
		expect(lastTreeItem.getByText(/Running/)).toBeInTheDocument();

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
		expect(await lastTreeItem.findByText('AI Agent')).toBeInTheDocument();
		expect(await lastTreeItem.findByText('Success')).toBeInTheDocument();
		expect(lastTreeItem.getByText('in 33ms')).toBeInTheDocument();

		workflowsStore.setWorkflowExecutionData({
			...workflowsStore.workflowExecutionData!,
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
		const operations = useCanvasOperations();

		logsStore.toggleOpen(true);
		workflowsStore.setWorkflow(deepCopy(aiChatWorkflow));
		workflowsStore.setWorkflowExecutionData({
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
		workflowsStore.setWorkflowExecutionData(aiChatExecutionResponse);

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
		workflowsStore.setWorkflowExecutionData(aiChatExecutionResponse);

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
		workflowsStore.setWorkflowExecutionData(aiChatExecutionResponse);

		const rendered = render();

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
		workflowsStore.setWorkflowExecutionData(deepCopy(aiChatExecutionResponse));

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
			workflowsStore.setWorkflowExecutionData(aiChatExecutionResponse);
		});

		it('should allow to select previous and next row via keyboard shortcut', async () => {
			const { getByTestId, findByRole } = render();
			const overview = getByTestId('logs-overview');

			expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Model/);
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
			workflowsStore.setWorkflowExecutionData(deepCopy(aiChatExecutionResponse));

			logsStore.toggleLogSelectionSync(true);

			const { rerender, findByRole } = render();

			expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Model/);

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
				await waitFor(() => expect(queryByTestId('canvas-chat-body')).not.toBeInTheDocument());
			});

			it('should show correct input placeholder', async () => {
				const { findByTestId } = render();
				expect(await findByTestId('chat-input')).toBeInTheDocument();
			});
		});

		describe('message handling', () => {
			beforeEach(() => {
				vi.spyOn(chatEventBus, 'emit');
				workflowsStore.runWorkflow.mockResolvedValue({ executionId: 'test-execution-id' });
			});

			it('should send message and show response', async () => {
				const { findByTestId, findByText, getByText } = render();

				// Send message
				const input = await findByTestId('chat-input');
				await userEvent.type(input, 'Hello AI!');

				await userEvent.keyboard('{Enter}');

				// Verify message and response
				expect(await findByText('Hello AI!')).toBeInTheDocument();
				workflowsStore.setWorkflowExecutionData({ ...aiChatExecutionResponse, status: 'success' });
				await waitFor(() => expect(getByText('AI response message')).toBeInTheDocument());

				// Verify workflow execution
				expect(workflowsStore.runWorkflow).toHaveBeenCalledWith(
					expect.objectContaining({
						runData: undefined,
						triggerToStartFrom: {
							name: 'Chat',
							data: {
								data: {
									main: [
										[
											{
												json: {
													action: 'sendMessage',
													chatInput: 'Hello AI!',
													sessionId: expect.any(String),
												},
											},
										],
									],
								},
								executionIndex: 0,
								executionStatus: 'success',
								executionTime: 0,
								source: [null],
								startTime: expect.any(Number),
							},
						},
					}),
				);
			});

			it('should show loading state during message processing', async () => {
				const { findByTestId, queryByTestId } = render();

				// Send message
				const input = await findByTestId('chat-input');
				await userEvent.type(input, 'Test message');
				await userEvent.keyboard('{Enter}');

				await waitFor(() => expect(queryByTestId('chat-message-typing')).toBeInTheDocument());

				workflowsStore.setActiveExecutionId(undefined);
				workflowsStore.setWorkflowExecutionData({ ...aiChatExecutionResponse, status: 'success' });

				await waitFor(() => expect(queryByTestId('chat-message-typing')).not.toBeInTheDocument());
			});

			it('should handle workflow execution errors', async () => {
				workflowsStore.runWorkflow.mockRejectedValueOnce(new Error());

				const { findByTestId } = render();

				const input = await findByTestId('chat-input');
				await userEvent.type(input, 'Hello AI!');
				await userEvent.keyboard('{Enter}');

				const toast = useToast();
				expect(toast.showError).toHaveBeenCalledWith(new Error(), 'Problem running workflow');
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
				vi.spyOn(useChatMessaging, 'useChatMessaging').mockImplementation(({ messages }) => {
					messages.value.push(...mockMessages);

					return {
						sendMessage: vi.fn(),
						previousMessageIndex: ref(0),
						isLoading: computed(() => false),
					};
				});
			});

			it('should allow copying session ID', async () => {
				const clipboardSpy = vi.fn();
				document.execCommand = clipboardSpy;
				const { getByTestId } = render();

				await userEvent.click(getByTestId('chat-session-id'));
				const toast = useToast();
				expect(clipboardSpy).toHaveBeenCalledWith('copy');
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

		describe('file handling', () => {
			beforeEach(() => {
				vi.spyOn(useChatMessaging, 'useChatMessaging').mockReturnValue({
					sendMessage: vi.fn(),
					previousMessageIndex: ref(0),
					isLoading: computed(() => false),
				});

				logsStore.state = LOGS_PANEL_STATE.ATTACHED;
				workflowsStore.allowFileUploads = true;
			});

			it('should enable file uploads when allowed by chat trigger node', async () => {
				workflowsStore.setNodes(aiChatWorkflow.nodes);
				workflowsStore.setNodeParameters({
					name: chatTriggerNode.name,
					value: { options: { allowFileUploads: true } },
				});

				const { getByTestId, queryByTestId } = render();

				expect(getByTestId('canvas-chat')).toBeInTheDocument();
				expect(getByTestId('chat-attach-file-button')).toBeInTheDocument();

				workflowsStore.setNodeParameters({
					name: chatTriggerNode.name,
					value: { options: { allowFileUploads: false } },
				});
				await waitFor(() =>
					expect(queryByTestId('chat-attach-file-button')).not.toBeInTheDocument(),
				);
			});
		});

		describe('message history handling', () => {
			it('should properly navigate through message history with wrap-around', async () => {
				workflowsStore.resetChatMessages();
				workflowsStore.appendChatMessage('Message 1');
				workflowsStore.appendChatMessage('Message 2');
				workflowsStore.appendChatMessage('Message 3');

				const { findByTestId } = render();
				const input = await findByTestId('chat-input');

				chatEventBus.emit('focusInput');

				// First up should show most recent message
				await userEvent.keyboard('{ArrowUp}');
				expect(input).toHaveValue('Message 3');

				// Second up should show second most recent
				await userEvent.keyboard('{ArrowUp}');
				expect(input).toHaveValue('Message 2');

				// Third up should show oldest message
				await userEvent.keyboard('{ArrowUp}');
				expect(input).toHaveValue('Message 1');

				// Fourth up should wrap around to most recent
				await userEvent.keyboard('{ArrowUp}');
				expect(input).toHaveValue('Message 3');

				// Down arrow should go in reverse
				await userEvent.keyboard('{ArrowDown}');
				expect(input).toHaveValue('Message 1');
			});

			it('should reset message history navigation on new input', async () => {
				workflowsStore.resetChatMessages();
				workflowsStore.appendChatMessage('Message 1');
				workflowsStore.appendChatMessage('Message 2');

				const { findByTestId } = render();
				const input = await findByTestId('chat-input');

				chatEventBus.emit('focusInput');

				// Navigate to oldest message
				await userEvent.keyboard('{ArrowUp}'); // Most recent
				await userEvent.keyboard('{ArrowUp}'); // Oldest
				expect(input).toHaveValue('Message 1');

				await userEvent.type(input, 'New message');
				await userEvent.keyboard('{Enter}');

				await userEvent.keyboard('{ArrowUp}');
				expect(input).toHaveValue('Message 2');
			});
		});

		describe('message reuse and repost', () => {
			const sendMessageSpy = vi.fn();

			beforeEach(() => {
				const mockMessages: ChatMessage[] = [
					{
						id: '1',
						text: 'Original message',
						sender: 'user',
					},
					{
						id: '2',
						text: 'AI response',
						sender: 'bot',
					},
				];
				vi.spyOn(useChatMessaging, 'useChatMessaging').mockImplementation(({ messages }) => {
					messages.value.push(...mockMessages);

					return {
						sendMessage: sendMessageSpy,
						previousMessageIndex: ref(0),
						isLoading: computed(() => false),
					};
				});
			});

			it('should repost user message with new execution', async () => {
				const { findByTestId } = render();
				const repostButton = await findByTestId('repost-message-button');

				await userEvent.click(repostButton);

				expect(sendMessageSpy).toHaveBeenCalledWith('Original message');
			});

			it('should show message options only for appropriate messages', async () => {
				const { findByText, container } = render();

				await findByText('Original message');
				const userMessage = container.querySelector('.chat-message-from-user');
				expect(
					userMessage?.querySelector('[data-test-id="repost-message-button"]'),
				).toBeInTheDocument();
				expect(
					userMessage?.querySelector('[data-test-id="reuse-message-button"]'),
				).toBeInTheDocument();

				await findByText('AI response');
				const botMessage = container.querySelector('.chat-message-from-bot');
				expect(
					botMessage?.querySelector('[data-test-id="repost-message-button"]'),
				).not.toBeInTheDocument();
				expect(
					botMessage?.querySelector('[data-test-id="reuse-message-button"]'),
				).not.toBeInTheDocument();
			});
		});

		describe('keyboard shortcuts', () => {
			it('should handle Enter key with modifier to start new line', async () => {
				const { findByTestId } = render();

				const input = await findByTestId('chat-input');
				await userEvent.type(input, 'Line 1');
				await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
				await userEvent.type(input, 'Line 2');

				expect(input).toHaveValue('Line 1\nLine 2');
			});
		});
	});
});
