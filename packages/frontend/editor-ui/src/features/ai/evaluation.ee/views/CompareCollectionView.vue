<script setup lang="ts">
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useToast } from '@/app/composables/useToast';
import { usePostHog } from '@/app/stores/posthog.store';

import CompareHeader from '../components/Compare/CompareHeader.vue';
import ScoreChart from '../components/Compare/ScoreChart.vue';
import AiInsightsCard from '../components/Compare/AiInsightsCard.vue';
import { useCompareData } from '../composables/useCompareData';
import { useEvalCollectionsFlag } from '../composables/useEvalCollectionsFlag';
import { useEvalCollectionsStore } from '../evalCollections.store';

const props = defineProps<{
	workflowId: string;
	collectionId: string;
}>();

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const store = useEvalCollectionsStore();
const postHog = usePostHog();
const isEvalCollectionsEnabled = useEvalCollectionsFlag();

const detail = computed(() => store.getDetail(props.collectionId));
const { compareData } = useCompareData(detail);

const loading = computed(() => store.loadingDetail[props.collectionId] ?? false);
// Set only when the collection is genuinely gone (404), so a deleted collection
// stops rendering stale cached metrics. Transient failures keep the last-known
// data on screen rather than blanking it on a network blip.
const notFound = ref(false);
// Show the empty/not-found state once the fetch settles with no data, or when
// the collection 404s. Guarded on `loading` so the skeleton isn't skipped on
// first paint.
const isEmpty = computed(() => notFound.value || (!loading.value && compareData.value === null));

function isNotFoundError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'httpStatusCode' in error &&
		error.httpStatusCode === 404
	);
}

async function load(workflowId: string, collectionId: string) {
	notFound.value = false;
	try {
		await store.fetchCollectionDetail(workflowId, collectionId);
	} catch (error) {
		toast.showError(error, i18n.baseText('evaluation.compare.errors.loadFailed'));
		notFound.value = isNotFoundError(error);
	}
}

function backToList() {
	void router.push({ name: VIEWS.EVALUATION_EDIT, params: { workflowId: props.workflowId } });
}

onMounted(async () => {
	// A direct URL must not reach the compare view when the flag is off — mirror
	// the backend 404-ing its routes by bouncing back to the evaluations list.
	// Wait for client-side flag evaluation first: `isFeatureEnabled` coerces the
	// still-pending state to `false`, which is right for a reactive `v-if` but
	// would wrongly bounce an entitled cohort user hard-reloading this URL.
	await postHog.waitForFeatureFlags();
	if (!isEvalCollectionsEnabled.value) {
		void router.replace({ name: VIEWS.EVALUATION_EDIT, params: { workflowId: props.workflowId } });
		return;
	}
	await load(props.workflowId, props.collectionId);
});

// The compare route reuses this instance when navigating between collections
// (only the param changes), so tear down the previous collection's poll and
// refetch — otherwise a stale timer keeps hitting the backend.
watch(
	[() => props.workflowId, () => props.collectionId],
	([, collectionId], [, prevCollectionId]) => {
		store.stopPolling(prevCollectionId);
		void load(props.workflowId, collectionId);
	},
);

onBeforeUnmount(() => {
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
			<CompareHeader
				:collection-name="detail?.name ?? ''"
				:versions="compareData.versions"
				:best-version-index="compareData.bestVersionIndex"
			/>
			<ScoreChart :metric-groups="compareData.metricGroups" :versions="compareData.versions" />
			<!-- Key by collection so navigating between compare views remounts the
			     card and re-runs its fetch-on-mount, rather than relying on the
			     surrounding v-if to cycle through null. -->
			<AiInsightsCard :key="collectionId" :workflow-id="workflowId" :collection-id="collectionId" />
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
