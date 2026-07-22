<script setup lang="ts">
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { usePostHog } from '@/app/stores/posthog.store';

import CompareHeader from '../components/Compare/CompareHeader.vue';
import ScoreChart from '../components/Compare/ScoreChart.vue';
import AiInsightsCard from '../components/Compare/AiInsightsCard.vue';
import CompareTabs from '../components/Compare/CompareTabs.vue';
import DatasetMismatchBanner from '../components/Compare/DatasetMismatchBanner.vue';
import { useCompareData } from '../composables/useCompareData';
import { useCompareCases } from '../composables/useCompareCases';
import { useEvalCollectionsFlag } from '../composables/useEvalCollectionsFlag';
import { useEvalCollectionsStore } from '../evalCollections.store';
import { useEvaluationStore } from '../evaluation.store';

const props = defineProps<{
	workflowId: string;
	collectionId: string;
}>();

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const telemetry = useTelemetry();
const store = useEvalCollectionsStore();
const evaluationStore = useEvaluationStore();
const postHog = usePostHog();
const isEvalCollectionsEnabled = useEvalCollectionsFlag();

const detail = computed(() => store.getDetail(props.collectionId));

// metric name → its custom LLM-judge prompt, from the collection's eval config. Keyed
// by the metric's `name` so keys line up with the compare view. Empty until config resolves.
const metricPrompts = computed<Record<string, string>>(() => {
	const configId = detail.value?.evaluationConfigId;
	if (!configId) return {};
	const config = (evaluationStore.evaluationConfigsByWorkflowId[props.workflowId] ?? []).find(
		(candidate) => candidate.id === configId,
	);
	if (!config) return {};
	const prompts: Record<string, string> = {};
	for (const metric of config.metrics) {
		if (metric.type === 'llm_judge' && metric.config.prompt) {
			prompts[metric.name] = metric.config.prompt;
		}
	}
	return prompts;
});
const { compareData } = useCompareData(detail);
const workflowIdRef = computed(() => props.workflowId);
const {
	caseRows,
	mismatch,
	loading: casesLoading,
	casesLoaded,
	casesError,
} = useCompareCases(detail, workflowIdRef);

// Fire the compare-opened event once per collection, after case data resolves so case_count is accurate.
const tracked = ref(false);
watch(
	() => compareData.value !== null && casesLoaded.value,
	(ready) => {
		if (!ready || tracked.value) return;
		tracked.value = true;
		telemetry.track('Eval collection compared opened', {
			workflow_id: props.workflowId,
			collection_id: props.collectionId,
			version_count: compareData.value?.versions.length ?? 0,
			case_count: mismatch.value.maxCount,
		});
	},
	{ immediate: true },
);

const loading = computed(() => store.loadingDetail[props.collectionId] ?? false);
// Set only on a genuine 404 so a deleted collection stops rendering stale cached metrics;
// transient failures keep the last-known data on screen.
const notFound = ref(false);
// Empty/not-found state once the fetch settles with no data (or 404); guarded on
// `loading` so the skeleton isn't skipped on first paint.
const isEmpty = computed(() => notFound.value || (!loading.value && compareData.value === null));

function isNotFoundError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'httpStatusCode' in error &&
		error.httpStatusCode === 404
	);
}

// Tracks unmount so a late-resolving fetch can tear down the poll it armed.
let unmounted = false;

async function load(workflowId: string, collectionId: string) {
	notFound.value = false;
	try {
		await store.fetchCollectionDetail(workflowId, collectionId);
		// Best-effort: on failure the compare view just shows metric names without criteria.
		await evaluationStore.fetchEvaluationConfigs(workflowId).catch(() => null);
		// If we left or switched mid-fetch, fetchCollectionDetail may have re-armed polling
		// for a collection we're no longer showing; stop it so the timer doesn't outlive the view.
		if (unmounted || collectionId !== props.collectionId) {
			store.stopPolling(collectionId);
		}
	} catch (error) {
		// A 404 already shows the not-found state, so only toast transient (non-404) failures.
		if (isNotFoundError(error)) {
			notFound.value = true;
		} else {
			toast.showError(error, i18n.baseText('evaluation.compare.errors.loadFailed'));
		}
	}
}

function backToList() {
	void router.push({ name: VIEWS.EVALUATION_EDIT, params: { workflowId: props.workflowId } });
}

onMounted(async () => {
	// Bounce back to the list when the flag is off, mirroring the backend 404. Wait for flag
	// evaluation first, or the still-pending state would wrongly bounce an entitled user on hard reload.
	await postHog.waitForFeatureFlags();
	if (!isEvalCollectionsEnabled.value) {
		void router.replace({ name: VIEWS.EVALUATION_EDIT, params: { workflowId: props.workflowId } });
		return;
	}
	await load(props.workflowId, props.collectionId);
});

// The route reuses this instance across collections (only the param changes), so tear
// down the previous poll and refetch, or a stale timer keeps hitting the backend.
watch(
	[() => props.workflowId, () => props.collectionId],
	([, collectionId], [, prevCollectionId]) => {
		store.stopPolling(prevCollectionId);
		tracked.value = false;
		void load(props.workflowId, collectionId);
	},
);

onBeforeUnmount(() => {
	unmounted = true;
	store.stopPolling(props.collectionId);
});
</script>

<template>
	<div :class="$style.view" data-test-id="compare-collection-view">
		<N8nButton
			variant="ghost"
			size="small"
			icon="arrow-left"
			:label="i18n.baseText('evaluation.compare.backToList')"
			data-test-id="compare-back"
			@click="backToList"
		/>

		<div
			v-if="loading && compareData === null"
			:class="$style.skeleton"
			data-test-id="compare-loading"
		>
			<div :class="$style.skelHeader" />
			<div :class="$style.skelChart" />
		</div>

		<div v-else-if="isEmpty" :class="$style.empty" data-test-id="compare-empty">
			<N8nText size="medium" color="text-light">
				{{ i18n.baseText('evaluation.compare.errors.notFound') }}
			</N8nText>
		</div>

		<template v-else-if="compareData">
			<DatasetMismatchBanner
				v-if="casesLoaded && !casesError && mismatch.hasMismatch"
				:mismatch="mismatch"
			/>
			<CompareHeader
				:collection-name="detail?.name ?? ''"
				:versions="compareData.versions"
				:best-version-index="compareData.bestVersionIndex"
				:workflow-id="workflowId"
				:collection-id="collectionId"
			/>
			<ScoreChart
				:metric-groups="compareData.metricGroups"
				:versions="compareData.versions"
				:metric-prompts="metricPrompts"
			/>
			<!-- Key by collection so navigating remounts the card and re-runs its fetch-on-mount. -->
			<AiInsightsCard :key="collectionId" :workflow-id="workflowId" :collection-id="collectionId" />
			<CompareTabs
				:versions="compareData.versions"
				:metric-groups="compareData.metricGroups"
				:case-rows="caseRows"
				:cases-loading="casesLoading"
				:cases-error="casesError"
				:workflow-id="workflowId"
				:metric-prompts="metricPrompts"
				:metric-scales="detail?.metricScales"
			/>
		</template>
	</div>
</template>

<style module lang="scss">
.view {
	width: 100%;
	max-width: 1280px;
	margin: 0 auto;
	padding: var(--spacing--lg) var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.skeleton {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.skelHeader {
	height: 64px;
	border-radius: var(--radius--md);
	background: var(--background--subtle);
}

.skelChart {
	height: 220px;
	border-radius: var(--radius--md);
	background: var(--background--subtle);
}

.empty {
	padding: var(--spacing--2xl);
	text-align: center;
}
</style>
