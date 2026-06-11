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

/** The DETAIL after a successful edit run: new version, the edited value baked in. */
const EDITED_DETAIL: DesktopAssistantTaskDetailResponse = {
	...DETAIL,
	versionId: 'v2',
	parts: DETAIL.parts.map((part) =>
		part.kind === 'param' && part.id === 'p1' ? { ...part, value: 'weekdays at 9am' } : part,
	),
};

function runFinish(runId: string, status = 'completed'): InstanceAiEvent {
	return { type: 'run-finish', runId, agentId: 'root', payload: { status } } as InstanceAiEvent;
}

function stub(detail: DesktopAssistantTaskDetailResponse = DETAIL) {
	// Fetches consume queued details in order (e.g. the post-edit one); the
	// last entry repeats for any further fetches.
	const details = [detail];
	const getTaskDetail = vi.fn(async () => {
		const next = details.length > 1 ? details.shift() : details[0];
		return await Promise.resolve(next ?? detail);
	});
	const queueDetail = (next: DesktopAssistantTaskDetailResponse) => details.push(next);
	const applyTaskEdits = vi.fn(
		async () => await Promise.resolve({ threadId: 'thread-1', runId: 'run-1' }),
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
	return { getTaskDetail, queueDetail, applyTaskEdits, threadFollower, emit };
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
		const { getTaskDetail, queueDetail, applyTaskEdits, threadFollower, emit } = stub();
		queueDetail(EDITED_DETAIL);
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
		expect(taskDetail.detail.value).toEqual(EDITED_DETAIL);
		expect(taskDetail.editing.value).toBe(false);
		expect(taskDetail.phase.value).toBe('ready');
		expect(threadFollower.unlisten).toHaveBeenCalled();
	});

	it('gives up waiting after the timeout and still refetches', async () => {
		const { getTaskDetail, queueDetail, threadFollower } = stub();
		queueDetail(EDITED_DETAIL);
		const taskDetail = useTaskDetail('wf-1', { threadFollower, editRunTimeoutMs: 5_000 });
		await taskDetail.load();
		taskDetail.startEditing();
		taskDetail.setParamValue('p1', 'weekdays at 9am');

		const finishPromise = taskDetail.finishEditing();
		await vi.advanceTimersByTimeAsync(5_000);
		await finishPromise;

		expect(getTaskDetail).toHaveBeenCalledTimes(2);
		expect(taskDetail.editing.value).toBe(false);
		expect(taskDetail.phase.value).toBe('ready');
	});

	it('keeps edit mode and flags the failure when the run finishes with an error', async () => {
		const { getTaskDetail, threadFollower, emit } = stub();
		const taskDetail = useTaskDetail('wf-1', { threadFollower });
		await taskDetail.load();
		taskDetail.startEditing();
		taskDetail.setParamValue('p1', 'weekdays at 9am');

		const finishPromise = taskDetail.finishEditing();
		await vi.advanceTimersByTimeAsync(0);
		emit(runFinish('run-1', 'error'));
		await finishPromise;

		// The workflow is unchanged — no refetch, picks intact, failure surfaced.
		expect(getTaskDetail).toHaveBeenCalledTimes(1);
		expect(taskDetail.updateFailed.value).toBe(true);
		expect(taskDetail.editing.value).toBe(true);
		expect(taskDetail.phase.value).toBe('ready');
		expect(taskDetail.changes.value).toEqual([
			{ paramId: 'p1', from: 'weekday at 6am', to: 'weekdays at 9am' },
		]);
	});

	it('flags the failure when the run completes without changing the workflow', async () => {
		// No queued detail: the refetch returns the same versionId.
		const { getTaskDetail, threadFollower, emit } = stub();
		const taskDetail = useTaskDetail('wf-1', { threadFollower });
		await taskDetail.load();
		taskDetail.startEditing();
		taskDetail.setParamValue('p1', 'weekdays at 9am');

		const finishPromise = taskDetail.finishEditing();
		await vi.advanceTimersByTimeAsync(0);
		emit(runFinish('run-1'));
		await finishPromise;

		expect(getTaskDetail).toHaveBeenCalledTimes(2);
		expect(taskDetail.updateFailed.value).toBe(true);
		expect(taskDetail.editing.value).toBe(true);
		// The pick is restored onto the reloaded (identical) description.
		expect(taskDetail.changes.value).toEqual([
			{ paramId: 'p1', from: 'weekday at 6am', to: 'weekdays at 9am' },
		]);
	});

	it('refetches, restores picks, and flags the failure when applying edits rejects', async () => {
		const { getTaskDetail, applyTaskEdits, threadFollower } = stub();
		applyTaskEdits.mockRejectedValueOnce(new Error('offline'));
		const taskDetail = useTaskDetail('wf-1', { threadFollower });
		await taskDetail.load();
		taskDetail.startEditing();
		taskDetail.setParamValue('p1', 'weekdays at 9am');

		await taskDetail.finishEditing();

		// Reloaded (so a stale-description rejection self-heals)…
		expect(getTaskDetail).toHaveBeenCalledTimes(2);
		expect(taskDetail.updateFailed.value).toBe(true);
		expect(taskDetail.editing.value).toBe(true);
		expect(taskDetail.phase.value).toBe('ready');
		// …with the user's pick restored so they can retry.
		expect(taskDetail.changes.value).toEqual([
			{ paramId: 'p1', from: 'weekday at 6am', to: 'weekdays at 9am' },
		]);
	});
});
