import type { PushMessage, WorkflowTestFile } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkflowTestsStore } from './workflowTests.store';
import * as api from './workflowTests.api';

const listeners: Array<(message: PushMessage) => void> = [];

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		addEventListener: (handler: (message: PushMessage) => void) => {
			listeners.push(handler);
			return () => {};
		},
	}),
}));

vi.mock('./workflowTests.api');

const file: WorkflowTestFile = {
	id: 'file-1',
	workflowId: 'wf-1',
	source: "test('a', () => {})",
	updatedAt: '2026-01-01T00:00:00.000Z',
	lastRun: null,
};

function push(
	runId: string,
	event: Extract<PushMessage, { type: 'workflowTestRunEvent' }>['data']['event'],
) {
	for (const listener of listeners) {
		listener({ type: 'workflowTestRunEvent', data: { runId, workflowId: 'wf-1', event } });
	}
}

describe('useWorkflowTestsStore', () => {
	beforeEach(() => {
		listeners.length = 0;
		setActivePinia(createPinia());
		vi.mocked(api.getWorkflowTests).mockResolvedValue([file]);
	});

	it('applies events that arrive before the run reply', async () => {
		const store = useWorkflowTestsStore();
		await store.fetchFile('wf-1');

		let reply: (value: { runId: string }) => void = () => {};
		vi.mocked(api.runWorkflowTests).mockReturnValue(
			new Promise((resolve) => {
				reply = resolve;
			}),
		);
		const running = store.runFile('wf-1');

		push('run-1', { type: 'testStarted', name: 'a' });
		expect(store.runs['wf-1']).toMatchObject({ runId: 'run-1', status: 'running' });

		push('run-1', { type: 'testFinished', name: 'a', status: 'passed', durationMs: 5 });
		push('run-1', { type: 'runFinished', status: 'passed', errors: [] });
		reply({ runId: 'run-1' });
		await running;

		expect(store.runs['wf-1']).toMatchObject({
			runId: 'run-1',
			status: 'passed',
			tests: [{ name: 'a', status: 'passed', durationMs: 5 }],
		});
	});

	it('shows a run that another client started, and reloads the file', async () => {
		const store = useWorkflowTestsStore();
		await store.fetchFile('wf-1');
		vi.mocked(api.getWorkflowTests).mockClear();

		push('assistant-run', { type: 'testStarted', name: 'a' });

		expect(store.runs['wf-1']).toMatchObject({ runId: 'assistant-run', status: 'running' });
		expect(api.getWorkflowTests).toHaveBeenCalledTimes(1);
	});

	it('keeps a finished live run when a reload returns no stored run yet', async () => {
		const store = useWorkflowTestsStore();
		await store.fetchFile('wf-1');

		push('assistant-run', { type: 'testFinished', name: 'a', status: 'passed', durationMs: 1 });
		push('assistant-run', { type: 'runFinished', status: 'passed', errors: [] });
		await store.fetchFile('wf-1');

		expect(store.runs['wf-1']).toMatchObject({ runId: 'assistant-run', status: 'passed' });
	});

	it('shows the stored last run after a load', async () => {
		vi.mocked(api.getWorkflowTests).mockResolvedValue([
			{
				...file,
				lastRun: {
					runId: 'old',
					status: 'failed',
					errors: [],
					tests: [{ name: 'a', status: 'failed', durationMs: 1, error: { message: 'no' } }],
					finishedAt: '2026-01-01T00:00:00.000Z',
				},
			},
		]);
		const store = useWorkflowTestsStore();
		await store.fetchFile('wf-1');

		expect(store.runs['wf-1']).toMatchObject({ runId: 'old', status: 'failed' });
	});
});
