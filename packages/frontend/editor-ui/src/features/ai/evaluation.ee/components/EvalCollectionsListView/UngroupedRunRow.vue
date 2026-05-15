<script setup lang="ts">
import { N8nBadge, N8nText } from '@n8n/design-system';
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

const props = defineProps<{
	run: TestRunRecord;
}>();

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
		<N8nText v-if="score !== null" size="small" bold>{{ score }}%</N8nText>
		<N8nText v-else size="small" color="text-light">—</N8nText>
		<N8nBadge :theme="statusTheme" size="small">{{ run.status }}</N8nBadge>
	</div>
</template>

<style module lang="scss">
.runRow {
	display: grid;
	grid-template-columns: 1fr 80px 80px;
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
}
</style>
