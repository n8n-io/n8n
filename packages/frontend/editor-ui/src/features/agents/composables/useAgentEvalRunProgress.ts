/**
 * Watches an agent eval run from start to settled.
 *
 * A run executes the agent once per case, so it finishes long after the request
 * that started it returns. Progress therefore comes from polling the summary
 * route — status plus tallies, no per-case rows — until nothing is pending.
 *
 * State lives in the eval store; only the timers live here, which is what keeps
 * them tied to the calling component's scope.
 */
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useTimeoutPoll } from '@vueuse/core';
import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import {
	AGENT_EVAL_RUN_POLL_INTERVAL,
	AGENT_EVAL_RUN_POLL_MAX_ERRORS,
	AGENT_EVAL_RUN_POLL_TIMEOUT,
} from '@/app/constants/durations';

import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalRunRecord, AgentEvalRunSummary } from '../agentEvals.types';

type UseAgentEvalRunProgressParams = {
	projectId: MaybeRefOrGetter<string>;
	agentId: MaybeRefOrGetter<string>;
	datasetId: MaybeRefOrGetter<string>;
};

/** A run in one of these states is still doing work; anything else is final. */
const isUnsettled = (run: AgentEvalRunRecord) => run.status === 'new' || run.status === 'running';

export function useAgentEvalRunProgress(params: UseAgentEvalRunProgressParams) {
	const store = useAgentEvalsStore();
	const i18n = useI18n();
	const { showError, showMessage } = useToast();

	/** Set when we stop watching without seeing the run settle. */
	const lostTrack = ref(false);
	const consecutiveErrors = ref(0);
	/** Wall clock past which the current watch gives up; null when not watching. */
	const deadline = ref<number | null>(null);

	const run = computed(() => store.getLatestRun(toValue(params.datasetId)));
	const summary = computed(() => (run.value ? store.getRunSummary(run.value.id) : null));
	const isStarting = computed(() => store.isStartingRun(toValue(params.datasetId)));
	const isCancelling = computed(() => store.isCancellingRun(toValue(params.datasetId)));

	// `counts.pending` folds `new` and `running`, so it is exactly "not settled".
	// Before the first summary lands there are no counts, so the run's own status
	// stands in.
	const isRunning = computed(() => {
		if (!run.value) return false;

		const counts = summary.value?.counts;
		return counts ? counts.pending > 0 : isUnsettled(run.value);
	});

	function isStaleTarget(projectId: string, agentId: string, datasetId: string) {
		return (
			toValue(params.projectId) !== projectId ||
			toValue(params.agentId) !== agentId ||
			toValue(params.datasetId) !== datasetId
		);
	}

	function isStaleRun(projectId: string, agentId: string, datasetId: string, runId: string) {
		return isStaleTarget(projectId, agentId, datasetId) || run.value?.id !== runId;
	}

	function announceSettled(settled: AgentEvalRunSummary) {
		const { total, success, error, cancelled } = settled.counts;

		// A cancelled run has no meaningful pass tally — reporting one would read as a
		// result rather than an interruption.
		if (cancelled > 0) {
			showMessage({
				title: i18n.baseText('agents.builder.agentEvals.run.cancelled', {
					adjustToNumber: cancelled,
					interpolate: { cancelled: String(cancelled) },
				}),
				type: 'info',
			});
			return;
		}

		showMessage({
			title: i18n.baseText('agents.builder.agentEvals.run.finished', {
				adjustToNumber: total,
				interpolate: { success: String(success), total: String(total) },
			}),
			type: error > 0 ? 'warning' : 'success',
		});
	}

	// Created before `poll` is declared so the poll can stop itself from inside its
	// own tick without either reference reaching forward.
	//
	// `immediate: false` so constructing this doesn't start polling, and
	// `immediateCallback: true` so resuming polls at once instead of after a dead
	// first interval. `useTimeoutPoll` also waits for each poll to settle before
	// scheduling the next, which a bare interval would not — so a slow summary
	// request can't pile up overlapping requests.
	const { pause, resume } = useTimeoutPoll(async () => await poll(), AGENT_EVAL_RUN_POLL_INTERVAL, {
		immediate: false,
		immediateCallback: true,
	});

	function stopWatching(lost: boolean) {
		pause();
		deadline.value = null;
		consecutiveErrors.value = 0;
		lostTrack.value = lost;
	}

	async function poll() {
		const projectId = toValue(params.projectId);
		const agentId = toValue(params.agentId);
		const datasetId = toValue(params.datasetId);
		const runId = run.value?.id;

		if (!projectId || !agentId || !datasetId || !runId) {
			stopWatching(false);
			return;
		}

		// Guards a run that never reports settled — without this a forgotten tab
		// polls for as long as it stays open.
		if (deadline.value !== null && Date.now() > deadline.value) {
			stopWatching(true);
			return;
		}

		try {
			const next = await store.fetchRunSummary(projectId, agentId, datasetId, runId);
			// The view may have moved to another agent or dataset while this was in
			// flight; settling the new target on the old run's counts would be wrong.
			//
			// Drop the result without pausing. The target watcher already stopped this
			// watch and may have resumed it for the *new* dataset — pausing here would
			// kill that fresh poller and freeze its progress permanently.
			if (isStaleRun(projectId, agentId, datasetId, runId)) return;

			consecutiveErrors.value = 0;
			if (next.counts.pending === 0) {
				stopWatching(false);
				announceSettled(next);
			}
		} catch {
			if (isStaleRun(projectId, agentId, datasetId, runId)) return;

			// Retried rather than surfaced: a toast per failed poll would flood the
			// user for what is usually one dropped request.
			consecutiveErrors.value += 1;
			if (consecutiveErrors.value >= AGENT_EVAL_RUN_POLL_MAX_ERRORS) stopWatching(true);
		}
	}

	function beginWatching() {
		lostTrack.value = false;
		consecutiveErrors.value = 0;
		deadline.value = Date.now() + AGENT_EVAL_RUN_POLL_TIMEOUT;
		resume();
	}

	async function startRun() {
		const projectId = toValue(params.projectId);
		const agentId = toValue(params.agentId);
		const datasetId = toValue(params.datasetId);
		if (!projectId || !agentId || !datasetId) return;

		try {
			await store.startRun(projectId, agentId, datasetId);
			if (isStaleTarget(projectId, agentId, datasetId)) return;

			beginWatching();
		} catch (error) {
			if (isStaleTarget(projectId, agentId, datasetId)) return;

			showError(error, i18n.baseText('agents.builder.agentEvals.run.startError'));
		}
	}

	// Asks the runner to stop, then keeps polling: the cases already in flight settle
	// on their own, and the summary reaching zero pending is still what ends the watch.
	// Treating cancel as the end would strand the tallies mid-count.
	async function cancelRun() {
		const projectId = toValue(params.projectId);
		const agentId = toValue(params.agentId);
		const datasetId = toValue(params.datasetId);
		const runId = run.value?.id;
		if (!projectId || !agentId || !datasetId || !runId) return;

		try {
			await store.cancelRun(projectId, agentId, datasetId, runId);
		} catch (error) {
			if (isStaleRun(projectId, agentId, datasetId, runId)) return;

			showError(error, i18n.baseText('agents.builder.agentEvals.run.cancelError'));
		}
	}

	// Reading the newest run is what lets a reload mid-run pick it back up; without
	// it the view would render as idle and never update.
	async function adoptLatestRun() {
		const projectId = toValue(params.projectId);
		const agentId = toValue(params.agentId);
		const datasetId = toValue(params.datasetId);
		if (!projectId || !agentId || !datasetId) return;

		try {
			const latest = await store.fetchLatestRun(projectId, agentId, datasetId);
			if (isStaleTarget(projectId, agentId, datasetId)) return;

			// A finished run renders its counts once; only an unsettled one is worth polling.
			if (latest && isUnsettled(latest)) beginWatching();
		} catch {
			// A dataset whose runs can't be read renders as idle. Running still works,
			// and there is nothing here worth interrupting the user over.
		}
	}

	// Covers both mount and a switch of agent, project or dataset: the previous
	// watch stops before the new target is adopted.
	watch(
		[
			() => toValue(params.projectId),
			() => toValue(params.agentId),
			() => toValue(params.datasetId),
		],
		() => {
			stopWatching(false);
			void adoptLatestRun();
		},
		{ immediate: true },
	);

	// `useTimeoutPoll` already disposes with the surrounding scope. Stopping
	// explicitly as well because a leaked poller is silent — it keeps issuing
	// requests for a view nobody is looking at.
	onScopeDispose(() => pause());

	return { run, summary, isRunning, isStarting, isCancelling, lostTrack, startRun, cancelRun };
}
