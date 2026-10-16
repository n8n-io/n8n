import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import SessionDetailPanel from '../components/SessionDetailPanel.vue';
import AiThinkingBlock from '@/features/ai/shared/components/AiThinkingBlock.vue';
import AiReasoningBlock from '@/features/ai/shared/components/AiReasoningBlock.vue';
import type { TimelineItem } from '../session-timeline.types';

const fetchExecution = vi.fn();
vi.mock('@/features/execution/executions/executions.store', () => ({
	useExecutionsStore: () => ({ fetchExecution }),
}));

beforeEach(() => {
	fetchExecution.mockReset();
	fetchExecution.mockResolvedValue({ id: 'exec-1', data: {} });
});

vi.mock('../components/ToolIoView.vue', () => ({
	default: {
		name: 'ToolIoView',
		props: ['input', 'nodeParameters'],
		template: '<div data-test-id="tool-io-view"></div>',
	},
}));
vi.mock('vue-markdown-render', () => ({
	default: { template: '<div data-test-id="markdown"><slot /></div>' },
}));
// Reads useRootStore for download URLs — irrelevant to panel behavior.
vi.mock('../components/AgentChatMessageAttachments.vue', () => ({
	default: { template: '<div data-test-id="user-attachments"></div>' },
}));

function makeRouter(): Router {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{
				path: '/workflow/:workflowId/executions/:executionId',
				name: 'ExecutionPreview',
				component: { template: '<div/>' },
			},
		],
	});
}

function mountIt(
	item: TimelineItem | null,
	extraProps: { projectId?: string; agentId?: string } = {},
) {
	return mount(SessionDetailPanel, {
		props: { item, ...extraProps },
		global: { plugins: [makeRouter()] },
	});
}

describe('SessionDetailPanel — user attachments', () => {
	const userItem: TimelineItem = {
		kind: 'user',
		executionId: 'e1',
		timestamp: 0,
		content: 'look at this',
		attachments: [{ id: 'att-1', fileName: 'photo.png', mimeType: 'image/png', sizeBytes: 33 }],
	};

	it('renders the attachments block for a user item with files', () => {
		const w = mountIt(userItem, { projectId: 'p1', agentId: 'a1' });
		expect(w.find('[data-test-id="user-attachments"]').exists()).toBe(true);
	});

	it('skips the attachments block without the project/agent scope for download URLs', () => {
		const w = mountIt(userItem);
		expect(w.find('[data-test-id="user-attachments"]').exists()).toBe(false);
	});

	it('skips the attachments block for user items without files', () => {
		const w = mountIt({ ...userItem, attachments: undefined }, { projectId: 'p1', agentId: 'a1' });
		expect(w.find('[data-test-id="user-attachments"]').exists()).toBe(false);
	});
});

describe('SessionDetailPanel — reasoning', () => {
	it.each(['The answer.', '{"answer":42}', ''])(
		'shows collapsed reasoning below response content %j',
		async (content) => {
			const thinkingSegments = [
				{ id: 'r-1', content: 'Check the facts. Then answer.', startTime: 1000, endTime: 4000 },
			];
			const w = mountIt({
				kind: 'agent',
				executionId: 'e1',
				timestamp: 5000,
				content,
				thinkingSegments,
			});
			const thinking = w.findComponent(AiThinkingBlock);
			expect(thinking.props()).toMatchObject({
				segments: thinkingSegments,
				active: false,
				durationSec: 3,
			});
			const header = thinking.find('[data-test-id="thinking-block-header"]');
			expect(header.attributes('aria-expanded')).toBe('false');
			await header.trigger('click');
			expect(header.attributes('aria-expanded')).toBe('true');
			const reasoning = thinking.findComponent(AiReasoningBlock);
			expect(reasoning.props('entry')).toEqual(thinkingSegments[0]);
			await reasoning.find('button').trigger('click');
			expect(reasoning.text()).toContain('Then answer.');
			w.unmount();
		},
	);

	it('shows no reasoning section for a message without traces', () => {
		const w = mountIt({ kind: 'agent', executionId: 'e1', timestamp: 0, content: 'The answer.' });
		expect(w.findComponent(AiThinkingBlock).exists()).toBe(false);
	});
});

describe('SessionDetailPanel — integration action cards', () => {
	const cardInput = {
		action: 'respond',
		input: {
			message: {
				card: {
					title: 'Renewal Risk',
					components: [{ type: 'button', label: 'Approve', value: 'approve' }],
				},
			},
		},
	};

	it('renders the interaction card for any <platform>_action tool call', () => {
		const w = mountIt({
			kind: 'tool',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'slack_action',
			toolInput: cardInput,
			toolOutput: { type: 'button', value: 'approve' },
		});
		expect(w.text()).toContain('Renewal Risk');
		expect(w.text()).toContain('Approve');
	});

	it('renders the interaction card for chat_action with JSON-string input', () => {
		const w = mountIt({
			kind: 'tool',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'chat_action',
			toolInput: JSON.stringify(cardInput),
			toolOutput: { ok: true },
		});
		expect(w.text()).toContain('Renewal Risk');
	});

	it('falls back to JSON for tool calls without a card', () => {
		const w = mountIt({
			kind: 'tool',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'slack_action',
			toolInput: { action: 'add_reaction', input: { emoji: 'tada' } },
			toolOutput: { ok: true },
		});
		expect(w.text()).not.toContain('Renewal Risk');
		// Raw JSON view is shown instead of a card.
		expect(w.text()).toContain('"add_reaction"');
	});
});

describe('SessionDetailPanel — workflow branches', () => {
	const ingestedItem: TimelineItem = {
		kind: 'workflow',
		executionId: 'e1',
		timestamp: 0,
		workflowId: 'wf-1',
		workflowName: 'WF',
		workflowExecutionId: 'exec-1',
		toolInput: { query: 'open entries' },
		toolOutput: {
			executionId: 'exec-1',
			status: 'success',
			data: { 'Last node': [{ value: 'ingested' }] },
		},
	};

	it('renders the ingested workflow input and output when workflowExecutionId is set', async () => {
		const w = mountIt(ingestedItem);
		await flushPromises();
		expect(fetchExecution).toHaveBeenCalledWith('exec-1');
		expect(w.find('[data-test-id="workflow-input"]').text()).toContain('open entries');
		expect(w.find('[data-test-id="workflow-output"]').text()).toContain('ingested');
		expect(w.find('[data-test-id="workflow-output"]').text()).toContain('Last node');
		expect(w.find('[data-test-id="wf-error-fallback"]').exists()).toBe(false);
	});

	it('shows a loading label instead of the output until the execution access resolves', () => {
		fetchExecution.mockReturnValue(new Promise(() => {}));
		const w = mountIt(ingestedItem);
		expect(w.find('[data-test-id="workflow-input"]').exists()).toBe(true);
		expect(w.find('[data-test-id="workflow-output-loading"]').exists()).toBe(true);
		expect(w.find('[data-test-id="workflow-output"]').exists()).toBe(false);
	});

	it('hides the output data when the child execution is redacted', async () => {
		fetchExecution.mockResolvedValue({
			id: 'exec-1',
			data: {
				redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
			},
		});
		const w = mountIt(ingestedItem);
		await flushPromises();
		expect(w.find('[data-test-id="workflow-output-redacted"]').exists()).toBe(true);
		const output = w.find('[data-test-id="workflow-output"]').text();
		expect(output).toContain('exec-1');
		expect(output).not.toContain('ingested');
		expect(output).not.toContain('Last node');
	});

	it('hides the output data when the child execution cannot be loaded', async () => {
		fetchExecution.mockRejectedValue(new Error('not found'));
		const w = mountIt(ingestedItem);
		await flushPromises();
		expect(w.find('[data-test-id="workflow-output-unavailable"]').exists()).toBe(true);
		expect(w.find('[data-test-id="workflow-output"]').text()).not.toContain('ingested');
	});

	it('hides the output data when the child execution has no run data', async () => {
		fetchExecution.mockResolvedValue({ id: 'exec-1' });
		const w = mountIt(ingestedItem);
		await flushPromises();
		expect(w.find('[data-test-id="workflow-output-unavailable"]').exists()).toBe(true);
		expect(w.find('[data-test-id="workflow-output-redacted"]').exists()).toBe(false);
		expect(w.find('[data-test-id="workflow-output"]').text()).not.toContain('ingested');
	});

	it('hides the output data when the child execution is too large to display', async () => {
		fetchExecution.mockResolvedValue({
			id: 'exec-1',
			dataTooLargeToDisplay: true,
			data: { resultData: { runData: {} } },
		});
		const w = mountIt(ingestedItem);
		await flushPromises();
		expect(w.find('[data-test-id="workflow-output-unavailable"]').exists()).toBe(true);
		expect(w.find('[data-test-id="workflow-output-redacted"]').exists()).toBe(false);
		expect(w.find('[data-test-id="workflow-output"]').text()).not.toContain('ingested');
	});

	it('shows a soft-failure callout alongside the ingested workflow output', async () => {
		const w = mountIt({
			kind: 'workflow',
			executionId: 'e1',
			timestamp: 0,
			workflowId: 'wf-1',
			workflowName: 'WF',
			workflowExecutionId: 'exec-1',
			toolSuccess: true,
			toolOutput: { status: 'error', error: 'Node X failed' },
		});
		await flushPromises();
		const callout = w.find('[data-test-id="workflow-error-callout"]');
		expect(callout.exists()).toBe(true);
		expect(callout.text()).toContain('Node X failed');
		expect(w.find('[data-test-id="workflow-output"]').text()).toContain('Node X failed');
		expect(w.find('[data-test-id="detail-tool-error-badge"]').exists()).toBe(true);
	});

	it('opens the full execution in a new tab when the header button is clicked', async () => {
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		const w = mountIt({
			kind: 'workflow',
			executionId: 'e1',
			timestamp: 0,
			workflowId: 'wf-1',
			workflowName: 'WF',
			workflowExecutionId: 'exec-1',
		});
		const button = w.find('[data-test-id="open-full-execution"]');
		expect(button.exists()).toBe(true);
		await button.trigger('click');
		expect(openSpy).toHaveBeenCalledWith(
			expect.stringContaining('/workflow/wf-1/executions/exec-1'),
			'_blank',
			'noopener',
		);
		openSpy.mockRestore();
	});

	it('does not show the open-full-execution button for non-workflow rows', () => {
		const w = mountIt({
			kind: 'tool',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'http',
			toolInput: {},
			toolOutput: {},
		});
		expect(w.find('[data-test-id="open-full-execution"]').exists()).toBe(false);
	});

	it('renders the form-link card when triggerType is "form" and toolOutput has formUrl', () => {
		const w = mountIt({
			kind: 'workflow',
			executionId: 'e1',
			timestamp: 0,
			workflowId: 'wf-1',
			workflowName: 'Form WF',
			workflowTriggerType: 'form',
			toolOutput: { status: 'form_link_sent', formUrl: 'https://x/form', message: 'Please fill' },
		});
		expect(w.find('[data-test-id="wf-form-card"]').exists()).toBe(true);
		const link = w.find('[data-test-id="wf-form-card"] a[target="_blank"]');
		expect(link.attributes('href')).toBe('https://x/form');
	});

	it('renders error fallback when neither executionId nor form data present', () => {
		const w = mountIt({
			kind: 'workflow',
			executionId: 'e1',
			timestamp: 0,
			workflowId: 'wf-1',
			workflowName: 'WF',
			toolSuccess: false,
			toolOutput: { error: 'boom' },
		});
		expect(w.find('[data-test-id="wf-error-fallback"]').exists()).toBe(true);
	});
});

describe('SessionDetailPanel — HITL sequence', () => {
	it('keeps the original node call focused on its input and configuration', () => {
		const toolInput = { query: 'open entries' };
		const nodeParameters = { operation: 'get', returnAll: true };
		const w = mountIt({
			kind: 'node',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'check_ledger',
			toolInput,
			toolOutcome: undefined,
			nodeType: 'n8n-nodes-base.dataTableTool',
			nodeTypeVersion: 1.1,
			nodeDisplayName: 'Check ledger',
			nodeParameters,
		});

		const toolIoView = w.getComponent({ name: 'ToolIoView' });
		expect(toolIoView.props('input')).toEqual(toolInput);
		expect(toolIoView.props('nodeParameters')).toEqual(nodeParameters);
		expect(w.find('[data-test-id="detail-hitl-response-badge"]').exists()).toBe(false);
	});

	it('shows the linked tool and full request details on the HITL request', () => {
		const w = mountIt({
			kind: 'suspension',
			executionId: 'e1',
			timestamp: 100,
			toolName: 'check_ledger',
			hitlRequestType: 'approval',
			hitlToolDisplayName: 'Check ledger',
			hitlRequest: {
				type: 'approval',
				toolName: 'check_ledger',
				args: { returnAll: true },
			},
		});

		expect(w.text()).toContain('Approval request for Check ledger');
		expect(w.text()).toContain('Check ledger');
		expect(w.get('[data-test-id="hitl-request-details"]').text()).toContain('returnAll');
	});

	it.each([
		['approved', 'Approved'],
		['declined', 'Declined'],
		['responded', 'Response received'],
	] as const)('shows a %s status and response on the HITL response', (status, label) => {
		const w = mountIt({
			kind: 'hitl-response',
			executionId: 'e2',
			timestamp: 200,
			toolName: 'check_ledger',
			hitlRequestType: status === 'responded' ? 'interaction' : 'approval',
			hitlResponseStatus: status,
			hitlResponse: { value: status },
		});

		expect(w.get('[data-test-id="detail-hitl-response-badge"]').text()).toBe(label);
		expect(w.text()).toContain(
			status === 'responded' ? 'User response' : 'Approval response for Check ledger',
		);
		expect(w.get('[data-test-id="hitl-response-details"]').text()).toContain(status);
		expect(w.find('[data-test-id="node-error-callout"]').exists()).toBe(false);
	});
});

describe('SessionDetailPanel — other kinds', () => {
	it('renders skill details with the skill name and tool data', () => {
		const w = mountIt({
			kind: 'skill',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'load_skill',
			skillName: 'Triage',
			toolInput: { name: 'Triage' },
			toolOutput: { name: 'Triage' },
		});

		expect(w.text()).toContain('Triage');
		expect(w.text()).toContain('Input');
		expect(w.text()).toContain('Output');
		expect(w.find('[data-test-id="tool-io-view"]').exists()).toBe(false);
	});

	it('renders a failed skill call as an error', () => {
		const w = mountIt({
			kind: 'skill',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'load_skill',
			skillName: 'Triage',
			toolOutcome: 'error',
			toolOutput: { error: 'Skill failed' },
		});

		expect(w.find('[data-test-id="tool-error-callout"]').text()).toContain('Skill failed');
		expect(w.find('[data-test-id="detail-tool-error-badge"]').exists()).toBe(true);
	});

	it('shows a fatal execution error in a danger callout', () => {
		const w = mountIt({
			kind: 'execution-error',
			executionId: 'e1',
			executionStatus: 'error',
			timestamp: 100,
			content: 'Model request failed',
		});

		expect(w.get('[data-test-id="execution-error-callout"]').text()).toContain(
			'Model request failed',
		);
		expect(w.get('[data-test-id="detail-execution-error-badge"]').text()).toBe('Error');
	});

	it('renders Input/Output JSON sections for generic tool calls', () => {
		const w = mountIt({
			kind: 'tool',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'http',
			toolInput: { method: 'GET' },
			toolOutput: { ok: true },
		});
		expect(w.text()).toContain('Input');
		expect(w.text()).toContain('Output');
		// Tool kind should NOT use ToolIoView (it's reserved for node-backed calls).
		expect(w.find('[data-test-id="tool-io-view"]').exists()).toBe(false);
	});

	it('shows a generic tool soft-failure message and header icon', () => {
		const w = mountIt({
			kind: 'tool',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'load_skill',
			toolSuccess: true,
			toolOutput: { success: false, error: 'Skill not found' },
		});
		const callout = w.find('[data-test-id="tool-error-callout"]');
		expect(callout.exists()).toBe(true);
		expect(callout.text()).toContain('Skill not found');
		expect(w.find('[data-test-id="detail-tool-error-badge"]').exists()).toBe(true);
	});

	it('shows a nested integration error message', () => {
		const w = mountIt({
			kind: 'tool',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'slack_action',
			toolSuccess: true,
			toolOutput: {
				ok: false,
				error: { code: 'NO_MESSAGE_CONTEXT', message: 'No message context' },
			},
		});
		expect(w.find('[data-test-id="tool-error-callout"]').text()).toContain('No message context');
	});

	it('shows an MCP structuredContent error message', () => {
		const w = mountIt({
			kind: 'tool',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'github_create_issue',
			toolSuccess: true,
			toolOutput: {
				isError: true,
				content: [{ type: 'text', text: '{"error":"Repository not found"}' }],
				structuredContent: { error: 'Repository not found' },
			},
		});
		expect(w.find('[data-test-id="tool-error-callout"]').text()).toContain('Repository not found');
	});

	it('does not show a failure callout or header icon for a successful tool', () => {
		const w = mountIt({
			kind: 'tool',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'http',
			toolSuccess: true,
			toolOutput: { ok: true },
		});
		expect(w.find('[data-test-id="tool-error-callout"]').exists()).toBe(false);
		expect(w.find('[data-test-id="detail-tool-error-badge"]').exists()).toBe(false);
	});

	it('renders the ToolIoView for node tool calls', () => {
		const w = mountIt({
			kind: 'node',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'http-tool',
			nodeType: 'n8n-nodes-base.httpRequest',
			nodeTypeVersion: 4.2,
			nodeDisplayName: 'HTTP Request',
			toolInput: { url: 'https://x' },
			toolOutput: { status: 200 },
		});
		expect(w.find('[data-test-id="tool-io-view"]').exists()).toBe(true);
	});

	it('shows the error callout with the output message when a node tool call fails', () => {
		const w = mountIt({
			kind: 'node',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'telegram-tool',
			nodeType: 'n8n-nodes-base.telegramTool',
			nodeTypeVersion: 1.2,
			nodeDisplayName: 'Telegram',
			toolInput: { chatId: '1' },
			toolOutput: { error: 'Node does not have any credentials set' },
			toolOutcome: 'error',
		});
		const callout = w.find('[data-test-id="node-error-callout"]');
		expect(callout.exists()).toBe(true);
		expect(callout.text()).toContain('Tool call failed: Node does not have any credentials set');
		expect(w.get('[data-test-id="detail-tool-error-badge"]').text()).toBe('Error');
	});

	it('falls back to the prefix-only message when the failed node output has no error string', () => {
		const w = mountIt({
			kind: 'node',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'telegram-tool',
			nodeType: 'n8n-nodes-base.telegramTool',
			nodeTypeVersion: 1.2,
			nodeDisplayName: 'Telegram',
			toolInput: { chatId: '1' },
			toolOutput: {},
			toolSuccess: false,
		});
		const callout = w.find('[data-test-id="node-error-callout"]');
		expect(callout.exists()).toBe(true);
		expect(callout.text()).toContain('Tool call failed');
		expect(callout.text()).not.toContain(':');
	});

	it('does not show the error callout when the node tool call succeeded', () => {
		const w = mountIt({
			kind: 'node',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'http-tool',
			nodeType: 'n8n-nodes-base.httpRequest',
			nodeTypeVersion: 4.2,
			nodeDisplayName: 'HTTP Request',
			toolInput: { url: 'https://x' },
			toolOutput: { status: 200 },
			toolOutcome: 'success',
		});
		expect(w.find('[data-test-id="node-error-callout"]').exists()).toBe(false);
		expect(w.find('[data-test-id="detail-tool-error-badge"]').exists()).toBe(false);
	});

	it('renders markdown for user messages', () => {
		const w = mountIt({ kind: 'user', executionId: 'e1', timestamp: 0, content: 'hi' });
		expect(w.find('[data-test-id="markdown"]').exists()).toBe(true);
	});

	it('renders plain-text agent messages as markdown', () => {
		const w = mountIt({ kind: 'agent', executionId: 'e1', timestamp: 0, content: 'Hello there' });
		expect(w.find('[data-test-id="markdown"]').exists()).toBe(true);
		expect(w.find('pre').exists()).toBe(false);
	});

	it('pretty-prints an agent message whose content is structured JSON output', () => {
		const w = mountIt({
			kind: 'agent',
			executionId: 'e1',
			timestamp: 0,
			content: '{"city":"Tokyo","country":"Japan","population_millions":14.04}',
		});
		// JSON output is rendered in a <pre>, not via markdown.
		expect(w.find('[data-test-id="markdown"]').exists()).toBe(false);
		const pre = w.find('pre');
		expect(pre.exists()).toBe(true);
		expect(pre.text()).toContain('city');
		expect(pre.text()).toContain('Tokyo');
		expect(pre.text()).toContain('population_millions');
		// Pretty-printed across multiple lines rather than a single raw string.
		expect(pre.text().split('\n').length).toBeGreaterThan(1);
	});

	it('keeps markdown for an agent message that is valid JSON but not an object', () => {
		const w = mountIt({ kind: 'agent', executionId: 'e1', timestamp: 0, content: '42' });
		expect(w.find('[data-test-id="markdown"]').exists()).toBe(true);
		expect(w.find('pre').exists()).toBe(false);
	});

	it('emits close when the close button is clicked', async () => {
		const w = mountIt({ kind: 'user', executionId: 'e1', timestamp: 0, content: 'hi' });
		await w.find('[data-test-id="detail-close"]').trigger('click');
		expect(w.emitted('close')).toBeTruthy();
	});

	it('renders the empty state when item is null', () => {
		const w = mountIt(null);
		expect(w.text().toLowerCase()).toContain('select');
	});
});

it('shows each task and its translated status in signal details', () => {
	const wrapper = mountIt({
		kind: 'background-task-signal',
		executionId: 'e1',
		timestamp: 1000,
		backgroundJobSignal: {
			tasks: [
				{ id: 'job-1', title: 'Check invoices', kind: 'subagent', status: 'completed' },
				{ id: 'job-2', title: 'Wait for reply', kind: 'workflow', status: 'cancelled' },
			],
		},
	});
	expect(wrapper.text()).toContain('Background task results received');
	const details = wrapper.get('[data-test-id="background-job-signal-details"]');
	expect(details.findAll('li')).toHaveLength(2);
	expect(details.text()).toContain('Check invoices — Completed');
	expect(details.text()).toContain('Wait for reply — Canceled');
});
