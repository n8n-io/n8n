<script setup lang="ts">
import { N8nBadge, N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';
import { useEvalCollectionsStore } from '../../evalCollections.store';
import type {
	EvaluationCollectionDetail,
	EvaluationCollectionRecord,
} from '../../evalCollections.types';
import {
	buildScoreShapedMetricGroups,
	countSettledRuns,
	deriveRunsStatus,
} from '../../evaluation.utils';
import GroupedMetricChart from '../shared/GroupedMetricChart.vue';
import RunningIndicator from '../shared/RunningIndicator.vue';
import VersionAvatar from '../shared/VersionAvatar.vue';

const props = defineProps<{
	collection: EvaluationCollectionRecord;
	detail: EvaluationCollectionDetail | null;
	workflowId: string;
	datasetName?: string;
}>();

const i18n = useI18n();
const router = useRouter();
const store = useEvalCollectionsStore();

const openCompare = () => {
	void router.push({
		name: VIEWS.EVALUATION_COLLECTION_COMPARE,
		params: { workflowId: props.workflowId, collectionId: props.collection.id },
	});
};

// null until detail loads (lazy-fetched per card), so we can't assert "Done" yet.
const status = computed<'done' | 'running' | 'error' | null>(() =>
	props.detail ? deriveRunsStatus(props.detail.runs) : null,
);
const isRunning = computed(() => status.value === 'running');

// Live completed-count while runs are in flight; the store's detail poll advances it.
const completedCount = computed(() => countSettledRuns(props.detail?.runs ?? []));
const versionCount = computed(() => props.detail?.runs.length ?? 0);

// Settled badge per status; null while loading or running so neither reads as settled.
const statusBadge = computed(() => {
	switch (status.value) {
		case 'done':
			return {
				theme: 'success' as const,
				label: i18n.baseText('evaluation.collections.card.done'),
			};
		case 'error':
			return {
				// `danger` to align with the run-level status pills' error colour.
				theme: 'danger' as const,
				label: i18n.baseText('evaluation.collections.card.failed'),
			};
		default:
			return null;
	}
});

// N8nButton has no trailing-icon prop, so the arrow lives in the label string.
const ctaLabel = computed(() => {
	const key =
		status.value === 'running'
			? 'evaluation.compare.viewProgress'
			: 'evaluation.compare.openCompare';
	return `${i18n.baseText(key)} →`;
});

// Most-recent completed run's timestamp; falls back to the collection's updatedAt.
const lastRunRelative = computed<string | null>(() => {
	const runs = props.detail?.runs ?? [];
	const completedAts = runs
		.map((r) => r.completedAt ?? r.runAt)
		.filter((v): v is string => !!v)
		.map((s) => new Date(s).getTime())
		.filter((n) => !Number.isNaN(n));
	const ts = completedAts.length
		? Math.max(...completedAts)
		: new Date(props.collection.updatedAt ?? 0).getTime();
	if (!ts || Number.isNaN(ts)) return null;
	const d = new Date(ts);
	const today = new Date();
	const sameDay =
		d.getFullYear() === today.getFullYear() &&
		d.getMonth() === today.getMonth() &&
		d.getDate() === today.getDate();
	const timeFmt = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	if (sameDay) {
		return i18n.baseText('evaluation.collections.card.lastRunToday', {
			interpolate: { time: timeFmt },
		});
	}
	const dateFmt = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	return i18n.baseText('evaluation.collections.card.lastRunOn', {
		interpolate: { date: dateFmt, time: timeFmt },
	});
});

// Run summary has no friendly version label (would need a backend change), so show a short hash.
const shortHash = (id: string) => id.slice(0, 7);

const versionChips = computed(() =>
	(props.detail?.runs ?? []).map((run, idx) => ({
		key: run.testRunId,
		index: idx,
		label:
			run.workflowVersionId === null
				? i18n.baseText('evaluation.collections.card.currentDraft')
				: shortHash(run.workflowVersionId),
		score: run.avgScore !== null ? Math.round(run.avgScore * 100) : null,
	})),
);

// Score-shaped metrics for the mini bar chart; shares buildScoreShapedMetricGroups with the hero so they can't drift.
const groups = computed(() =>
	props.detail
		? buildScoreShapedMetricGroups(props.detail.runs, props.detail.metricScales).map(
				({ key, values }) => ({
					label: key,
					values,
				}),
			)
		: [],
);

// Lazy-load detail when the card scrolls into view (no pointer needed).
// The `requested` guard blocks duplicate fetches and resets on failure so a retry can re-fire.
const cardRef = ref<HTMLElement | null>(null);
const requested = ref(false);

const ensureDetailLoaded = () => {
	if (props.detail || requested.value) return;
	requested.value = true;
	void store.fetchCollectionDetail(props.workflowId, props.collection.id).catch(() => {
		requested.value = false;
	});
};

const { observe } = useIntersectionObserver({
	root: ref(null),
	onIntersect: ensureDetailLoaded,
	once: false,
});

onMounted(() => observe(cardRef.value));
</script>

<template>
	<article ref="cardRef" :class="$style.card" data-test-id="eval-collections-card">
		<div :class="$style.cardTopRow">
			<div :class="$style.cardHeader">
				<div :class="$style.cardHeading">
					<N8nText size="medium" bold>{{ collection.name }}</N8nText>
					<RunningIndicator v-if="isRunning" :completed="completedCount" :total="versionCount" />
					<N8nBadge v-else-if="statusBadge" :theme="statusBadge.theme" size="small">
						{{ statusBadge.label }}
					</N8nBadge>
				</div>
				<N8nText size="xsmall" color="text-light">
					<span>{{
						i18n.baseText('evaluation.collections.card.meta.versions', {
							adjustToNumber: detail?.runs.length ?? collection.runCount,
						})
					}}</span>
					<span v-if="datasetName"> · {{ datasetName }}</span>
					<span v-if="lastRunRelative"> · {{ lastRunRelative }}</span>
				</N8nText>
			</div>
			<div :class="$style.cardCta">
				<N8nButton
					variant="outline"
					size="medium"
					:label="ctaLabel"
					data-test-id="eval-collections-card-cta"
					@click="openCompare"
				/>
			</div>
		</div>
		<div :class="$style.versionsRow">
			<span v-for="chip in versionChips" :key="chip.key" :class="$style.versionChip">
				<VersionAvatar :index="chip.index" variant="dot" size="small" />
				<N8nText size="xsmall" color="text-base">{{ chip.label }}</N8nText>
				<N8nText v-if="chip.score !== null" size="xsmall" bold>{{ chip.score }}%</N8nText>
			</span>
		</div>
		<div v-if="groups.length > 0" :class="$style.cardChart">
			<GroupedMetricChart :groups="groups" :max="1" />
		</div>
	</article>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--md);
	background: var(--background--surface);
	padding: var(--spacing--md) var(--spacing--lg);
	transition: border-color var(--animation--duration--snappy) var(--animation--easing);

	// Lift on hover so the whole card reads as an interactive gateway, not just the CTA.
	&:hover {
		border-color: var(--border-color--strong);
	}
}

// Title + meta on the left, CTA on the right, on the same row.
.cardTopRow {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.cardHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.cardHeading {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.versionsRow {
	display: inline-flex;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
}

.versionChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--background--subtle);
}

.cardChart {
	margin-top: var(--spacing--2xs);
}

.cardCta {
	justify-self: end;
}
</style>
