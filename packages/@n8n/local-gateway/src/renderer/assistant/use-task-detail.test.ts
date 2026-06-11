// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTaskDetail } from './use-task-detail';
import type { DesktopAssistantTaskDetailResponse, InstanceAiEvent } from '../../shared/types';

const DETAIL: DesktopAssistantTaskDetailResponse = {
	workflowId: 'wf-1',
	versionId: 'v1',
	parts: [
		{ kind: 'text', text: 'Every ' },
		{ kind: 'param', id: 'p1', value: 'weekday at 6am', options: ['weekdays at 9am'] },
		{ kind: 'text', text: ', send me a digest of ' },
		{ kind: 'param', id: 'p2', value: 'Slack', options: ['Microsoft Teams'] },
		{ kind: 'text', text: ' messages.' },
	],
	connectionsNeeded: [],
};

const TEXT_ONLY_DETAIL: DesktopAssistantTaskDetailResponse = {
	workflowId: 'wf-1',
	versionId: 'v1',
	parts: [{ kind: 'text', text: 'A complex workflow doing many things.' }],
	connectionsNeeded: [],
};

function runFinish(runId: string): InstanceAiEvent {
	return { type: 'run-finish', runId, agentId: 'root', payload: {} } as InstanceAiEvent;
}

function stub(detail: DesktopAssistantTaskDetailResponse = DETAIL) {
	const getTaskDetail = vi.fn(async () => await Promise.resolve(detail));
	const applyTaskEdits = vi.fn(async () =>
		await Promise.resolve({ threadId: 'thread-1', runId: 'run-1' }),
	);
	const api = { getTaskDetail, applyTaskEdits };
	(globalThis as unknown as { window: { electronAPI: typeof api } }).window = {
		electronAPI: api,
	};

	// Captures the run-finish listener so tests can deliver thread events.
	const listeners = new Set<(event: InstanceAiEvent) => void>();
	const threadFollower = {
		listen: vi.fn((_threadId: string, listener: (event: InstanceAiEvent) => void) => {
			listeners.add(listener);
		}),
		unlisten: vi.fn((_threadId: string, listener: (event: InstanceAiEvent) => void) => {
			listeners.delete(listener);
		}),
	};
	const emit = (event: InstanceAiEvent) => {
		for (const listener of [...listeners]) listener(event);
	};
	return { getTaskDetail, applyTaskEdits, threadFollower, emit };
}

describe('useTaskDetail', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('loads the detail and seeds the picker values', async () => {
		const { getTaskDetail } = stub();
		const taskDetail = useTaskDetail('wf-1');

		expect(taskDetail.phase.value).toBe('loading');
		await taskDetail.load();

		expect(getTaskDetail).toHaveBeenCalledWith('wf-1');
		expect(taskDetail.phase.value).toBe('ready');
		expect(taskDetail.detail.value).toEqual(DETAIL);
		expect(taskDetail.pickerValues.value).toEqual({ p1: 'weekday at 6am', p2: 'Slack' });
		expect(taskDetail.hasParams.value).toBe(true);
	});

	it('enters the error phase when the fetch fails', async () => {
		const { getTaskDetail } = stub();
		getTaskDetail.mockRejectedValueOnce(new Error('boom'));
		const taskDetail = useTaskDetail('wf-1');

		await taskDetail.load();

		expect(taskDetail.phase.value).toBe('error');
		expect(taskDetail.detail.value).toBeNull();
	});

	it('reports no params for a text-only description', async () => {
		stub(TEXT_ONLY_DETAIL);
		const taskDetail = useTaskDetail('wf-1');
		await taskDetail.load();

		expect(taskDetail.hasParams.value).toBe(false);
		expect(taskDetail.changes.value).toEqual([]);
	});

	it('builds the change list only from params whose value differs', async () => {
		stub();
		const taskDetail = useTaskDetail('wf-1');
		await taskDetail.load();
		taskDetail.startEditing();

		taskDetail.setParamValue('p2', 'Microsoft Teams');

		expect(taskDetail.editing.value).toBe(true);
		expect(taskDetail.changes.value).toEqual([
			{ paramId: 'p2', from: 'Slack', to: 'Microsoft Teams' },
		]);

		// Picking the original value again removes the change.
		taskDetail.setParamValue('p2', 'Slack');
		expect(taskDetail.changes.value).toEqual([]);
	});

	it('exits edit mode without a backend call when nothing changed', async () => {
		const { applyTaskEdits } = stub();
		const taskDetail = useTaskDetail('wf-1');
		await taskDetail.load();
		taskDetail.startEditing();

		await taskDetail.finishEditing();

		expect(taskDetail.editing.value).toBe(false);
		expect(applyTaskEdits).not.toHaveBeenCalled();
	});

	it('applies changes, waits for run-finish, and refetches the detail', async () => {
		const { getTaskDetail, applyTaskEdits, threadFollower, emit } = stub();
		const taskDetail = useTaskDetail('wf-1', { threadFollower });
		await taskDetail.load();
		taskDetail.startEditing();
		taskDetail.setParamValue('p1', 'weekdays at 9am');

		const finishPromise = taskDetail.finishEditing();
		await vi.advanceTimersByTimeAsync(0);

		expect(applyTaskEdits).toHaveBeenCalledWith('wf-1', {
			changes: [{ paramId: 'p1', from: 'weekday at 6am', to: 'weekdays at 9am' }],
		});
		expect(taskDetail.phase.value).toBe('updating');
		expect(getTaskDetail).toHaveBeenCalledTimes(1);

		// An unrelated run finishing must not end the wait.
		emit(runFinish('other-run'));
		await vi.advanceTimersByTimeAsync(0);
		expect(taskDetail.phase.value).toBe('updating');

		emit(runFinish('run-1'));
		await finishPromise;

		expect(getTaskDetail).toHaveBeenCalledTimes(2);
		expect(taskDetail.editing.value).toBe(false);
		expect(taskDetail.phase.value).toBe('ready');
		expect(threadFollower.unlisten).toHaveBeenCalled();
	});

	it('gives up waiting after the timeout and still refetches', async () => {
		const { getTaskDetail, threadFollower } = stub();
		const taskDetail = useTaskDetail('wf-1', { threadFollower, editRunTimeoutMs: 5_000 });
		await taskDetail.load();
		taskDetail.startEditing();
		taskDetail.setParamValue('p1', 'weekdays at 9am');

		const finishPromise = taskDetail.finishEditing();
		await vi.advanceTimersByTimeAsync(5_000);
		await finishPromise;

		expect(getTaskDetail).toHaveBeenCalledTimes(2);
		expect(taskDetail.phase.value).toBe('ready');
	});

	it('keeps edit mode and flags the failure when applying edits rejects', async () => {
		const { applyTaskEdits, threadFollower } = stub();
		applyTaskEdits.mockRejectedValueOnce(new Error('offline'));
		const taskDetail = useTaskDetail('wf-1', { threadFollower });
		await taskDetail.load();
		taskDetail.startEditing();
		taskDetail.setParamValue('p1', 'weekdays at 9am');

		await taskDetail.finishEditing();

		expect(taskDetail.updateFailed.value).toBe(true);
		expect(taskDetail.editing.value).toBe(true);
		expect(taskDetail.phase.value).toBe('ready');
		// The user's pick survives so they can retry.
		expect(taskDetail.changes.value).toEqual([
			{ paramId: 'p1', from: 'weekday at 6am', to: 'weekdays at 9am' },
		]);
	});
});
