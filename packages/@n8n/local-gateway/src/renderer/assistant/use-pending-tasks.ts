/*
 * Module-scoped store for tasks being promoted into saved workflows. Each
 * promotion gets a pending entry so the Tasks list shows a "setting up" card
 * while the instance-side build runs; subscribers are notified on save so the
 * list can refetch. No pinia — plain module-level reactive state, matching
 * `use-assistant-screen.ts`.
 */
import { reactive, readonly } from 'vue';

import { watchAssistantRun } from './run-watcher';
import type { PromoteAssistantThreadOptions } from '../../shared/types';

export interface PendingTask {
	threadId: string;
	label: string;
	status: 'building' | 'failed';
	/** Set when `status === 'failed'`; absent for timeouts (render a generic message). */
	error?: string;
}

const entries = reactive<PendingTask[]>([]);
const savedCallbacks = new Set<() => void>();

function removeEntry(threadId: string) {
	const index = entries.findIndex((entry) => entry.threadId === threadId);
	if (index !== -1) entries.splice(index, 1);
}

function failEntry(threadId: string, error?: string) {
	const entry = entries.find((e) => e.threadId === threadId);
	if (entry) {
		entry.status = 'failed';
		entry.error = error;
	}
}

function isDismissed(threadId: string): boolean {
	return !entries.some((entry) => entry.threadId === threadId && entry.status === 'building');
}

function notifySaved() {
	for (const notify of savedCallbacks) notify();
}

/**
 * Drive one promotion to completion. `promoteAssistantThread` is idempotent —
 * `building` (with the run to watch) until the workflow exists, `done` after —
 * so promote and watch in a loop until it settles.
 */
async function runPromotion(
	threadId: string,
	label: string,
	icon?: string,
	options?: PromoteAssistantThreadOptions,
): Promise<void> {
	for (;;) {
		const result = await window.electronAPI.promoteAssistantThread(threadId, label, icon, options);
		if (isDismissed(threadId)) return;
		if (!result.ok) {
			failEntry(threadId, result.error);
			return;
		}
		if (result.status === 'done') {
			removeEntry(threadId);
			notifySaved();
			return;
		}
		if (!result.runId) {
			// `building` without a run to watch shouldn't happen; fail rather than spin forever.
			failEntry(threadId);
			return;
		}

		const run = await watchAssistantRun(threadId, result.runId);
		if (isDismissed(threadId)) return;
		if (!run.ok) {
			failEntry(threadId, run.error);
			return;
		}
	}
}

/**
 * Start promoting a thread into a saved workflow and track it as pending.
 * `label` is shown on the pending card and becomes the saved workflow's name.
 */
function promote(
	threadId: string,
	label: string,
	icon?: string,
	options?: PromoteAssistantThreadOptions,
) {
	if (entries.some((entry) => entry.threadId === threadId)) return;
	entries.push({ threadId, label, status: 'building' });
	runPromotion(threadId, label, icon, options).catch((error: unknown) => {
		failEntry(threadId, error instanceof Error ? error.message : undefined);
	});
}

function dismiss(threadId: string) {
	removeEntry(threadId);
}

/** Subscribe to "a pending task was saved" events. Returns a disposer. */
function onSaved(listener: () => void): () => void {
	savedCallbacks.add(listener);
	return () => savedCallbacks.delete(listener);
}

export function usePendingTasks() {
	return { entries: readonly(entries), promote, dismiss, onSaved };
}
