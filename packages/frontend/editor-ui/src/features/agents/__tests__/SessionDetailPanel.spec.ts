/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import SessionDetailPanel from '../components/SessionDetailPanel.vue';
import type { TimelineItem } from '../session-timeline.types';

vi.mock('../components/WorkflowExecutionLogViewer.vue', () => ({
	default: { template: '<div data-test-id="wf-log-viewer"></div>' },
}));
vi.mock('../components/RichInteractionCard.vue', () => ({
	default: { template: '<div data-test-id="rich-card"></div>' },
}));
vi.mock('../components/ToolIoView.vue', () => ({
	default: { template: '<div data-test-id="tool-io-view"></div>' },
}));
vi.mock('vue-markdown-render', () => ({
	default: { template: '<div data-test-id="markdown"><slot /></div>' },
}));

function makeRouter(): Router {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{
				path: '/workflow/:name/executions/:executionId',
				name: 'ExecutionPreview',
				component: { template: '<div/>' },
			},
		],
	});
}

function mountIt(item: TimelineItem | null) {
	return mount(SessionDetailPanel, {
		props: { item },
		global: { plugins: [makeRouter()] },
	});
}

describe('SessionDetailPanel — workflow branches', () => {
	it('renders the WorkflowExecutionLogViewer when workflowExecutionId is set', () => {
		const w = mountIt({
			kind: 'workflow',
			executionId: 'e1',
			timestamp: 0,
			workflowId: 'wf-1',
			workflowName: 'WF',
			workflowExecutionId: 'exec-1',
		});
		expect(w.find('[data-test-id="wf-log-viewer"]').exists()).toBe(true);
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

describe('SessionDetailPanel — other kinds', () => {
	it('renders the rich-interaction card for rich_interaction tool calls', () => {
		const w = mountIt({
			kind: 'tool',
			executionId: 'e1',
			timestamp: 0,
			toolName: 'rich_interaction',
			toolInput: { widget: 'x' },
			toolOutput: { ok: true },
		});
		expect(w.find('[data-test-id="rich-card"]').exists()).toBe(true);
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

	it('renders markdown for user messages', () => {
		const w = mountIt({ kind: 'user', executionId: 'e1', timestamp: 0, content: 'hi' });
		expect(w.find('[data-test-id="markdown"]').exists()).toBe(true);
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
