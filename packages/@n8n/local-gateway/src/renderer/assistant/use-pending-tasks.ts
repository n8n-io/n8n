/*
 * Module-scoped store for tasks being promoted into saved workflows.
 *
 * Promotion is an instance-side build that takes a while, so each one gets a
 * pending entry here and the Tasks list shows a "setting up" card immediately.
 * Completion is observed on the thread event stream: the promote call returns
 * the build run's id, the store watches that run, and a follow-up idempotent
 * promote call confirms the workflow id once the run finishes. Subscribers are
 * notified on save so the list can refetch. No pinia — plain module-level
 * reactive state, matching `use-assistant-screen.ts`.
 */
import { reactive, readonly } from 'vue';

import { watchAssistantRun } from './run-watcher';

export interface PendingTask {
	threadId: string;
	label: string;
	status: 'building' | 'failed';
	/** Set when `status === 'failed'`; absent for timeouts (render a generic message). */
	error?: string;
}

/**
 * The promote finalizer writes the workflow id to thread metadata shortly
 * AFTER the run-finish event we observe, so the confirming promote call can
 * race it. A few short retries absorb that gap.
 */
const CONFIRM_ATTEMPTS = 3;
const CONFIRM_RETRY_DELAY_MS = 2000;

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

async function delay(ms: number): Promise<void> {
	await new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Drive one promotion to completion: start the build, watch its run on the
 * thread event stream, then confirm the workflow id with a final idempotent
 * promote call. `label` doubles as the requested workflow name.
 */
async function runPromotion(threadId: string, label: string, icon?: string): Promise<void> {
	const started = await window.electronAPI.promoteAssistantThread(threadId, label, icon);
	if (!started.ok) {
		failEntry(threadId, started.error);
		return;
	}
	if (started.status === 'done') {
		removeEntry(threadId);
		notifySaved();
		return;
	}
	if (!started.runId) {
		// `building` without a run to watch shouldn't happen; fail rather than spin forever.
		failEntry(threadId);
		return;
	}

	const run = await watchAssistantRun(threadId, started.runId);
	if (isDismissed(threadId)) return;
	if (!run.ok) {
		failEntry(threadId, run.error);
		return;
	}

	// Confirm the saved workflow, retrying while the finalizer writes the thread metadata.
	for (let attempt = 0; attempt < CONFIRM_ATTEMPTS; attempt++) {
		const confirmed = await window.electronAPI.promoteAssistantThread(threadId, label, icon);
		if (isDismissed(threadId)) return;
		if (confirmed.ok && confirmed.status === 'done') {
			removeEntry(threadId);
			notifySaved();
			return;
		}
		await delay(CONFIRM_RETRY_DELAY_MS);
	}
	// Run finished but no workflow materialised.
	failEntry(threadId);
}

/**
 * Start promoting a thread into a saved workflow and track it as pending.
 * `label` is shown on the pending card and becomes the saved workflow's name.
 */
function promote(threadId: string, label: string, icon?: string) {
	if (entries.some((entry) => entry.threadId === threadId)) return;
	entries.push({ threadId, label, status: 'building' });
	runPromotion(threadId, label, icon).catch((error: unknown) => {
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
