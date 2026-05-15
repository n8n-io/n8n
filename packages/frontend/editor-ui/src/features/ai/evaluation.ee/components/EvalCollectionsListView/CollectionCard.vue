<script setup lang="ts">
import { N8nBadge, N8nButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useEvalCollectionsStore } from '../../evalCollections.store';
import type {
	EvaluationCollectionDetail,
	EvaluationCollectionRecord,
} from '../../evalCollections.types';
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

const status = computed<'done' | 'running'>(() => {
	if (!props.detail) return 'done';
	const inFlight = props.detail.runs.some((r) => r.status === 'new' || r.status === 'running');
	return inFlight ? 'running' : 'done';
});

// Append a right arrow so the CTA reads "Open compare →" the way the
// Figma mock does. N8nButton doesn't accept a trailing icon prop today,
// so the arrow lives in the label string.
const ctaLabel = computed(() => {
	const key =
		status.value === 'done' ? 'evaluation.compare.openCompare' : 'evaluation.compare.viewProgress';
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
	if (sameDay) return `today, ${timeFmt}`;
	const dateFmt = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	return `${dateFmt}, ${timeFmt}`;
});

// `EvaluationCollectionRunSummary` carries `workflowVersionId` (a UUID)
// but no friendly label — joining the wizard's per-version label would
// require a backend change. Until then, the letter-coded VersionAvatar
// (which doubles as the bar-chart x-axis label) is the chip's identity,
// with a short hash so cards stay distinguishable when multiple
// collections share the same versions.
const letterFor = (i: number) => {
	if (i < 26) return String.fromCharCode(65 + i);
	const first = Math.floor(i / 26) - 1;
	const second = i % 26;
	return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
};

const shortHash = (id: string) => id.slice(0, 6);

const versionChips = computed(() =>
	(props.detail?.runs ?? []).map((run, idx) => ({
		key: run.testRunId,
		index: idx,
		letter: letterFor(idx),
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
const groups = computed(() => {
	if (!props.detail) return [];
	const seen = new Set<string>();
	const order: string[] = [];
	for (const run of props.detail.runs) {
		if (!run.metrics) continue;
		for (const k of Object.keys(run.metrics)) {
			if (!seen.has(k)) {
				seen.add(k);
				order.push(k);
			}
		}
	}
	return order.map((key) => ({
		label: key,
		values: props.detail!.runs.map((run) => {
			if (!run.metrics) return null;
			const v = run.metrics[key];
			return typeof v === 'number' ? v : null;
		}),
	}));
});

// Lazy-load detail when the card scrolls into view via hover. Avoids
// firing N detail requests on the initial paint when the list has many
// collections.
const ensureDetailLoaded = () => {
	if (!props.detail) {
		void store.fetchCollectionDetail(props.workflowId, props.collection.id).catch(() => null);
	}
};
</script>

<template>
	<article
		:class="$style.card"
		data-test-id="eval-collections-card"
		@mouseenter="ensureDetailLoaded"
	>
		<div :class="$style.cardMain">
			<div :class="$style.cardHeading">
				<N8nText size="medium" bold>{{ collection.name }}</N8nText>
				<N8nBadge :theme="status === 'done' ? 'success' : 'tertiary'" size="small">
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
			<div :class="$style.versionsRow">
				<span v-for="chip in versionChips" :key="chip.key" :class="$style.versionChip">
					<VersionAvatar :index="chip.index" variant="dot" size="small" />
					<N8nText size="xsmall" bold>{{ chip.letter }}</N8nText>
					<N8nText size="xsmall" color="text-light">{{ chip.label }}</N8nText>
					<N8nText v-if="chip.score !== null" size="xsmall" bold>{{ chip.score }}%</N8nText>
				</span>
			</div>
			<div v-if="groups.length > 0" :class="$style.cardChart">
				<GroupedMetricChart :groups="groups" :max="1" />
			</div>
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
	</article>
</template>

<style module lang="scss">
.card {
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
	gap: var(--spacing--md);
	border: 1px solid var(--border-color--base);
	border-radius: var(--radius--md);
	background: var(--background--surface);
	padding: var(--spacing--md) var(--spacing--lg);
	box-shadow: var(--shadow--xs, 0 1px 2px rgba(0, 0, 0, 0.04));
	transition:
		border-color var(--transition-duration--fast) ease,
		box-shadow var(--transition-duration--fast) ease;

	// Hover preview for the click target TRUST-81 will wire up. The CTA
	// inside is currently disabled, but the whole card lifts so users
	// can see it's interactive once the compare route lands.
	&:hover {
		border-color: var(--border-color--strong, var(--color--neutral-300));
		box-shadow: var(--shadow--sm, 0 2px 6px rgba(0, 0, 0, 0.06));
	}
}

.cardMain {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
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
	padding: 4px 10px;
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
