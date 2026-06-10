/*
 * Module-scoped store for tasks being promoted into saved workflows.
 *
 * When the user keeps a one-off run, the thread is promoted on the instance —
 * a build that takes a while. Each promotion gets a pending entry here so the
 * Tasks list can show a "setting up" card immediately; the store polls the
 * idempotent promote endpoint until the workflow is saved, then drops the
 * entry and notifies subscribers (so the list can refetch). No pinia — plain
 * module-level reactive state, matching `use-assistant-screen.ts`.
 */
import { reactive, readonly } from 'vue';

import { promoteAssistantThread } from './tasks-api';

export interface PendingTask {
	threadId: string;
	label: string;
	status: 'building' | 'failed';
	/** Set when `status === 'failed'`; absent for timeouts (render a generic message). */
	error?: string;
}

const POLL_INTERVAL_MS = 4000;
/** Stop polling after this long; the build is then surfaced as failed. */
const PROMOTE_TIMEOUT_MS = 5 * 60 * 1000;

const entries = reactive<PendingTask[]>([]);
const savedCallbacks = new Set<() => void>();
const pollTimers = new Map<string, number>();

function clearPollTimer(threadId: string) {
	const timer = pollTimers.get(threadId);
	if (timer !== undefined) window.clearTimeout(timer);
	pollTimers.delete(threadId);
}

function removeEntry(threadId: string) {
	clearPollTimer(threadId);
	const index = entries.findIndex((entry) => entry.threadId === threadId);
	if (index !== -1) entries.splice(index, 1);
}

function failEntry(threadId: string, error?: string) {
	clearPollTimer(threadId);
	const entry = entries.find((e) => e.threadId === threadId);
	if (entry) {
		entry.status = 'failed';
		entry.error = error;
	}
}

function notifySaved() {
	for (const callback of savedCallbacks) callback();
}

/**
 * One poll tick: check the promote status, then finish, fail, or re-arm.
 * `label` doubles as the requested workflow name; the endpoint is idempotent,
 * so passing it on every tick is harmless and keeps the tick uniform.
 */
async function poll(threadId: string, label: string, deadline: number) {
	// The entry may have been dismissed while a request was in flight.
	if (!entries.some((entry) => entry.threadId === threadId && entry.status === 'building')) return;

	try {
		const result = await promoteAssistantThread(threadId, label);
		if (!result.ok) {
			failEntry(threadId, result.error);
			return;
		}
		if (result.status === 'done') {
			removeEntry(threadId);
			notifySaved();
			return;
		}
	} catch (error) {
		failEntry(threadId, error instanceof Error ? error.message : undefined);
		return;
	}

	if (Date.now() >= deadline) {
		failEntry(threadId);
		return;
	}
	pollTimers.set(
		threadId,
		window.setTimeout(() => void poll(threadId, label, deadline), POLL_INTERVAL_MS),
	);
}

/**
 * Start promoting a thread into a saved workflow and track it as pending.
 * `label` is shown on the pending card and becomes the saved workflow's name.
 */
function promote(threadId: string, label: string) {
	if (entries.some((entry) => entry.threadId === threadId)) return;
	entries.push({ threadId, label, status: 'building' });
	void poll(threadId, label, Date.now() + PROMOTE_TIMEOUT_MS);
}

/** Drop a (typically failed) entry from the list. */
function dismiss(threadId: string) {
	removeEntry(threadId);
}

/** Subscribe to "a pending task was saved" events. Returns a disposer. */
function onSaved(callback: () => void): () => void {
	savedCallbacks.add(callback);
	return () => savedCallbacks.delete(callback);
}

export function usePendingTasks() {
	return { entries: readonly(entries), promote, dismiss, onSaved };
}
