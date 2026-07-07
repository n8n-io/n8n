import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as evalCollectionsApi from './evalCollections.api';
import type {
	AiInsightsResponse,
	CreateEvaluationCollectionPayload,
	EvalCollectionRunStatus,
	EvalVersionsResponse,
	EvaluationCollectionDetail,
	EvaluationCollectionRecord,
	UpdateEvaluationCollectionPayload,
} from './evalCollections.types';

const POLL_INTERVAL_MS = 3000;

// Give up after this many consecutive failed polls so a persistently-failing
// collection (deleted elsewhere → 404, expired session → 401) doesn't hammer
// the backend forever at the poll cadence.
const MAX_POLL_FAILURES = 3;

const isTerminal = (status: EvalCollectionRunStatus) =>
	status === 'completed' || status === 'error' || status === 'cancelled';

const hasInFlightRuns = (detail: EvaluationCollectionDetail) =>
	detail.runs.some((r) => !isTerminal(r.status));

export const useEvalCollectionsStore = defineStore(STORES.EVAL_COLLECTIONS, () => {
	const rootStore = useRootStore();

	// Cache keyed by workflowId so a user navigating between workflows doesn't
	// see stale list data from the previous one.
	const collectionsByWorkflowId = ref<Record<string, EvaluationCollectionRecord[]>>({});
	const collectionDetailById = ref<Record<string, EvaluationCollectionDetail>>({});
	const insightsByCollectionId = ref<Record<string, AiInsightsResponse>>({});
	const versionsByConfigId = ref<Record<string, EvalVersionsResponse>>({});

	// Per-collection polling timer ids. Mutated in place (not ref-replaced like
	// the other maps) — timer handles never render, so they need no reactivity.
	const pollingTimeouts = ref<Record<string, ReturnType<typeof setTimeout>>>({});

	// Monotonic token per collection. `stopPolling`/`cleanupPolling` bump it to
	// invalidate any tick that is mid-`await`: clearing a timer handle can't
	// cancel a request already in flight, so the tick re-checks its token after
	// awaiting and bails (instead of re-arming a loop into an emptied map that
	// would outlive the component). Plain Map — internal bookkeeping, not state.
	const pollTokens = new Map<string, number>();
	const nextPollToken = (collectionId: string) => {
		const token = (pollTokens.get(collectionId) ?? 0) + 1;
		pollTokens.set(collectionId, token);
		return token;
	};

	const loadingCollections = ref(false);
	const loadingDetail = ref<Record<string, boolean>>({});
	const loadingVersions = ref<Record<string, boolean>>({});
	const loadingInsights = ref<Record<string, boolean>>({});

	const isLoading = computed(() => loadingCollections.value);

	const getCollections = (workflowId: string) => collectionsByWorkflowId.value[workflowId] ?? [];

	const getDetail = (collectionId: string) => collectionDetailById.value[collectionId] ?? null;

	const getInsights = (collectionId: string) => insightsByCollectionId.value[collectionId] ?? null;

	const getVersions = (evaluationConfigId: string) =>
		versionsByConfigId.value[evaluationConfigId] ?? null;

	const fetchCollections = async (workflowId: string) => {
		loadingCollections.value = true;
		try {
			const list = await evalCollectionsApi.getCollections(rootStore.restApiContext, workflowId);
			collectionsByWorkflowId.value = {
				...collectionsByWorkflowId.value,
				[workflowId]: list,
			};
			return list;
		} finally {
			loadingCollections.value = false;
		}
	};

	const fetchCollectionDetail = async (workflowId: string, collectionId: string) => {
		loadingDetail.value = { ...loadingDetail.value, [collectionId]: true };
		try {
			const detail = await evalCollectionsApi.getCollection(
				rootStore.restApiContext,
				workflowId,
				collectionId,
			);
			collectionDetailById.value = {
				...collectionDetailById.value,
				[collectionId]: detail,
			};
			if (hasInFlightRuns(detail)) {
				startPolling(workflowId, collectionId);
			} else {
				stopPolling(collectionId);
			}
			return detail;
		} finally {
			loadingDetail.value = { ...loadingDetail.value, [collectionId]: false };
		}
	};

	const fetchEvalVersions = async (workflowId: string, evaluationConfigId: string) => {
		loadingVersions.value = { ...loadingVersions.value, [evaluationConfigId]: true };
		try {
			const response = await evalCollectionsApi.getEvalVersions(
				rootStore.restApiContext,
				workflowId,
				evaluationConfigId,
			);
			versionsByConfigId.value = {
				...versionsByConfigId.value,
				[evaluationConfigId]: response,
			};
			return response;
		} finally {
			loadingVersions.value = { ...loadingVersions.value, [evaluationConfigId]: false };
		}
	};

	const createCollection = async (
		workflowId: string,
		payload: CreateEvaluationCollectionPayload,
	) => {
		const response = await evalCollectionsApi.createCollection(
			rootStore.restApiContext,
			workflowId,
			payload,
		);

		const { runsStartedIds: _runs, ...record } = response;
		const list = collectionsByWorkflowId.value[workflowId] ?? [];
		collectionsByWorkflowId.value = {
			...collectionsByWorkflowId.value,
			[workflowId]: [record, ...list],
		};

		// Refresh detail so subsequent navigation has run rows + polling armed.
		// Best-effort: the collection is already created server-side, so a
		// transient detail/polling failure must not surface as a create failure
		// (which would push the user to retry and create a duplicate).
		await fetchCollectionDetail(workflowId, record.id).catch(() => null);
		return response;
	};

	const updateCollection = async (
		workflowId: string,
		collectionId: string,
		payload: UpdateEvaluationCollectionPayload,
	) => {
		const updated = await evalCollectionsApi.updateCollection(
			rootStore.restApiContext,
			workflowId,
			collectionId,
			payload,
		);
		const list = collectionsByWorkflowId.value[workflowId] ?? [];
		collectionsByWorkflowId.value = {
			...collectionsByWorkflowId.value,
			[workflowId]: list.map((c) => (c.id === collectionId ? { ...c, ...updated } : c)),
		};
		const cachedDetail = collectionDetailById.value[collectionId];
		if (cachedDetail) {
			collectionDetailById.value = {
				...collectionDetailById.value,
				[collectionId]: { ...cachedDetail, ...updated },
			};
		}
		return updated;
	};

	const deleteCollection = async (workflowId: string, collectionId: string) => {
		const result = await evalCollectionsApi.deleteCollection(
			rootStore.restApiContext,
			workflowId,
			collectionId,
		);
		if (result.success) {
			stopPolling(collectionId);
			const list = collectionsByWorkflowId.value[workflowId] ?? [];
			collectionsByWorkflowId.value = {
				...collectionsByWorkflowId.value,
				[workflowId]: list.filter((c) => c.id !== collectionId),
			};
			const { [collectionId]: _detail, ...restDetails } = collectionDetailById.value;
			collectionDetailById.value = restDetails;
			const { [collectionId]: _insights, ...restInsights } = insightsByCollectionId.value;
			insightsByCollectionId.value = restInsights;
		}
		return result;
	};

	// Both membership mutations return the freshly-recomputed detail from the
	// server, so we replace the cached detail wholesale. The server also busts
	// its insights cache on membership change; we mirror that locally by
	// dropping the cached envelope so the next compare-view load refetches.
	const applyMembershipChange = (
		workflowId: string,
		collectionId: string,
		detail: EvaluationCollectionDetail,
	) => {
		collectionDetailById.value = {
			...collectionDetailById.value,
			[collectionId]: detail,
		};
		const { [collectionId]: _stale, ...rest } = insightsByCollectionId.value;
		insightsByCollectionId.value = rest;
		if (hasInFlightRuns(detail)) {
			startPolling(workflowId, collectionId);
		} else {
			stopPolling(collectionId);
		}
	};

	const addExistingRun = async (workflowId: string, collectionId: string, testRunId: string) => {
		const detail = await evalCollectionsApi.addRunToCollection(
			rootStore.restApiContext,
			workflowId,
			collectionId,
			{ testRunId },
		);
		applyMembershipChange(workflowId, collectionId, detail);
		return detail;
	};

	const removeRun = async (workflowId: string, collectionId: string, runId: string) => {
		const detail = await evalCollectionsApi.removeRunFromCollection(
			rootStore.restApiContext,
			workflowId,
			collectionId,
			runId,
		);
		applyMembershipChange(workflowId, collectionId, detail);
		return detail;
	};

	const generateInsights = async (
		workflowId: string,
		collectionId: string,
		forceRegenerate = false,
	) => {
		loadingInsights.value = { ...loadingInsights.value, [collectionId]: true };
		try {
			const response = await evalCollectionsApi.generateInsights(
				rootStore.restApiContext,
				workflowId,
				collectionId,
				{ forceRegenerate },
			);
			insightsByCollectionId.value = {
				...insightsByCollectionId.value,
				[collectionId]: response,
			};
			return response;
		} finally {
			loadingInsights.value = { ...loadingInsights.value, [collectionId]: false };
		}
	};

	// Polling loop. Mirrors the simpler `evaluation.store.ts:startPollingTestRun`
	// pattern (per-id timer, latest tick owns the next setTimeout). Stops when
	// the detail comes back with no in-flight runs, so a collection that
	// completes between visits to the page doesn't hold an open timer.
	const startPolling = (workflowId: string, collectionId: string) => {
		// Guard against double-arming when both fetchDetail and addRun trigger
		// the helper in the same tick.
		if (pollingTimeouts.value[collectionId]) return;

		// Capture the token for this loop; if it's superseded (stop/cleanup, or
		// a fresh startPolling), every check below short-circuits.
		const token = nextPollToken(collectionId);
		const isCurrent = () => pollTokens.get(collectionId) === token;
		let failures = 0;

		const tick = async () => {
			if (!isCurrent()) return;
			try {
				const detail = await evalCollectionsApi.getCollection(
					rootStore.restApiContext,
					workflowId,
					collectionId,
				);
				// The loop was torn down while this request was in flight — do not
				// touch shared state or re-arm; that timer would outlive the view.
				if (!isCurrent()) return;
				failures = 0;
				collectionDetailById.value = {
					...collectionDetailById.value,
					[collectionId]: detail,
				};
				if (hasInFlightRuns(detail)) {
					pollingTimeouts.value[collectionId] = setTimeout(tick, POLL_INTERVAL_MS);
				} else {
					// A run just landed in a terminal state; the server busted the
					// insights cache and the next "open compare" should refetch.
					const { [collectionId]: _stale, ...rest } = insightsByCollectionId.value;
					insightsByCollectionId.value = rest;
					delete pollingTimeouts.value[collectionId];
				}
			} catch {
				if (!isCurrent()) return;
				failures += 1;
				if (failures >= MAX_POLL_FAILURES) {
					// Stop hammering the backend on a persistent failure; the user
					// can re-open the page to retry.
					delete pollingTimeouts.value[collectionId];
					return;
				}
				pollingTimeouts.value[collectionId] = setTimeout(tick, POLL_INTERVAL_MS);
			}
		};

		pollingTimeouts.value[collectionId] = setTimeout(tick, POLL_INTERVAL_MS);
	};

	const stopPolling = (collectionId: string) => {
		// Bump the token first so an in-flight tick bails instead of re-arming.
		nextPollToken(collectionId);
		const handle = pollingTimeouts.value[collectionId];
		if (handle) {
			clearTimeout(handle);
			delete pollingTimeouts.value[collectionId];
		}
	};

	const cleanupPolling = () => {
		// Invalidate every known loop so in-flight ticks bail on resume.
		for (const collectionId of pollTokens.keys()) {
			nextPollToken(collectionId);
		}
		Object.values(pollingTimeouts.value).forEach((handle) => clearTimeout(handle));
		pollingTimeouts.value = {};
	};

	return {
		collectionsByWorkflowId,
		collectionDetailById,
		insightsByCollectionId,
		versionsByConfigId,
		loadingDetail,
		loadingVersions,
		loadingInsights,
		isLoading,

		getCollections,
		getDetail,
		getInsights,
		getVersions,

		fetchCollections,
		fetchCollectionDetail,
		fetchEvalVersions,
		createCollection,
		updateCollection,
		deleteCollection,
		addExistingRun,
		removeRun,
		generateInsights,

		startPolling,
		stopPolling,
		cleanupPolling,
	};
});
