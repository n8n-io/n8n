/*
 * State machine behind the task detail view.
 *
 * Owns the description fetch, the read ↔ edit mode toggle, the per-param edited
 * values, and the apply-edits round-trip: POST the changes, follow the returned
 * run over the thread's SSE stream until `run-finish` (bounded by a timeout),
 * then refetch the detail — the builder's update bumped the workflow's
 * versionId, so the server regenerates the description from the new state.
 */
import { computed, ref } from 'vue';

import type {
	DesktopAssistantApplyEditsRequest,
	DesktopAssistantTaskDetailResponse,
	InstanceAiEvent,
} from '../../shared/types';
import { getThreadClient } from '../services/thread-client';

export type TaskDetailPhase = 'loading' | 'ready' | 'updating' | 'error';

/** Give the edit run ample time — it's an LLM applying a workflow change — but
 * never hang the view: on timeout we refetch and show whatever state exists. */
const EDIT_RUN_TIMEOUT_MS = 120_000;

interface ThreadFollower {
	listen: (
		threadId: string,
		listener: (event: InstanceAiEvent) => void,
		options?: { lastEventId?: number },
	) => void;
	unlisten: (threadId: string, listener: (event: InstanceAiEvent) => void) => void;
}

export interface UseTaskDetailOptions {
	/** Injectable for tests; defaults to the app-wide thread client. */
	threadFollower?: ThreadFollower;
	/** Injectable for tests. */
	editRunTimeoutMs?: number;
}

export function useTaskDetail(workflowId: string, options: UseTaskDetailOptions = {}) {
	const phase = ref<TaskDetailPhase>('loading');
	const detail = ref<DesktopAssistantTaskDetailResponse | null>(null);
	const editing = ref(false);
	/** Edited value per param id; seeded from the detail on every (re)load. */
	const pickerValues = ref<Record<string, string>>({});
	/** Set when applying edits failed; cleared on the next attempt or reload. */
	const updateFailed = ref(false);

	const timeoutMs = options.editRunTimeoutMs ?? EDIT_RUN_TIMEOUT_MS;

	function seedPickerValues(parts: DesktopAssistantTaskDetailResponse['parts']) {
		const values: Record<string, string> = {};
		for (const part of parts) {
			if (part.kind === 'param') values[part.id] = part.value;
		}
		pickerValues.value = values;
	}

	async function load() {
		phase.value = 'loading';
		updateFailed.value = false;
		try {
			const response = await window.electronAPI.getTaskDetail(workflowId);
			detail.value = response;
			seedPickerValues(response.parts);
			phase.value = 'ready';
		} catch (error) {
			console.error('Failed to load task detail', workflowId, error);
			phase.value = 'error';
		}
	}

	const hasParams = computed(
		() => detail.value?.parts.some((part) => part.kind === 'param') ?? false,
	);

	/** The from→to list of params whose edited value differs from the generated one. */
	const changes = computed<DesktopAssistantApplyEditsRequest['changes']>(() => {
		if (!detail.value) return [];
		const result: DesktopAssistantApplyEditsRequest['changes'] = [];
		for (const part of detail.value.parts) {
			if (part.kind !== 'param') continue;
			const to = pickerValues.value[part.id];
			if (to !== undefined && to !== part.value) {
				result.push({ paramId: part.id, from: part.value, to });
			}
		}
		return result;
	});

	function startEditing() {
		editing.value = true;
	}

	function setParamValue(paramId: string, value: string) {
		pickerValues.value = { ...pickerValues.value, [paramId]: value };
	}

	type RunOutcome = 'completed' | 'failed' | 'timeout';

	/** Wait for the edit run to finish, resolving on timeout so the view never hangs. */
	async function waitForRunFinish(threadId: string, runId: string): Promise<RunOutcome> {
		const follower = options.threadFollower ?? getThreadClient();
		return await new Promise<RunOutcome>((resolve) => {
			const finish = (outcome: RunOutcome) => {
				clearTimeout(timer);
				follower.unlisten(threadId, listener);
				resolve(outcome);
			};
			const listener = (event: InstanceAiEvent) => {
				if (event.type !== 'run-finish' || event.runId !== runId) return;
				finish(event.payload.status === 'completed' ? 'completed' : 'failed');
			};
			const timer = setTimeout(() => finish('timeout'), timeoutMs);
			follower.listen(threadId, listener);
		});
	}

	/** Re-apply the user's picks onto the (re)loaded detail, where they still fit
	 *  — i.e. the param still exists with the same generated value. */
	function restorePicks(requested: DesktopAssistantApplyEditsRequest['changes']) {
		for (const change of requested) {
			const stillApplies = detail.value?.parts.some(
				(part) => part.kind === 'param' && part.id === change.paramId && part.value === change.from,
			);
			if (stillApplies) setParamValue(change.paramId, change.to);
		}
	}

	/**
	 * Done pressed: with no changes just leave edit mode; with changes, send them
	 * and follow the run, then refetch so the view reflects the updated workflow.
	 * Every non-success path keeps the user in edit mode with their picks intact
	 * and `updateFailed` raised, so the edit is never silently dropped.
	 */
	async function finishEditing() {
		if (changes.value.length === 0) {
			editing.value = false;
			return;
		}
		const requested = changes.value;
		const previousVersionId = detail.value?.versionId;
		phase.value = 'updating';
		updateFailed.value = false;
		try {
			const { threadId, runId } = await window.electronAPI.applyTaskEdits(workflowId, {
				changes: requested,
			});
			const outcome = await waitForRunFinish(threadId, runId);
			if (outcome === 'failed') {
				// The run errored or was cancelled — the workflow is unchanged.
				updateFailed.value = true;
				phase.value = 'ready';
				return;
			}
			await load();
			if (detail.value && detail.value.versionId === previousVersionId) {
				// The run finished without touching the workflow (e.g. it judged the
				// change inapplicable). Surface that instead of silently showing the
				// old values.
				restorePicks(requested);
				updateFailed.value = true;
				return;
			}
			editing.value = false;
		} catch (error) {
			console.error('Failed to apply task edits', workflowId, error);
			// Refetch so a stale-description rejection self-heals (the reload swaps
			// in the current description), then restore the picks that still apply
			// so the user can retry.
			await load();
			restorePicks(requested);
			updateFailed.value = true;
		}
	}

	return {
		phase,
		detail,
		editing,
		pickerValues,
		updateFailed,
		hasParams,
		changes,
		load,
		startEditing,
		setParamValue,
		finishEditing,
	};
}
