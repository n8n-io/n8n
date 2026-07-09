<script setup lang="ts">
import { N8nBadge, N8nButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';

import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';
import { useEvalCollectionsStore } from '../../evalCollections.store';
import type {
	EvaluationCollectionDetail,
	EvaluationCollectionRecord,
} from '../../evalCollections.types';
import { isScoreShapedMetric } from '../../evaluation.utils';
import GroupedMetricChart from '../shared/GroupedMetricChart.vue';
import VersionAvatar from '../shared/VersionAvatar.vue';

const props = defineProps<{
	collection: EvaluationCollectionRecord;
	detail: EvaluationCollectionDetail | null;
	workflowId: string;
	datasetName?: string;
}>();

const i18n = useI18n();
const store = useEvalCollectionsStore();

// `null` until the detail (with run statuses) has loaded — the list view only
// pre-fetches detail for the first few cards and lazy-loads the rest on hover,
// so we must not assert "Done" for a card whose runs might still be in flight.
const status = computed<'done' | 'running' | null>(() => {
	if (!props.detail) return null;
	const inFlight = props.detail.runs.some((r) => r.status === 'new' || r.status === 'running');
	return inFlight ? 'running' : 'done';
});

// Append a right arrow so the CTA reads "Open compare →" the way the
// Figma mock does. N8nButton doesn't accept a trailing icon prop today,
// so the arrow lives in the label string. The button stays disabled until
// the compare view lands in a follow-up.
const ctaLabel = computed(() => {
	const key =
		status.value === 'running'
			? 'evaluation.compare.viewProgress'
			: 'evaluation.compare.openCompare';
	return `${i18n.baseText(key)} →`;
});

// "today, 09:14" / "May 12, 09:14" — most-recent completed run's timestamp.
// Falls back to the collection's `updatedAt` if no run has a date yet.
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

// `EvaluationCollectionRunSummary` carries `workflowVersionId` (a UUID)
// but no friendly label — joining the wizard's per-version label would
// require a backend change. Until then, render a short hash inline next
// to the colored dot so the chip stays compact and matches the Figma
// shape (`● <name> <score>`). Identity-by-color is already encoded by
// the VersionAvatar dot index.
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

// Union of metric keys across runs, in first-seen order. A run that
// skipped (no metrics) leaves a hole — `null` value — rather than
// shifting later versions forward, matching the avatar/index identity.
//
// Only score-shaped metrics (values in [0, 1]) are charted: the mini bar
// chart clamps to max=1, so an absolute-count metric (tokens, latency_ms)
// would render a meaningless maxed-out bar. Mirrors the same filter in
// `UngroupedRunRow`'s avg-score calc.
const groups = computed(() => {
	if (!props.detail) return [];
	const runs = props.detail.runs;
	const seen = new Set<string>();
	const order: string[] = [];
	for (const run of runs) {
		if (!run.metrics) continue;
		for (const k of Object.keys(run.metrics)) {
			if (!seen.has(k)) {
				seen.add(k);
				order.push(k);
			}
		}
	}

	const isScoreShapedKey = (key: string) =>
		runs.every((run) => {
			const v = run.metrics?.[key];
			return v === undefined || isScoreShapedMetric(v);
		});

	return order.filter(isScoreShapedKey).map((key) => ({
		label: key,
		values: runs.map((run) => {
			const v = run.metrics?.[key];
			return typeof v === 'number' ? v : null;
		}),
	}));
});

// Lazy-load detail when the card scrolls into view, so cards past the first
// few (which the list pre-fetches) populate their status/chips/chart without
// depending on a pointer — works for touch, keyboard, and scroll alike. The
// `requested` guard avoids duplicate in-flight fetches while detail is loading;
// it resets on failure so a re-intersect can retry.
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
					<N8nBadge v-if="status" :theme="status === 'done' ? 'success' : 'tertiary'" size="small">
						{{
							i18n.baseText(
								status === 'done'
									? 'evaluation.collections.card.done'
									: 'evaluation.collections.card.running',
							)
						}}
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
				<N8nTooltip placement="top" :content="i18n.baseText('evaluation.compare.comingSoon')">
					<N8nButton
						variant="outline"
						size="medium"
						disabled
						:label="ctaLabel"
						data-test-id="eval-collections-card-cta"
					/>
				</N8nTooltip>
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

	// Hover preview for the click target the compare view will wire up. The
	// CTA inside is currently disabled, but the whole card lifts so users
	// can see it's interactive once the compare route lands.
	&:hover {
		border-color: var(--border-color--strong);
	}
}

// Title + meta on the left, CTA on the right — Figma puts the "Open
// compare" button on the same horizontal row as the collection name
// rather than vertically centred against the chart.
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
