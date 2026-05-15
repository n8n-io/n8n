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
}>();

const i18n = useI18n();
const store = useEvalCollectionsStore();

const status = computed<'done' | 'running'>(() => {
	if (!props.detail) return 'done';
	const inFlight = props.detail.runs.some((r) => r.status === 'new' || r.status === 'running');
	return inFlight ? 'running' : 'done';
});

const versionChips = computed(() =>
	(props.detail?.runs ?? []).map((run, idx) => ({
		key: run.testRunId,
		index: idx,
		label:
			run.workflowVersionId === null
				? i18n.baseText('evaluation.collections.card.currentDraft')
				: run.workflowVersionId,
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
				{{
					i18n.baseText('evaluation.collections.card.meta', {
						interpolate: {
							versions: String(detail?.runs.length ?? collection.runCount),
							runCount: String(detail?.runs.length ?? collection.runCount),
						},
					})
				}}
			</N8nText>
			<div :class="$style.versionsRow">
				<span v-for="chip in versionChips" :key="chip.key" :class="$style.versionChip">
					<VersionAvatar :index="chip.index" variant="dot" size="small" />
					<N8nText size="xsmall">{{ chip.label }}</N8nText>
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
					disabled
					:label="
						status === 'done'
							? i18n.baseText('evaluation.compare.openCompare')
							: i18n.baseText('evaluation.compare.viewProgress')
					"
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
	border-radius: var(--border-radius--base);
	background: var(--background--surface);
	padding: var(--spacing--md);
	box-shadow: var(--shadow--xs, 0 1px 2px rgba(0, 0, 0, 0.04));
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
	padding: 2px var(--spacing--2xs);
	border-radius: var(--border-radius--base);
	background: var(--background--subtle);
}

.cardChart {
	margin-top: var(--spacing--2xs);
}

.cardCta {
	justify-self: end;
}
</style>
