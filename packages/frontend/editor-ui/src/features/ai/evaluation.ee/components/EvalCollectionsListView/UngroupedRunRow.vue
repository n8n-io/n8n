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

const formattedDate = computed(() => {
	const d = new Date(props.run.runAt);
	if (Number.isNaN(d.getTime())) return props.run.runAt;
	return d.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
});
</script>

<template>
	<div :class="$style.runRow" data-test-id="eval-collections-ungrouped-row">
		<div :class="$style.runMeta">
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
		<N8nText v-if="score !== null" size="small" bold>{{ score }}%</N8nText>
		<N8nText v-else size="small" color="text-light">—</N8nText>
		<N8nBadge :theme="statusTheme" size="small">{{ statusLabel }}</N8nBadge>
	</div>
</template>

<style module lang="scss">
.runRow {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(120px, auto) 80px 96px;
	align-items: center;
	gap: var(--spacing--md);
	padding: var(--spacing--xs) var(--spacing--md);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--md);
	background: var(--background--surface);
}

.runMeta {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.datasetChip {
	justify-self: start;
}

.datasetEmpty {
	display: inline-block;
}
</style>
