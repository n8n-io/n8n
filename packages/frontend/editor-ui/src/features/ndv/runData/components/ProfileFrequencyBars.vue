<script setup lang="ts">
import { computed } from 'vue';
import { N8nText } from '@n8n/design-system';
import type { FrequencyEntry } from '../dataProfiling.types';
import { buildFrequencySlices } from '../dataProfilingChart.utils';

const props = defineProps<{
	entries: FrequencyEntry[];
	missingCount?: number;
	total: number;
}>();

const rows = computed(() => {
	const slices = buildFrequencySlices(props.entries, props.missingCount ?? 0);
	const maxCount = Math.max(...slices.map((slice) => slice.count));
	return slices.map((slice) => ({
		label: slice.label,
		count: slice.count,
		isAggregate: slice.kind !== 'value',
		percent: props.total > 0 ? Math.round((slice.count / props.total) * 100) : 0,
		widthPercent: maxCount > 0 ? (slice.count / maxCount) * 100 : 0,
	}));
});
</script>

<template>
	<div :class="$style.bars">
		<div v-for="row in rows" :key="row.label" :class="$style.row">
			<N8nText :class="$style.label" size="small" color="text-base">{{ row.label }}</N8nText>
			<div :class="$style.track">
				<div
					:class="[$style.fill, { [$style.fillAggregate]: row.isAggregate }]"
					:style="{ width: `${row.widthPercent}%` }"
				/>
			</div>
			<N8nText :class="$style.count" size="small" color="text-light">
				{{ row.count }} ({{ row.percent }}%)
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.bars {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.row {
	display: grid;
	grid-template-columns: minmax(0, 30%) 1fr auto;
	align-items: center;
	gap: var(--spacing--2xs);
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.track {
	height: var(--spacing--xs);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius--3xs);
	overflow: hidden;
}

.fill {
	height: 100%;
	min-width: 2px;
	background-color: var(--color--primary);
	border-radius: var(--radius--3xs);
}

.fillAggregate {
	background-color: var(--color--orange-300);
}

.count {
	white-space: nowrap;
	text-align: right;
}
</style>
