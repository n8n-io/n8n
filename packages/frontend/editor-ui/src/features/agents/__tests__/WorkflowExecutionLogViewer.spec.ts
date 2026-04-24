/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import WorkflowExecutionLogViewer from '../components/WorkflowExecutionLogViewer.vue';

const fetchExecution = vi.fn();

vi.mock('@/features/execution/executions/executions.store', () => ({
	useExecutionsStore: () => ({ fetchExecution }),
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

function mountIt(props: { workflowId: string; workflowExecutionId: string }) {
	return mount(WorkflowExecutionLogViewer, {
		props,
		global: { plugins: [makeRouter()] },
	});
}

beforeEach(() => {
	fetchExecution.mockReset();
});

describe('WorkflowExecutionLogViewer', () => {
	it('renders one row per node run on success', async () => {
		fetchExecution.mockResolvedValueOnce({
			id: 'exec-1',
			status: 'success',
			data: {
				resultData: {
					runData: {
						'Manual Trigger': [{ executionTime: 10 }],
						'HTTP Request': [{ executionTime: 42 }],
					},
				},
			},
		});
		const w = mountIt({ workflowId: 'wf-1', workflowExecutionId: 'exec-1' });
		await flushPromises();
		expect(w.findAll('[data-test-id="log-node-row"]')).toHaveLength(2);
		expect(w.text()).not.toMatch(/Still running|Waiting/);
	});

	it('shows "Still running" banner when status is running', async () => {
		fetchExecution.mockResolvedValueOnce({
			id: 'exec-1',
			status: 'running',
			data: { resultData: { runData: {} } },
		});
		const w = mountIt({ workflowId: 'wf-1', workflowExecutionId: 'exec-1' });
		await flushPromises();
		expect(w.text()).toContain('Still running');
	});

	it('shows "Waiting" banner when status is waiting', async () => {
		fetchExecution.mockResolvedValueOnce({
			id: 'exec-1',
			status: 'waiting',
			data: { resultData: { runData: {} } },
		});
		const w = mountIt({ workflowId: 'wf-1', workflowExecutionId: 'exec-1' });
		await flushPromises();
		expect(w.text()).toContain('Waiting');
	});

	it('shows error banner when fetchExecution rejects', async () => {
		fetchExecution.mockRejectedValueOnce(new Error('not found'));
		const w = mountIt({ workflowId: 'wf-1', workflowExecutionId: 'bad' });
		await flushPromises();
		expect(w.text()).toContain('unavailable');
	});

	it('shows error banner when fetchExecution returns undefined', async () => {
		fetchExecution.mockResolvedValueOnce(undefined);
		const w = mountIt({ workflowId: 'wf-1', workflowExecutionId: 'bad' });
		await flushPromises();
		expect(w.text()).toContain('unavailable');
	});

	it('marks an error node row distinctly when the last run has an error', async () => {
		fetchExecution.mockResolvedValueOnce({
			id: 'exec-1',
			status: 'error',
			data: {
				resultData: {
					runData: {
						'Broken Node': [{ executionTime: 5, error: { message: 'boom' } }],
					},
				},
			},
		});
		const w = mountIt({ workflowId: 'wf-1', workflowExecutionId: 'exec-1' });
		await flushPromises();
		const row = w.find('[data-test-id="log-node-row"]');
		// The row exists; we don't pin exact classes but we can assert the data attribute.
		expect(row.attributes('data-node-status')).toBe('error');
	});

	it('renders an "Open full execution" link with target="_blank"', async () => {
		fetchExecution.mockResolvedValueOnce({
			id: 'exec-1',
			status: 'success',
			data: { resultData: { runData: {} } },
		});
		const w = mountIt({ workflowId: 'wf-1', workflowExecutionId: 'exec-1' });
		await flushPromises();
		const link = w.find('[data-test-id="open-full-execution"]');
		expect(link.exists()).toBe(true);
		expect(link.attributes('target')).toBe('_blank');
		expect(link.attributes('href')).toContain('/workflow/wf-1/executions/exec-1');
	});
});
