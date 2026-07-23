import { fireEvent, waitFor, within } from '@testing-library/vue';
import { renderComponent } from '@/__tests__/render';
import LogDetailsPanel from './LogDetailsPanel.vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { computed, h } from 'vue';
import {
	createMockNodeTypes,
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
	createTestWorkflowObject,
	defaultNodeTypes,
	mockLoadedNodeType,
} from '@/__tests__/mocks';
import { LOG_DETAILS_PANEL_STATE } from '@/features/execution/logs/logs.constants';
import { type GroupLogEntry, type NodeLogEntry, isGroupLog } from '../logs.types';
import { createTestLogEntry } from '../__test__/mocks';
import { createLogTree } from '../logs.utils';
import { createRunExecutionData, NodeConnectionTypes } from 'n8n-workflow';
import { HTML_NODE_TYPE } from '@/app/constants';
import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { AGENT_SESSION_DETAIL_VIEW } from '@/features/agents/constants';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';

const redactionState = vi.hoisted(() => ({ isRedacted: false }));
vi.mock('@/features/execution/executions/composables/useExecutionRedaction', () => ({
	useExecutionRedaction: () => ({
		isRedacted: redactionState.isRedacted,
		canReveal: true,
		isDynamicCredentials: false,
		revealData: vi.fn(),
	}),
}));

describe('LogDetailsPanel', () => {
	let pinia: TestingPinia;

	const aiNode = createTestNode({ name: 'AI Agent' });
	const workflowData = createTestWorkflow({
		nodes: [createTestNode({ name: 'Chat Trigger' }), aiNode],
		connections: { 'Chat Trigger': { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] } },
	});
	const chatNodeRunData = createTestTaskData({
		executionStatus: 'success',
		executionTime: 0,
		data: { main: [[{ json: { response: 'hey' } }]] },
	});
	const aiNodeRunData = createTestTaskData({
		executionStatus: 'success',
		executionTime: 10,
		data: { main: [[{ json: { response: 'Hello!' } }]] },
		source: [{ previousNode: 'Chat Trigger' }],
	});

	function createLogEntry(data: Partial<NodeLogEntry> = {}) {
		return createTestLogEntry({
			workflow: createTestWorkflowObject(workflowData),
			execution: createRunExecutionData({
				resultData: {
					runData: {
						'Chat Trigger': [chatNodeRunData],
						'AI Agent': [aiNodeRunData],
					},
				},
			}),
			...data,
		});
	}

	function render(props: InstanceType<typeof LogDetailsPanel>['$props']) {
		const rendered = renderComponent(LogDetailsPanel, {
			props,
			global: {
				provide: {
					[WorkflowIdKey as unknown as string]: computed(() => 'test-workflow-id'),
				},
				plugins: [
					createRouter({
						history: createWebHistory(),
						routes: [
							{ path: '/', component: () => h('div') },
							{
								name: AGENT_SESSION_DETAIL_VIEW,
								path: '/projects/:projectId/agents/:agentId/sessions/:threadId',
								component: () => h('div'),
							},
						],
					}),
					pinia,
				],
			},
		});
		const container = rendered.getByTestId('log-details');

		Object.defineProperty(container, 'offsetWidth', {
			configurable: true,
			get() {
				return 1000;
			},
		});
		vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
			x: 0,
			width: 1000,
		} as DOMRect);

		return rendered;
	}

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false, fakeApp: true });
		redactionState.isRedacted = false;
	});

	it('should show name, run status, input, and output of the node', async () => {
		const rendered = render({
			isOpen: true,
			logEntry: createLogEntry({ node: aiNode, runIndex: 0, runData: aiNodeRunData }),
			panels: LOG_DETAILS_PANEL_STATE.BOTH,
			collapsingInputTableColumnName: null,
			collapsingOutputTableColumnName: null,
			isHeaderClickable: true,
		});

		const header = within(rendered.getByTestId('log-details-header'));
		const inputPanel = within(rendered.getByTestId('log-details-input'));
		const outputPanel = within(rendered.getByTestId('log-details-output'));

		expect(header.getByText('AI Agent')).toBeInTheDocument();
		expect(header.getByText('Success in 10ms')).toBeInTheDocument();
		expect(await inputPanel.findByText('hey')).toBeInTheDocument();
		expect(await outputPanel.findByText('Hello!')).toBeInTheDocument();
	});

	it('should show a message in the output panel and data in the input panel when node is running', async () => {
		const rendered = render({
			isOpen: true,
			logEntry: createLogEntry({
				node: aiNode,
				runIndex: 0,
				runData: { ...aiNodeRunData, executionStatus: 'running' },
			}),
			panels: LOG_DETAILS_PANEL_STATE.BOTH,
			collapsingInputTableColumnName: null,
			collapsingOutputTableColumnName: null,
			isHeaderClickable: true,
		});

		const inputPanel = within(rendered.getByTestId('log-details-input'));
		const outputPanel = within(rendered.getByTestId('log-details-output'));

		expect(await inputPanel.findByText('hey')).toBeInTheDocument();
		expect(await outputPanel.findByText('Executing node...')).toBeInTheDocument();
	});

	it('should close input panel by dragging the divider to the left end', async () => {
		const rendered = render({
			isOpen: true,
			logEntry: createLogEntry({ node: aiNode, runIndex: 0, runData: aiNodeRunData }),
			panels: LOG_DETAILS_PANEL_STATE.BOTH,
			collapsingInputTableColumnName: null,
			collapsingOutputTableColumnName: null,
			isHeaderClickable: true,
		});

		await fireEvent.mouseDown(rendered.getByTestId('resize-handle'));

		window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }));
		window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 0, clientY: 0 }));

		expect(rendered.emitted()).toEqual({ toggleInputOpen: [[false]] });
	});

	it('should close output panel by dragging the divider to the right end', async () => {
		const rendered = render({
			isOpen: true,
			logEntry: createLogEntry({ node: aiNode, runIndex: 0, runData: aiNodeRunData }),
			panels: LOG_DETAILS_PANEL_STATE.BOTH,
			collapsingInputTableColumnName: null,
			collapsingOutputTableColumnName: null,
			isHeaderClickable: true,
		});

		await fireEvent.mouseDown(rendered.getByTestId('resize-handle'));

		window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 1000, clientY: 0 }));
		window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 1000, clientY: 0 }));

		expect(rendered.emitted()).toEqual({ toggleOutputOpen: [[false]] });
	});

	it('should display correct message when input data is empty', async () => {
		const nodeA = createTestNode({ name: 'A' });
		const nodeB = createTestNode({ name: 'B' });
		const runDataA = createTestTaskData({ data: { [NodeConnectionTypes.Main]: [[{ json: {} }]] } });
		const runDataB = createTestTaskData({ source: [{ previousNode: 'A' }] });
		const workflow = createTestWorkflowObject({ nodes: [nodeA, nodeB] });
		const rendered = render({
			isOpen: true,
			logEntry: createLogEntry({
				node: nodeB,
				runIndex: 0,
				runData: runDataB,
				workflow,
				execution: createRunExecutionData({
					resultData: { runData: { A: [runDataA], B: [runDataB] } },
				}),
			}),
			panels: LOG_DETAILS_PANEL_STATE.BOTH,
			collapsingInputTableColumnName: null,
			collapsingOutputTableColumnName: null,
			isHeaderClickable: true,
		});

		expect(
			await within(rendered.getByTestId('log-details-input')).findByText(
				"No fields - item(s) exist, but they're empty",
			),
		).toBeInTheDocument();
	});

	describe('messageAnAgent View Session button', () => {
		const messageAgentNode = createTestNode({
			name: 'Message an Agent',
			type: MESSAGE_AN_AGENT_NODE_TYPE,
		});
		const messageAgentRunData = createTestTaskData({
			executionStatus: 'success',
			data: {
				main: [
					[
						{
							json: {
								response: 'hi',
								session: {
									agentId: 'agent-1',
									projectId: 'project-1',
									sessionId: 'thread-1',
								},
							},
						},
					],
				],
			},
		});

		const baseProps = {
			isOpen: true,
			panels: LOG_DETAILS_PANEL_STATE.BOTH,
			collapsingInputTableColumnName: null,
			collapsingOutputTableColumnName: null,
			isHeaderClickable: true,
		};

		it('renders a View Session button when run output carries a session block', () => {
			const rendered = render({
				...baseProps,
				logEntry: createLogEntry({
					node: messageAgentNode,
					runIndex: 0,
					runData: messageAgentRunData,
					execution: createRunExecutionData({
						resultData: { runData: { 'Message an Agent': [messageAgentRunData] } },
					}),
				}),
			});

			expect(rendered.queryByTestId('log-details-view-agent-session')).toBeInTheDocument();
		});

		it('does not render the button for nodes that are not messageAnAgent', () => {
			const rendered = render({
				...baseProps,
				logEntry: createLogEntry({ node: aiNode, runIndex: 0, runData: aiNodeRunData }),
			});

			expect(rendered.queryByTestId('log-details-view-agent-session')).not.toBeInTheDocument();
		});

		it('does not render the button when the session block is missing', () => {
			const noSessionRunData = createTestTaskData({
				executionStatus: 'success',
				data: { main: [[{ json: { response: 'hi' } }]] },
			});
			const rendered = render({
				...baseProps,
				logEntry: createLogEntry({
					node: messageAgentNode,
					runIndex: 0,
					runData: noSessionRunData,
					execution: createRunExecutionData({
						resultData: { runData: { 'Message an Agent': [noSessionRunData] } },
					}),
				}),
			});

			expect(rendered.queryByTestId('log-details-view-agent-session')).not.toBeInTheDocument();
		});
	});

	it('should render output data in HTML mode for HTML node', async () => {
		const nodeA = createTestNode({ name: 'A' });
		const nodeB = createTestNode({
			name: 'B',
			type: HTML_NODE_TYPE,
		});
		const runDataA = createTestTaskData({ data: { [NodeConnectionTypes.Main]: [[{ json: {} }]] } });
		const runDataB = createTestTaskData({
			data: { [NodeConnectionTypes.Main]: [[{ json: { html: '<h1>Hi!</h1>' } }]] },
			source: [{ previousNode: 'A' }],
		});
		const workflow = createTestWorkflowObject({
			nodes: [nodeA, nodeB],
			nodeTypes: createMockNodeTypes({
				...defaultNodeTypes,
				[HTML_NODE_TYPE]: mockLoadedNodeType(HTML_NODE_TYPE),
			}),
		});
		const execution = createRunExecutionData({
			resultData: { runData: { A: [runDataA], B: [runDataB] } },
		});
		const logA = createLogEntry({ node: nodeA, runData: runDataA, workflow, execution });
		const logB = createLogEntry({ node: nodeB, runData: runDataB, workflow, execution });

		// HACK: Setting parameters after creating workflow because validation removes parameters that are not define in node types.
		nodeB.parameters = { operation: 'generateHtmlTemplate' };

		const props = {
			isOpen: true,
			panels: LOG_DETAILS_PANEL_STATE.BOTH,
			collapsingInputTableColumnName: null,
			collapsingOutputTableColumnName: null,
			isHeaderClickable: true,
		};

		const rendered = render({ ...props, logEntry: logB });

		await waitFor(() => expect(rendered.container.querySelectorAll('iframe')).toHaveLength(1));
		await rendered.rerender({ ...props, logEntry: logA });
		await waitFor(() => expect(rendered.container.querySelectorAll('iframe')).toHaveLength(0));

		// Re-selecting node B should render HTML again
		await rendered.rerender({ ...props, logEntry: logB });
		await waitFor(() => expect(rendered.container.querySelectorAll('iframe')).toHaveLength(1));
	});

	describe('canvas group details', () => {
		function buildGroupEntry(options: { fanOut?: boolean } = {}): GroupLogEntry {
			const nodes = ['A', 'B', 'C', 'D', 'E'].map((name) => createTestNode({ id: name, name }));
			const connections = options.fanOut
				? {
						A: {
							main: [
								[
									{ node: 'B', type: NodeConnectionTypes.Main, index: 0 },
									{ node: 'C', type: NodeConnectionTypes.Main, index: 0 },
								],
							],
						},
						B: { main: [[{ node: 'D', type: NodeConnectionTypes.Main, index: 0 }]] },
						C: { main: [[{ node: 'E', type: NodeConnectionTypes.Main, index: 0 }]] },
					}
				: {
						A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
						B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
						C: { main: [[{ node: 'D', type: NodeConnectionTypes.Main, index: 0 }]] },
					};
			const workflow = createTestWorkflowObject({ id: 'w1', nodes, connections });
			const runData = {
				A: [createTestTaskData({ startTime: 0, executionIndex: 0 })],
				B: [
					createTestTaskData({
						startTime: 1,
						executionIndex: 1,
						source: [{ previousNode: 'A', previousNodeRun: 0 }],
					}),
				],
				C: [
					createTestTaskData({
						startTime: 2,
						executionIndex: 2,
						source: [{ previousNode: options.fanOut ? 'A' : 'B', previousNodeRun: 0 }],
					}),
				],
				...(options.fanOut
					? {
							D: [
								createTestTaskData({
									startTime: 3,
									executionIndex: 3,
									source: [{ previousNode: 'B', previousNodeRun: 0 }],
								}),
							],
							E: [
								createTestTaskData({
									startTime: 4,
									executionIndex: 4,
									source: [{ previousNode: 'C', previousNodeRun: 0 }],
								}),
							],
						}
					: {
							D: [
								createTestTaskData({
									startTime: 3,
									executionIndex: 3,
									source: [{ previousNode: 'C', previousNodeRun: 0 }],
								}),
							],
						}),
			};
			const logs = createLogTree(
				workflow,
				createTestWorkflowExecutionResponse({
					id: 'e1',
					data: createRunExecutionData({ resultData: { runData } }),
				}),
				{},
				{},
				undefined,
				[{ id: 'group-1', name: 'My Group', nodeIds: ['B', 'C'] }],
			);
			const groupEntry = logs.find(isGroupLog);
			if (!groupEntry) {
				throw new Error('expected a group log entry');
			}
			return groupEntry;
		}

		it('shows the group name in the header', () => {
			const rendered = render({
				isOpen: true,
				logEntry: buildGroupEntry(),
				panels: LOG_DETAILS_PANEL_STATE.BOTH,
				collapsingInputTableColumnName: null,
				collapsingOutputTableColumnName: null,
				isHeaderClickable: true,
			});

			expect(
				within(rendered.getByTestId('log-details-header')).getByText('My Group'),
			).toBeInTheDocument();
		});

		it('does not show a boundary selector for a single crossing', () => {
			const rendered = render({
				isOpen: true,
				logEntry: buildGroupEntry(),
				panels: LOG_DETAILS_PANEL_STATE.BOTH,
				collapsingInputTableColumnName: null,
				collapsingOutputTableColumnName: null,
				isHeaderClickable: true,
			});

			expect(rendered.queryByTestId('log-details-group-input-select')).not.toBeInTheDocument();
			expect(rendered.queryByTestId('log-details-group-output-select')).not.toBeInTheDocument();
		});

		it('shows a boundary selector when multiple nodes cross the group edge', () => {
			const rendered = render({
				isOpen: true,
				logEntry: buildGroupEntry({ fanOut: true }),
				panels: LOG_DETAILS_PANEL_STATE.BOTH,
				collapsingInputTableColumnName: null,
				collapsingOutputTableColumnName: null,
				isHeaderClickable: true,
			});

			expect(rendered.getByTestId('log-details-group-input-select')).toBeInTheDocument();
			expect(rendered.getByTestId('log-details-group-output-select')).toBeInTheDocument();
		});

		it('shows the reveal overlay for a redacted group in the two-pane view', () => {
			redactionState.isRedacted = true;

			const rendered = render({
				isOpen: true,
				logEntry: buildGroupEntry(),
				panels: LOG_DETAILS_PANEL_STATE.BOTH,
				collapsingInputTableColumnName: null,
				collapsingOutputTableColumnName: null,
				isHeaderClickable: true,
			});

			expect(rendered.getByTestId('ndv-data-redacted')).toBeInTheDocument();
		});

		it('does not show the reveal overlay for a group that is not redacted', () => {
			const rendered = render({
				isOpen: true,
				logEntry: buildGroupEntry(),
				panels: LOG_DETAILS_PANEL_STATE.BOTH,
				collapsingInputTableColumnName: null,
				collapsingOutputTableColumnName: null,
				isHeaderClickable: true,
			});

			expect(rendered.queryByTestId('ndv-data-redacted')).not.toBeInTheDocument();
		});
	});
});
