import { fireEvent, waitFor, within } from '@testing-library/vue';
import { renderComponent } from '@/__tests__/render';
import LogDetailsPanel from './LogDetailsPanel.vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { h } from 'vue';
import {
	createMockNodeTypes,
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowObject,
	defaultNodeTypes,
	mockLoadedNodeType,
} from '@/__tests__/mocks';
import { LOG_DETAILS_PANEL_STATE } from '@/features/logs/logs.constants';
import type { LogEntry } from '../logs.types';
import { createTestLogEntry } from '../__test__/mocks';
import { NodeConnectionTypes } from 'n8n-workflow';
import { HTML_NODE_TYPE } from '@/constants';

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

	function createLogEntry(data: Partial<LogEntry> = {}) {
		return createTestLogEntry({
			workflow: createTestWorkflowObject(workflowData),
			execution: {
				resultData: {
					runData: {
						'Chat Trigger': [chatNodeRunData],
						'AI Agent': [aiNodeRunData],
					},
				},
			},
			...data,
		});
	}

	function render(props: InstanceType<typeof LogDetailsPanel>['$props']) {
		const rendered = renderComponent(LogDetailsPanel, {
			props,
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
				execution: { resultData: { runData: { A: [runDataA], B: [runDataB] } } },
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
		const execution = { resultData: { runData: { A: [runDataA], B: [runDataB] } } };
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
});
