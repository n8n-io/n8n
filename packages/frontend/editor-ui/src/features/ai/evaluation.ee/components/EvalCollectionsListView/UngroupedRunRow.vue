<script setup lang="ts">
import { N8nBadge, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { TestRunRecord } from '../../evaluation.api';

const STATUS_PILL_THEME: Record<string, 'success' | 'warning' | 'danger' | 'tertiary'> = {
	completed: 'success',
	running: 'tertiary',
	new: 'tertiary',
	error: 'danger',
	cancelled: 'warning',
	success: 'success',
	warning: 'warning',
};

const STATUS_FRIENDLY_KEY: Record<string, string> = {
	completed: 'evaluation.collections.row.status.done',
	success: 'evaluation.collections.row.status.done',
	running: 'evaluation.collections.row.status.running',
	new: 'evaluation.collections.row.status.queued',
	error: 'evaluation.collections.row.status.failed',
	cancelled: 'evaluation.collections.row.status.cancelled',
	warning: 'evaluation.collections.row.status.warning',
};

const props = defineProps<{
	run: TestRunRecord;
	// `configId → dataset name` lookup, owned by the parent list view so it
	// fetches once per render rather than N times per row.
	datasetNameByConfigId?: Record<string, string>;
}>();

const i18n = useI18n();

// Average only score-shaped metrics (values in [0, 1]). Eval-config metrics
// commonly co-exist with absolute counts (tokens, latency_ms) in the same
// `metrics` map, and naively averaging across all of them produces nonsense
// like `198431%` (mostly the token total). Filtering by range is a heuristic
// but matches every score metric `evaluation.utils` recognizes today.
const score = computed<number | null>(() => {
	const m = props.run.metrics;
	if (!m) return null;
	const values = Object.values(m).filter(
		(v): v is number => typeof v === 'number' && v >= 0 && v <= 1,
	);
	if (values.length === 0) return null;
	return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100);
});

const statusTheme = computed(() => STATUS_PILL_THEME[props.run.status] ?? 'tertiary');

const statusLabel = computed(() => {
	const key = STATUS_FRIENDLY_KEY[props.run.status];
	if (key) return i18n.baseText(key as never);
	return props.run.status;
});

const datasetName = computed<string | null>(() => {
	const cfgId = (props.run as TestRunRecord & { evaluationConfigId?: string | null })
		.evaluationConfigId;
	if (!cfgId) return null;
	return props.datasetNameByConfigId?.[cfgId] ?? null;
});

// Inline date, mirroring Figma's `May 4 · 18:04` separator-joined format.
const formattedDate = computed(() => {
	const d = new Date(props.run.runAt);
	if (Number.isNaN(d.getTime())) return props.run.runAt;
	const datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	const timePart = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	return `${datePart} · ${timePart}`;
});
</script>

<template>
	<div :class="$style.runRow" data-test-id="eval-collections-ungrouped-row">
		<div :class="$style.runId">
			<N8nText size="small" bold>#{{ run.id.slice(0, 8) }}</N8nText>
			<N8nText size="xsmall" color="text-light">{{ formattedDate }}</N8nText>
		</div>
		<N8nBadge v-if="datasetName" theme="tertiary" size="small" :class="$style.datasetChip">
			{{ datasetName }}
		</N8nBadge>
		<span v-else :class="$style.datasetEmpty">
			<N8nText size="xsmall" color="text-light">{{
				i18n.baseText('evaluation.collections.row.noDataset')
			}}</N8nText>
		</span>
		<div :class="$style.progressTrack" :aria-hidden="score === null">
			<div v-if="score !== null" :class="$style.progressFill" :style="{ width: `${score}%` }" />
		</div>
		<N8nText v-if="score !== null" size="small" bold :class="$style.scoreText"
			>{{ score }}%</N8nText
		>
		<N8nText v-else size="small" color="text-light" :class="$style.scoreText">—</N8nText>
		<N8nBadge :theme="statusTheme" size="small" :class="$style.statusPill">{{
			statusLabel
		}}</N8nBadge>
	</div>
</template>

<style module lang="scss">
.runRow {
	display: grid;
	grid-template-columns: minmax(0, 1.4fr) minmax(80px, auto) minmax(120px, 1fr) 56px 96px;
	align-items: center;
	gap: var(--spacing--md);
	padding: var(--spacing--xs) var(--spacing--md);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--md);
	background: var(--background--surface);
}

.runId {
	display: inline-flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex-wrap: wrap;
}

.datasetChip {
	justify-self: start;
}

.datasetEmpty {
	display: inline-block;
}

.progressTrack {
	position: relative;
	height: 8px;
	border-radius: var(--radius--full);
	background: var(--background--subtle, var(--color--neutral-100));
	overflow: hidden;
}

.progressFill {
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	background: var(--color--success, var(--color--green-500));
	border-radius: var(--radius--full);
	transition: width var(--transition-duration--base, 180ms) ease;
}

.scoreText {
	text-align: right;
	font-variant-numeric: tabular-nums;
}

.statusPill {
	justify-self: end;
}
</style>
