import type {
	AgentDebugInsightsResponse,
	AgentDebugRun,
	AgentDebugRunDetail,
	AgentDebugRunVersionSummary,
	AgentReviewCase,
	UpsertAgentReviewCaseDto,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';

import {
	deleteAgentDebugRunReview,
	getAgentDebugInsights,
	getAgentDebugRunDetail,
	listAgentDebugRuns,
	upsertAgentDebugRunReview,
} from './composables/useAgentDebugApi';

const ITEMS_PER_PAGE = 20;

export const useAgentDebugStore = defineStore('agentDebug', () => {
	const runs = ref<AgentDebugRun[]>([]);
	const runVersions = ref<AgentDebugRunVersionSummary[]>([]);
	const selectedRun = shallowRef<AgentDebugRunDetail | null>(null);
	const insights = shallowRef<AgentDebugInsightsResponse | null>(null);
	const nextCursor = ref<string | null>(null);
	const loading = ref(false);
	const loadingDetail = ref(false);

	let latestListKey: string | null = null;
	let latestDetailKey: string | null = null;

	function keyFor(projectId: string, agentId: string, agentVersionId?: string) {
		return `${projectId}:${agentId}:${agentVersionId ?? 'all'}`;
	}

	async function fetchRuns(projectId: string, agentId: string, agentVersionId?: string) {
		const key = keyFor(projectId, agentId, agentVersionId);
		latestListKey = key;
		loading.value = true;
		try {
			const rootStore = useRootStore();
			const page = await listAgentDebugRuns(
				rootStore.restApiContext,
				projectId,
				agentId,
				ITEMS_PER_PAGE,
				undefined,
				agentVersionId,
			);
			if (latestListKey !== key) return;
			runs.value = page.runs;
			runVersions.value = page.versions;
			nextCursor.value = page.nextCursor;
		} finally {
			if (latestListKey === key) loading.value = false;
		}
	}

	async function loadMore(projectId: string, agentId: string, agentVersionId?: string) {
		if (!nextCursor.value || loading.value) return;

		const key = keyFor(projectId, agentId, agentVersionId);
		if (latestListKey !== null && latestListKey !== key) return;
		loading.value = true;
		try {
			const rootStore = useRootStore();
			const page = await listAgentDebugRuns(
				rootStore.restApiContext,
				projectId,
				agentId,
				ITEMS_PER_PAGE,
				nextCursor.value,
				agentVersionId,
			);
			if (latestListKey !== key) return;
			const seen = new Set(runs.value.map((run) => run.id));
			runs.value.push(...page.runs.filter((run) => !seen.has(run.id)));
			runVersions.value = page.versions;
			nextCursor.value = page.nextCursor;
		} finally {
			if (latestListKey === key) loading.value = false;
		}
	}

	async function fetchRunDetail(projectId: string, agentId: string, runId: string) {
		const key = `${keyFor(projectId, agentId)}:${runId}`;
		latestDetailKey = key;
		loadingDetail.value = true;
		try {
			const rootStore = useRootStore();
			const detail = await getAgentDebugRunDetail(
				rootStore.restApiContext,
				projectId,
				agentId,
				runId,
			);
			if (latestDetailKey !== key) return;
			selectedRun.value = detail;
		} finally {
			if (latestDetailKey === key) loadingDetail.value = false;
		}
	}

	function clearSelectedRun() {
		selectedRun.value = null;
		loadingDetail.value = false;
		latestDetailKey = null;
	}

	async function fetchInsights(projectId: string, agentId: string) {
		const rootStore = useRootStore();
		insights.value = await getAgentDebugInsights(rootStore.restApiContext, projectId, agentId);
	}

	function updateRunReview(runId: string, review: AgentReviewCase | null) {
		runs.value = runs.value.map((run) => (run.id === runId ? { ...run, review } : run));
		if (selectedRun.value?.id === runId) {
			selectedRun.value = { ...selectedRun.value, review };
		}
	}

	async function saveRunReview(
		projectId: string,
		agentId: string,
		runId: string,
		payload: UpsertAgentReviewCaseDto,
	) {
		const rootStore = useRootStore();
		const review = await upsertAgentDebugRunReview(
			rootStore.restApiContext,
			projectId,
			agentId,
			runId,
			payload,
		);
		updateRunReview(runId, review);
		return review;
	}

	async function clearRunReview(projectId: string, agentId: string, runId: string) {
		const rootStore = useRootStore();
		await deleteAgentDebugRunReview(rootStore.restApiContext, projectId, agentId, runId);
		updateRunReview(runId, null);
	}

	function reset() {
		runs.value = [];
		runVersions.value = [];
		selectedRun.value = null;
		insights.value = null;
		nextCursor.value = null;
		loading.value = false;
		loadingDetail.value = false;
		latestListKey = null;
		latestDetailKey = null;
	}

	return {
		runs,
		runVersions,
		selectedRun,
		insights,
		nextCursor,
		loading,
		loadingDetail,
		fetchRuns,
		loadMore,
		fetchRunDetail,
		clearSelectedRun,
		fetchInsights,
		saveRunReview,
		clearRunReview,
		reset,
	};
});
