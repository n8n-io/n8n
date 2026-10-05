<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { computed } from 'vue';

import { direction } from '../../metrics';
import { armColorVar } from '../colors';
import { deltaText, type MetricRow } from '../comparison';

const props = defineProps<{ armNames: string[]; rows: MetricRow[] }>();

const groups = computed(() =>
	[...new Set(props.rows.map((row) => row.group))].map((group) => ({
		group,
		rows: props.rows.filter((row) => row.group === group),
	})),
);
const others = computed(() => props.armNames.slice(1).map((name, i) => ({ name, arm: i + 1 })));
</script>

<template>
	<table :class="$style.table">
		<thead>
			<tr>
				<th scope="col"><N8nText size="small" bold>Metric</N8nText></th>
				<th v-for="(name, arm) in armNames" :key="name" scope="col">
					<span :class="$style.arm">
						<span :class="$style.dot" :style="{ backgroundColor: `var(${armColorVar(arm)})` }" />
						<N8nText size="small" bold>{{ name }}</N8nText>
					</span>
				</th>
				<th v-for="other in others" :key="`delta-${other.name}`" scope="col">
					<N8nText size="small" bold>Δ {{ other.name }}</N8nText>
				</th>
			</tr>
		</thead>
		<tbody v-for="entry in groups" :key="entry.group">
			<tr>
				<th :colspan="1 + armNames.length + others.length" scope="colgroup" :class="$style.group">
					<N8nText size="xsmall" color="text-light" bold>{{ entry.group }}</N8nText>
				</th>
			</tr>
			<tr v-for="row in entry.rows" :key="row.id" :data-test-id="`metric-${row.id}`">
				<th scope="row">
					<N8nText size="small">{{ row.label }}</N8nText>
				</th>
				<td v-for="(text, arm) in row.texts" :key="arm" :class="$style.value">
					<N8nText size="small">{{ text }}</N8nText>
				</td>
				<td
					v-for="other in others"
					:key="`delta-${other.name}`"
					:class="[
						$style.value,
						$style[direction(row.values[0], row.values[other.arm], row.higherIsBetter) ?? 'none'],
					]"
				>
					<N8nText size="small">{{ deltaText(row, row.values[0], row.values[other.arm]) }}</N8nText>
				</td>
			</tr>
		</tbody>
	</table>
</template>

<style module>
.table {
	border-collapse: collapse;
	width: 100%;
}

.table th,
.table td {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-bottom: var(--border);
	text-align: left;
}

.group {
	padding-top: var(--spacing--sm);
}

.value {
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.arm {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.dot {
	display: inline-block;
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
}

.better {
	background-color: var(--background--success);
}

.worse {
	background-color: var(--background--danger);
}
</style>
