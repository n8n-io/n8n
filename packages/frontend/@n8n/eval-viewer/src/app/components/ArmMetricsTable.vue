<script setup lang="ts">
import { N8nIcon, N8nTableBase, N8nText } from '@n8n/design-system';
import { computed } from 'vue';

import { RELATIVE_NOISE, trend } from '../../metrics';
import { armColorVar } from '../colors';
import { deltaText, type MetricRow } from '../comparison';
import { directionColor } from '../format';

const props = defineProps<{ armNames: string[]; rows: MetricRow[] }>();

const others = computed(() => props.armNames.slice(1).map((name, i) => ({ name, arm: i + 1 })));
/** Each row with one Δ cell per non-baseline arm: text, colour class and arrow. */
const groups = computed(() =>
	[...new Set(props.rows.map((row) => row.group))].map((group) => ({
		group,
		rows: props.rows
			.filter((row) => row.group === group)
			.map((row) => ({
				row,
				deltas: others.value.map((other) => {
					const base = row.values[0];
					// Rates carry no sample size here, so only numbers get a noise floor.
					const minChange = row.isRate ? 0 : Math.abs(base ?? 0) * RELATIVE_NOISE;
					const change = trend(base, row.values[other.arm], row.higherIsBetter, minChange);
					return {
						key: other.name,
						text: deltaText(row, base, row.values[other.arm]),
						color: directionColor(change.direction),
						arrow: change.arrow,
					};
				}),
			})),
	})),
);
</script>

<template>
	<N8nTableBase>
		<thead>
			<tr>
				<th scope="col"><N8nText size="small" bold>Metric</N8nText></th>
				<th v-for="(name, arm) in armNames" :key="name" scope="col">
					<span :class="$style.arm">
						<span :class="$style.dot" :style="{ backgroundColor: `var(${armColorVar(arm)})` }" />
						<N8nText size="small" bold :class="$style.name">{{ name }}</N8nText>
					</span>
				</th>
				<th v-for="other in others" :key="`delta-${other.name}`" scope="col">
					<N8nText size="small" bold :class="$style.name">Δ {{ other.name }}</N8nText>
				</th>
			</tr>
		</thead>
		<tbody v-for="entry in groups" :key="entry.group">
			<tr :class="$style.group">
				<td :colspan="1 + armNames.length + others.length">
					<N8nText size="xsmall" color="text-light">{{ entry.group }}</N8nText>
				</td>
			</tr>
			<tr v-for="{ row, deltas } in entry.rows" :key="row.id" :data-test-id="`metric-${row.id}`">
				<td>
					<N8nText size="small">{{ row.label }}</N8nText>
				</td>
				<td v-for="(text, arm) in row.texts" :key="arm" :class="$style.value">
					<N8nText size="small">{{ text }}</N8nText>
				</td>
				<td v-for="cell in deltas" :key="`delta-${cell.key}`">
					<span :class="[$style.value, $style.delta]">
						<N8nText size="small" :color="cell.color">{{ cell.text }}</N8nText>
						<N8nIcon v-if="cell.arrow" :icon="cell.arrow" :color="cell.color" size="xsmall" />
					</span>
				</td>
			</tr>
		</tbody>
	</N8nTableBase>
</template>

<style module>
.value {
	font-variant-numeric: tabular-nums;
}

/* Arm names are folder names: keep their case in table headers. */
.name {
	text-transform: none;
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

.delta {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

/* Group rows are section headings, not data. */
tr.group > td {
	height: auto;
	padding-block: var(--spacing--3xs);
	background-color: var(--background--subtle);
}
</style>
