<script setup lang="ts">
import { N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { computed, ref } from 'vue';

import { armCase, iterationPassed, summarizeFirstBuilds, sumToolStats } from '../../metrics';
import type { ViewerIndex } from '../../schema';
import { armColorVar } from '../colors';
import { comparisonRows } from '../comparison';
import { formatCost, formatNumber, formatSeconds, formatTokens } from '../format';
import type { Selection } from '../selection';
import ArmMetricsTable from './ArmMetricsTable.vue';
import MetricBars from './MetricBars.vue';
import ToolDonut, { type ToolMode } from './ToolDonut.vue';
import ToolModeControl from './ToolModeControl.vue';

const props = defineProps<{ index: ViewerIndex; caseName: string }>();
const emit = defineEmits<{ select: [selection: Selection] }>();

const BAR_METRICS = [
	'scenarios',
	'median.wallSeconds',
	'median.inputTokens',
	'median.cost',
	'median.toolCalls',
	'median.buildCalls',
	'median.tscErrors',
	'fb.oneShot',
	'fb.firstTryCorrect',
];

const toolMode = ref<ToolMode>('calls');
const entries = computed(() => props.index.arms.map((arm) => armCase(arm, props.caseName)));
const armNames = computed(() => props.index.arms.map((arm) => arm.name));
const rows = computed(() =>
	comparisonRows(
		entries.value.map((entry) => entry?.totals ?? null),
		entries.value.map((entry) =>
			summarizeFirstBuilds((entry?.iterations ?? []).map((iteration) => iteration.firstBuild)),
		),
	),
);
const barRows = computed(() =>
	BAR_METRICS.flatMap((id) => rows.value.filter((row) => row.id === id)),
);
const toolStats = computed(() =>
	entries.value.map((entry) =>
		sumToolStats((entry?.iterations ?? []).map((iteration) => iteration.toolStats)),
	),
);
</script>

<template>
	<div :class="$style.view" data-test-id="case-view">
		<header>
			<N8nText size="small" color="text-light">Case</N8nText>
			<N8nHeading tag="h1" size="xlarge">{{ caseName }}</N8nHeading>
		</header>

		<section :class="$style.section">
			<N8nHeading tag="h2" size="large">Arm comparison</N8nHeading>
			<MetricBars :arm-names="armNames" :rows="barRows" />
		</section>

		<section :class="$style.section">
			<N8nHeading tag="h2" size="large">Tools over the case</N8nHeading>
			<ToolModeControl v-model="toolMode" />
			<div :class="$style.donuts">
				<ToolDonut
					v-for="(arm, armIndex) in index.arms"
					:key="arm.path"
					:stats="toolStats[armIndex]"
					:mode="toolMode"
					:title="arm.name"
				/>
			</div>
		</section>

		<section :class="$style.section">
			<N8nHeading tag="h2" size="large">Iterations</N8nHeading>
			<table :class="$style.table">
				<thead>
					<tr>
						<th scope="col"><N8nText size="small" bold>Arm</N8nText></th>
						<th scope="col"><N8nText size="small" bold>Iteration</N8nText></th>
						<th scope="col"><N8nText size="small" bold>Scenarios</N8nText></th>
						<th scope="col"><N8nText size="small" bold>Time</N8nText></th>
						<th scope="col"><N8nText size="small" bold>Input tokens</N8nText></th>
						<th scope="col"><N8nText size="small" bold>Cost</N8nText></th>
						<th scope="col"><N8nText size="small" bold>Tool calls</N8nText></th>
						<th scope="col"><N8nText size="small" bold>Build calls (failed)</N8nText></th>
						<th scope="col"><N8nText size="small" bold>One-shot</N8nText></th>
					</tr>
				</thead>
				<tbody>
					<template v-for="(entry, armIndex) in entries" :key="armIndex">
						<tr
							v-for="iteration in entry?.iterations ?? []"
							:key="iteration.id"
							:class="$style.clickable"
							tabindex="0"
							:data-test-id="`case-iteration-${iteration.id}`"
							@click="emit('select', { kind: 'iteration', id: iteration.id, tab: 'transcript' })"
							@keydown.enter="
								emit('select', { kind: 'iteration', id: iteration.id, tab: 'transcript' })
							"
						>
							<td>
								<span
									:class="$style.dot"
									:style="{ backgroundColor: `var(${armColorVar(armIndex)})` }"
								/>
								<N8nText size="small">{{ index.arms[armIndex].name }}</N8nText>
							</td>
							<td>
								<N8nIcon
									v-if="iterationPassed(iteration) !== null"
									:icon="iterationPassed(iteration) ? 'check' : 'x'"
									:color="iterationPassed(iteration) ? 'success' : 'danger'"
									size="small"
								/>
								<N8nText size="small"> {{ iteration.index + 1 }} </N8nText>
								<N8nText size="xsmall" color="text-light">{{ iteration.sub }}</N8nText>
							</td>
							<td>
								<N8nText size="small">
									{{ iteration.scenarios.filter((run) => run.passed).length }}/{{
										iteration.scenarios.length
									}}
								</N8nText>
							</td>
							<td>
								<N8nText size="small">{{ formatSeconds(iteration.metrics?.wallSeconds) }}</N8nText>
							</td>
							<td>
								<N8nText size="small">{{ formatTokens(iteration.metrics?.inputTokens) }}</N8nText>
							</td>
							<td>
								<N8nText size="small">{{ formatCost(iteration.metrics?.cost) }}</N8nText>
							</td>
							<td>
								<N8nText size="small">{{ formatNumber(iteration.metrics?.toolCalls) }}</N8nText>
							</td>
							<td>
								<N8nText size="small">
									{{ formatNumber(iteration.metrics?.buildCalls) }} ({{
										formatNumber(iteration.metrics?.buildFailed)
									}})
								</N8nText>
							</td>
							<td>
								<N8nText size="small">{{ iteration.firstBuild.oneShot ? 'yes' : 'no' }}</N8nText>
							</td>
						</tr>
					</template>
				</tbody>
			</table>
		</section>

		<section :class="$style.section">
			<N8nHeading tag="h2" size="large">All metrics</N8nHeading>
			<ArmMetricsTable :arm-names="armNames" :rows="rows" />
		</section>
	</div>
</template>

<style module>
.view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.donuts {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(var(--spacing--5xl), 1fr));
	gap: var(--spacing--lg);
}

.table {
	border-collapse: collapse;
	width: 100%;
}

.table th,
.table td {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-bottom: var(--border);
	text-align: left;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.clickable {
	cursor: pointer;
}

@media (hover: hover) {
	.clickable:hover {
		background-color: var(--background--hover);
	}
}

.dot {
	display: inline-block;
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	margin-right: var(--spacing--4xs);
	border-radius: var(--radius--full);
}
</style>
