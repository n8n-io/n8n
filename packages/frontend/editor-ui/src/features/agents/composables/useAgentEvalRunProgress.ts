/**
 * Watches an agent eval run from start to settled, for the cases card.
 *
 * A run executes the agent once per case, so it finishes long after the request
 * that started it returns. Progress therefore comes from polling the summary
 * route — status plus tallies, no per-case rows — until nothing is pending.
 *
 * The polling itself lives in the store rather than here. It has to refresh the
 * run's per-case rows as well as its counts (rows read mid-run still show as
 * queued with no answer), which the review view depends on — so there is one
 * poller for the run, not one per surface. This composable owns the lifecycle for
 * this card: when to start it, when to stop it, and what to say when it settles.
 */
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalRunSummary } from '../agentEvals.types';

type UseAgentEvalRunProgressParams = {
	projectId: MaybeRefOrGetter<string>;
	agentId: MaybeRefOrGetter<string>;
	datasetId: MaybeRefOrGetter<string>;
};

export function useAgentEvalRunProgress(params: UseAgentEvalRunProgressParams) {
	const store = useAgentEvalsStore();
	const i18n = useI18n();
	const { showError, showMessage } = useToast();

	/** The run this card is watching, once one is known. */
	const runId = computed(() => store.getLatestRunId(toValue(params.datasetId)) ?? null);

	const review = computed(() => (runId.value ? store.getReview(runId.value) : null));
	const summary = computed(() => review.value?.counts ?? null);

	const isStarting = computed(() => store.isStartingRun(toValue(params.datasetId)));
	const isCancelling = computed(() => store.isCancellingRun(toValue(params.datasetId)));
	const isRunning = computed(() => (runId.value ? store.isRunInFlight(runId.value) : false));
	const lostTrack = computed(() => (runId.value ? store.hasLostTrackOfRun(runId.value) : false));

	/**
	 * True until we know whether this dataset already has a run. `resolveLatestRunId`
	 * writes the answer into the store, so starting a run while it is in flight would
	 * let a "no run yet" result land afterwards and wipe the id of the run just
	 * started — leaving it unwatched with no progress and no stop control.
	 */
	const isResolving = ref(true);

	/** Announced once per run, so a re-render can't re-toast a run already reported. */
	const announcedRunIds = ref(new Set<string>());

	function announceSettled(id: string, counts: AgentEvalRunSummary['counts']) {
		if (announcedRunIds.value.has(id)) return;
		announcedRunIds.value.add(id);

		const { total, success, error, cancelled } = counts;

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

	function isStaleTarget(projectId: string, agentId: string, datasetId: string) {
		return (
			toValue(params.projectId) !== projectId ||
			toValue(params.agentId) !== agentId ||
			toValue(params.datasetId) !== datasetId
		);
	}

	function watchRun(id: string) {
		store.startPollingRun(toValue(params.projectId), toValue(params.agentId), id);
	}

	async function startRun() {
		const projectId = toValue(params.projectId);
		const agentId = toValue(params.agentId);
		const datasetId = toValue(params.datasetId);
		if (!projectId || !agentId || !datasetId || isResolving.value) return;

		try {
			const run = await store.startRun(projectId, agentId, datasetId);
			if (isStaleTarget(projectId, agentId, datasetId)) return;

			// The run's cases have to exist in review state before polling refreshes
			// them, and it is what the results view reads when it takes over.
			await store.openRun(projectId, agentId, run.id).catch(() => null);
			if (isStaleTarget(projectId, agentId, datasetId)) return;

			watchRun(run.id);
		} catch (error) {
			if (isStaleTarget(projectId, agentId, datasetId)) return;

			showError(error, i18n.baseText('agents.builder.agentEvals.run.startError'));
		}
	}

	// Asks the runner to stop, then keeps polling: the cases already in flight settle
	// on their own, and the summary reaching zero pending is still what ends the
	// watch. Treating cancel as the end would strand the tallies mid-count.
	async function cancelRun() {
		const projectId = toValue(params.projectId);
		const agentId = toValue(params.agentId);
		const datasetId = toValue(params.datasetId);
		const id = runId.value;
		if (!projectId || !agentId || !datasetId || !id) return;

		try {
			await store.cancelRun(projectId, agentId, datasetId, id);
		} catch (error) {
			if (isStaleTarget(projectId, agentId, datasetId)) return;

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

		isResolving.value = true;
		try {
			const id = await store.resolveLatestRunId(projectId, agentId, datasetId);
			if (!id || isStaleTarget(projectId, agentId, datasetId)) return;

			await store.openRun(projectId, agentId, id).catch(() => null);
			if (isStaleTarget(projectId, agentId, datasetId)) return;

			// A finished run renders its counts once; only an unsettled one is worth polling.
			if (store.isRunInFlight(id)) watchRun(id);
		} catch {
			// A dataset whose runs can't be read renders as idle. Running still works,
			// and there is nothing here worth interrupting the user over.
		} finally {
			isResolving.value = false;
		}
	}

	// Settling is observed rather than returned, because the store owns the poll: the
	// counts reaching zero pending is the signal, whoever produced it.
	watch([runId, summary], ([id, counts]) => {
		if (!id || !counts) return;
		if (counts.pending === 0) announceSettled(id, counts);
	});

	// Covers both mount and a switch of agent, project or dataset: the previous watch
	// stops before the new target is adopted.
	watch(
		[
			() => toValue(params.projectId),
			() => toValue(params.agentId),
			() => toValue(params.datasetId),
		],
		() => {
			store.stopPollingRun();
			void adoptLatestRun();
		},
		{ immediate: true },
	);

	// A leaked poller is silent — it keeps issuing requests for a view nobody is
	// looking at. The results view stops it on unmount for the same reason.
	onScopeDispose(() => store.stopPollingRun());

	return {
		runId,
		summary,
		isRunning,
		isStarting,
		isCancelling,
		isResolving,
		lostTrack,
		startRun,
		cancelRun,
	};
}
