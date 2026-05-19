import type {
	AgentDebugInsightsResponse,
	AgentDebugRun,
	AgentDebugRunDetail,
	AgentReviewCase,
	AgentReviewSummary,
	UpsertAgentReviewCaseDto,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';

import {
	deleteAgentDebugRunReview,
	getAgentDebugInsights,
	getAgentDebugRunDetail,
	listAgentDebugReviewCases,
	listAgentDebugRuns,
	upsertAgentDebugRunReview,
} from './composables/useAgentDebugApi';

const ITEMS_PER_PAGE = 20;

export const useAgentDebugStore = defineStore('agentDebug', () => {
	const runs = ref<AgentDebugRun[]>([]);
	const selectedRun = shallowRef<AgentDebugRunDetail | null>(null);
	const insights = shallowRef<AgentDebugInsightsResponse | null>(null);
	const reviewCases = ref<AgentReviewCase[]>([]);
	const reviewSummary = shallowRef<AgentReviewSummary | null>(null);
	const nextCursor = ref<string | null>(null);
	const reviewCasesNextCursor = ref<string | null>(null);
	const loading = ref(false);
	const loadingDetail = ref(false);
	const loadingReviewCases = ref(false);

	let latestListKey: string | null = null;
	let latestDetailKey: string | null = null;
	let latestReviewCasesKey: string | null = null;

	function keyFor(projectId: string, agentId: string) {
		return `${projectId}:${agentId}`;
	}

	async function fetchRuns(projectId: string, agentId: string) {
		const key = keyFor(projectId, agentId);
		latestListKey = key;
		loading.value = true;
		try {
			const rootStore = useRootStore();
			const page = await listAgentDebugRuns(
				rootStore.restApiContext,
				projectId,
				agentId,
				ITEMS_PER_PAGE,
			);
			if (latestListKey !== key) return;
			runs.value = page.runs;
			nextCursor.value = page.nextCursor;
		} finally {
			if (latestListKey === key) loading.value = false;
		}
	}

	async function loadMore(projectId: string, agentId: string) {
		if (!nextCursor.value || loading.value) return;

		const key = keyFor(projectId, agentId);
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
			);
			if (latestListKey !== key) return;
			const seen = new Set(runs.value.map((run) => run.id));
			runs.value.push(...page.runs.filter((run) => !seen.has(run.id)));
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

	async function fetchInsights(projectId: string, agentId: string) {
		const rootStore = useRootStore();
		insights.value = await getAgentDebugInsights(rootStore.restApiContext, projectId, agentId);
	}

	async function fetchReviewCases(projectId: string, agentId: string) {
		const key = keyFor(projectId, agentId);
		latestReviewCasesKey = key;
		loadingReviewCases.value = true;
		try {
			const rootStore = useRootStore();
			const page = await listAgentDebugReviewCases(
				rootStore.restApiContext,
				projectId,
				agentId,
				ITEMS_PER_PAGE,
			);
			if (latestReviewCasesKey !== key) return;
			reviewCases.value = page.cases;
			reviewSummary.value = page.summary;
			reviewCasesNextCursor.value = page.nextCursor;
		} finally {
			if (latestReviewCasesKey === key) loadingReviewCases.value = false;
		}
	}

	async function loadMoreReviewCases(projectId: string, agentId: string) {
		if (!reviewCasesNextCursor.value || loadingReviewCases.value) return;

		const key = keyFor(projectId, agentId);
		if (latestReviewCasesKey !== null && latestReviewCasesKey !== key) return;
		loadingReviewCases.value = true;
		try {
			const rootStore = useRootStore();
			const page = await listAgentDebugReviewCases(
				rootStore.restApiContext,
				projectId,
				agentId,
				ITEMS_PER_PAGE,
				reviewCasesNextCursor.value,
			);
			if (latestReviewCasesKey !== key) return;
			const seen = new Set(reviewCases.value.map((reviewCase) => reviewCase.id));
			reviewCases.value.push(...page.cases.filter((reviewCase) => !seen.has(reviewCase.id)));
			reviewSummary.value = page.summary;
			reviewCasesNextCursor.value = page.nextCursor;
		} finally {
			if (latestReviewCasesKey === key) loadingReviewCases.value = false;
		}
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
		selectedRun.value = null;
		insights.value = null;
		reviewCases.value = [];
		reviewSummary.value = null;
		nextCursor.value = null;
		reviewCasesNextCursor.value = null;
		loading.value = false;
		loadingDetail.value = false;
		loadingReviewCases.value = false;
		latestListKey = null;
		latestDetailKey = null;
		latestReviewCasesKey = null;
	}

	return {
		runs,
		selectedRun,
		insights,
		reviewCases,
		reviewSummary,
		nextCursor,
		reviewCasesNextCursor,
		loading,
		loadingDetail,
		loadingReviewCases,
		fetchRuns,
		loadMore,
		fetchRunDetail,
		fetchInsights,
		fetchReviewCases,
		loadMoreReviewCases,
		saveRunReview,
		clearRunReview,
		reset,
	};
});
