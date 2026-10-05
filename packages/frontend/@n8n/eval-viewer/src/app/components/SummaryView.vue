<script setup lang="ts">
import { N8nCallout, N8nHeading, N8nText } from '@n8n/design-system';
import { computed, ref } from 'vue';

import {
	armCase,
	caseNamesOf,
	direction,
	iterationsOfArm,
	ratio,
	summarizeFirstBuilds,
	sumToolStats,
} from '../../metrics';
import type { ViewerIndex } from '../../schema';
import { armColorVar } from '../colors';
import { comparisonRows } from '../comparison';
import { formatCost, formatSeconds } from '../format';
import type { Selection } from '../selection';
import ArmMetricsTable from './ArmMetricsTable.vue';
import ToolDonut, { type ToolMode } from './ToolDonut.vue';
import ToolModeControl from './ToolModeControl.vue';

const props = defineProps<{ index: ViewerIndex }>();
const emit = defineEmits<{ select: [selection: Selection] }>();

const toolMode = ref<ToolMode>('calls');
const armNames = computed(() => props.index.arms.map((arm) => arm.name));
const rows = computed(() =>
	comparisonRows(
		props.index.arms.map((arm) => arm.totals),
		props.index.arms.map((arm) =>
			summarizeFirstBuilds(iterationsOfArm(arm).map((iteration) => iteration.firstBuild)),
		),
	),
);

interface MatrixCell {
	pass: string;
	cost: string;
	time: string;
	passClass: string;
	costClass: string;
	timeClass: string;
}

const matrix = computed(() =>
	caseNamesOf(props.index.arms).map((caseName) => {
		const totals = props.index.arms.map((arm) => armCase(arm, caseName)?.totals ?? null);
		const base = totals[0];
		const baseRate = base ? ratio(base.scenPass, base.scenN) : null;
		const cells = totals.map((entry, arm): MatrixCell => {
			const compare = (a: number | null, b: number | null, higherIsBetter: boolean) =>
				arm === 0 ? '' : (direction(a, b, higherIsBetter) ?? '');
			return {
				pass: entry && entry.scenN > 0 ? `${entry.scenPass}/${entry.scenN}` : '–',
				cost: formatCost(entry?.median.cost),
				time: formatSeconds(entry?.median.wallSeconds),
				passClass: compare(baseRate, entry ? ratio(entry.scenPass, entry.scenN) : null, true),
				costClass: compare(base?.median.cost ?? null, entry?.median.cost ?? null, false),
				timeClass: compare(
					base?.median.wallSeconds ?? null,
					entry?.median.wallSeconds ?? null,
					false,
				),
			};
		});
		return { caseName, cells };
	}),
);

const armToolStats = computed(() =>
	props.index.arms.map((arm) =>
		sumToolStats(iterationsOfArm(arm).map((iteration) => iteration.toolStats)),
	),
);
</script>

<template>
	<div :class="$style.view" data-test-id="summary-view">
		<header>
			<N8nHeading tag="h1" size="xlarge">Summary</N8nHeading>
			<ul :class="$style.arms">
				<li v-for="(arm, armIndex) in index.arms" :key="arm.path">
					<span :class="$style.dot" :style="{ backgroundColor: `var(${armColorVar(armIndex)})` }" />
					<N8nText bold>{{ arm.name }}</N8nText>
					<N8nText size="small" color="text-light">
						{{ armIndex === 0 ? 'baseline' : '' }} {{ arm.path }} ·
						{{ arm.totals?.builds ?? '–' }} builds
					</N8nText>
				</li>
			</ul>
			<N8nCallout
				v-for="arm in index.arms.filter((entry) => entry.warnings.length > 0)"
				:key="`warn-${arm.path}`"
				theme="warning"
			>
				{{ arm.name }}: {{ arm.warnings.join(' ') }}
			</N8nCallout>
		</header>

		<section :class="$style.section">
			<N8nHeading tag="h2" size="large">Per arm</N8nHeading>
			<N8nText size="small" color="text-light">
				Δ compares each arm with the first arm. Green is better, red is worse. Rates change in
				percentage points. A pooled baseline has more builds, so compare medians or means.
			</N8nText>
			<ArmMetricsTable :arm-names="armNames" :rows="rows" />
		</section>

		<section :class="$style.section">
			<N8nHeading tag="h2" size="large">Per case</N8nHeading>
			<N8nText size="small" color="text-light">
				Scenario pass, median cost and median time per build. Colours compare with the first arm.
				Select a row to open the case.
			</N8nText>
			<table :class="$style.matrix">
				<thead>
					<tr>
						<th scope="col" rowspan="2"><N8nText size="small" bold>Case</N8nText></th>
						<th v-for="(name, armIndex) in armNames" :key="name" scope="colgroup" colspan="3">
							<span
								:class="$style.dot"
								:style="{ backgroundColor: `var(${armColorVar(armIndex)})` }"
							/>
							<N8nText size="small" bold>{{ name }}</N8nText>
						</th>
					</tr>
					<tr>
						<template v-for="name in armNames" :key="`sub-${name}`">
							<th scope="col"><N8nText size="xsmall" color="text-light">scenarios</N8nText></th>
							<th scope="col"><N8nText size="xsmall" color="text-light">cost</N8nText></th>
							<th scope="col"><N8nText size="xsmall" color="text-light">time</N8nText></th>
						</template>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="row in matrix"
						:key="row.caseName"
						:class="$style.clickable"
						tabindex="0"
						:data-test-id="`matrix-${row.caseName}`"
						@click="emit('select', { kind: 'case', caseName: row.caseName })"
						@keydown.enter="emit('select', { kind: 'case', caseName: row.caseName })"
					>
						<th scope="row">
							<N8nText size="small">{{ row.caseName }}</N8nText>
						</th>
						<template v-for="(cell, arm) in row.cells" :key="arm">
							<td :class="$style[cell.passClass]">
								<N8nText size="small">{{ cell.pass }}</N8nText>
							</td>
							<td :class="$style[cell.costClass]">
								<N8nText size="small">{{ cell.cost }}</N8nText>
							</td>
							<td :class="$style[cell.timeClass]">
								<N8nText size="small">{{ cell.time }}</N8nText>
							</td>
						</template>
					</tr>
				</tbody>
			</table>
		</section>

		<section :class="$style.section">
			<N8nHeading tag="h2" size="large">Tools over the whole run</N8nHeading>
			<ToolModeControl v-model="toolMode" />
			<div :class="$style.donuts">
				<ToolDonut
					v-for="(arm, armIndex) in index.arms"
					:key="arm.path"
					:stats="armToolStats[armIndex]"
					:mode="toolMode"
					:title="arm.name"
				/>
			</div>
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

.arms {
	list-style: none;
	margin: var(--spacing--2xs) 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.arms li {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.dot {
	display: inline-block;
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	margin-right: var(--spacing--4xs);
	border-radius: var(--radius--full);
}

.matrix {
	border-collapse: collapse;
	width: 100%;
}

.matrix th,
.matrix td {
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

.better {
	background-color: var(--background--success);
}

.worse {
	background-color: var(--background--danger);
}

.donuts {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(var(--spacing--5xl), 1fr));
	gap: var(--spacing--lg);
}
</style>
