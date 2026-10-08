<script setup lang="ts">
import {
	N8nCallout,
	N8nCollapsiblePanel,
	N8nHeading,
	N8nIcon,
	N8nTableBase,
	N8nText,
} from '@n8n/design-system';
import { computed, ref } from 'vue';

import {
	armCase,
	attemptTotals,
	caseNamesOf,
	caseOf,
	iterationsOfArm,
	rateNoise,
	ratio,
	RELATIVE_NOISE,
	sharedCaseNames,
	summarizeFirstBuilds,
	trend,
	type AttemptTotals,
	type Trend,
} from '../../metrics';
import type { ViewerIndex } from '../../schema';
import { armColorVar } from '../colors';
import { comparisonRows } from '../comparison';
import {
	directionColor,
	formatCost,
	formatNumber,
	formatRate,
	formatSeconds,
	formatSigned,
	formatTokens,
} from '../format';
import type { Selection } from '../selection';
import ArmMetricsTable from './ArmMetricsTable.vue';
import PageHeader from './PageHeader.vue';

const props = defineProps<{ index: ViewerIndex }>();
const emit = defineEmits<{ select: [selection: Selection] }>();

const showMetrics = ref(false);
const crumbs: Array<{ label: string; selection: Selection }> = [
	{ label: 'Summary', selection: { kind: 'summary' } },
];

const NO_TREND: Trend = { direction: null, arrow: null };
const armNames = computed(() => props.index.arms.map((arm) => arm.name));
const rows = computed(() =>
	comparisonRows(
		props.index.arms.map((arm) => arm.totals),
		props.index.arms.map((arm) =>
			summarizeFirstBuilds(iterationsOfArm(arm).map((iteration) => iteration.firstBuild)),
		),
	),
);

const passRate = (totals: AttemptTotals) => ratio(totals.passed, totals.attempts);

/** Pass rate, cost, time and tokens of `value` against `base`, each beyond its noise floor. */
function trends(base: AttemptTotals | null, value: AttemptTotals | null) {
	if (!base || !value) return { pass: NO_TREND, cost: NO_TREND, time: NO_TREND, tokens: NO_TREND };
	const relative = (baseValue: number | null) => Math.abs(baseValue ?? 0) * RELATIVE_NOISE;
	return {
		pass: trend(passRate(base), passRate(value), true, rateNoise(base.attempts, value.attempts)),
		cost: trend(base.medianCost, value.medianCost, false, relative(base.medianCost)),
		time: trend(base.medianTime, value.medianTime, false, relative(base.medianTime)),
		tokens: trend(base.medianTokens, value.medianTokens, false, relative(base.medianTokens)),
	};
}

const relativeChange = (base: number | null, value: number | null) =>
	base === null || value === null || base === 0 ? null : ((value - base) / base) * 100;
const signedPercent = (percent: number | null) =>
	formatSigned(percent, (value) => `${formatNumber(value)}%`);

const sharedCases = computed(() => sharedCaseNames(props.index.arms));

/**
 * Each arm over the cases every arm ran, against the first arm. A pass rate changes in
 * percentage points; time and tokens change relative to the baseline.
 */
const headline = computed(() => {
	const totals = props.index.arms.map((arm) =>
		attemptTotals(
			sharedCases.value.flatMap((caseName) => armCase(arm, caseName)?.iterations ?? []),
		),
	);
	const base = totals[0];
	return props.index.arms.map((arm, armIndex) => {
		const own = totals[armIndex];
		const isBaseline = armIndex === 0;
		const vsBase = isBaseline ? trends(null, null) : trends(base, own);
		const ownRate = passRate(own);
		const baseRate = passRate(base);
		return {
			arm,
			cells: [
				{
					text: formatRate(own.passed, own.attempts),
					change: ownRate === null || baseRate === null ? null : (ownRate - baseRate) * 100,
					trend: vsBase.pass,
				},
				{
					text: formatSeconds(own.medianTime),
					change: relativeChange(base.medianTime, own.medianTime),
					trend: vsBase.time,
				},
				{
					text: formatTokens(own.medianTokens),
					change: relativeChange(base.medianTokens, own.medianTokens),
					trend: vsBase.tokens,
				},
			].map((cell) => ({ ...cell, change: isBaseline ? null : signedPercent(cell.change) })),
		};
	});
});

/** Regressions against the baseline first, then cases with failures, then the rest. */
const matrix = computed(() =>
	caseNamesOf(props.index.arms)
		.map((caseName) => {
			const totals = props.index.arms.map((arm) => {
				const entry = armCase(arm, caseName);
				return entry ? attemptTotals(entry.iterations) : null;
			});
			const cells = totals.map((entry, arm) => {
				const change = arm === 0 ? trends(null, null) : trends(totals[0], entry);
				return {
					regression: change.pass.direction === 'worse',
					values: [
						{ text: entry ? `${entry.passed}/${entry.attempts}` : '–', trend: change.pass },
						{ text: formatCost(entry?.medianCost), trend: change.cost },
						{ text: formatSeconds(entry?.medianTime), trend: change.time },
					],
				};
			});
			const failing = totals.some((entry) => entry !== null && entry.passed < entry.attempts);
			return {
				caseName,
				title: caseOf(props.index.arms, caseName)?.title ?? caseName,
				cells,
				rank: cells.some((cell) => cell.regression) ? 0 : failing ? 1 : 2,
			};
		})
		.sort((a, b) => a.rank - b.rank),
);
</script>

<template>
	<div :class="$style.view" data-test-id="summary-view">
		<PageHeader :crumbs="crumbs" title="Summary">
			<template #meta>
				<template v-for="(arm, armIndex) in index.arms" :key="arm.path">
					<N8nText v-if="armIndex > 0" size="small" color="text-light">vs</N8nText>
					<span :class="$style.arm">
						<span
							:class="$style.dot"
							:style="{ backgroundColor: `var(${armColorVar(armIndex)})` }"
						/>
						<N8nText size="small" color="text-light">{{ arm.name }}</N8nText>
					</span>
				</template>
				<N8nText size="small" color="text-light">· the first arm is the baseline</N8nText>
			</template>
			<N8nCallout
				v-for="arm in index.arms.filter((entry) => entry.warnings.length > 0)"
				:key="`warn-${arm.path}`"
				theme="warning"
			>
				{{ arm.name }}: {{ arm.warnings.join(' ') }}
			</N8nCallout>
		</PageHeader>

		<section :class="$style.section">
			<N8nTableBase data-test-id="arm-headline">
				<thead>
					<tr>
						<th scope="col">Arm</th>
						<th scope="col">Correctness</th>
						<th scope="col">Median time</th>
						<th scope="col">Median tokens</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(entry, armIndex) in headline" :key="entry.arm.path">
						<td>
							<span
								:class="$style.dot"
								:style="{ backgroundColor: `var(${armColorVar(armIndex)})` }"
							/>
							<N8nText bold :title="entry.arm.path">{{ entry.arm.name }}</N8nText>
						</td>
						<td v-for="(cell, at) in entry.cells" :key="at">
							<span :class="$style.value">
								<N8nText bold>{{ cell.text }}</N8nText>
								<template v-if="cell.change">
									<N8nText :color="directionColor(cell.trend.direction)">{{ cell.change }}</N8nText>
									<N8nIcon
										v-if="cell.trend.arrow"
										:icon="cell.trend.arrow"
										:color="directionColor(cell.trend.direction)"
										size="small"
									/>
								</template>
							</span>
						</td>
					</tr>
				</tbody>
			</N8nTableBase>
		</section>

		<section :class="$style.section">
			<N8nHeading tag="h2" size="large">Per case</N8nHeading>
			<N8nText size="small" color="text-light">
				Attempts passed, median cost and median time against the first arm. Colour marks a change of
				at least one attempt, or {{ RELATIVE_NOISE * 100 }}% in cost or time. Regressions come
				first.
			</N8nText>
			<N8nTableBase>
				<thead>
					<tr>
						<th scope="col" rowspan="2">Case</th>
						<th v-for="(name, armIndex) in armNames" :key="name" scope="colgroup" colspan="3">
							<span
								:class="$style.dot"
								:style="{ backgroundColor: `var(${armColorVar(armIndex)})` }"
							/>
							<span :class="$style.name">{{ name }}</span>
						</th>
					</tr>
					<tr>
						<template v-for="name in armNames" :key="`sub-${name}`">
							<th scope="col">passed</th>
							<th scope="col">cost</th>
							<th scope="col">time</th>
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
						<td>
							<div :class="$style.case">
								<N8nText size="small" bold>{{ row.title }}</N8nText>
								<N8nText size="xsmall" color="text-light">{{ row.caseName }}</N8nText>
							</div>
						</td>
						<template v-for="(cell, arm) in row.cells" :key="arm">
							<td v-for="(value, at) in cell.values" :key="at">
								<span :class="$style.value">
									<N8nText size="small" :color="directionColor(value.trend.direction)">{{
										value.text
									}}</N8nText>
									<N8nIcon
										v-if="value.trend.arrow"
										:icon="value.trend.arrow"
										:color="directionColor(value.trend.direction)"
										size="xsmall"
									/>
								</span>
							</td>
						</template>
					</tr>
				</tbody>
			</N8nTableBase>
		</section>

		<div>
			<N8nCollapsiblePanel v-model="showMetrics" title="All metrics">
				<div :class="$style.section">
					<N8nText size="small" color="text-light">
						All cases of each run, from summary.json, as compare.py prints them. A pooled run can
						have cases that the other arms did not run. A rate Δ is the difference of the two rates:
						80% to 67% is −13%.
					</N8nText>
					<ArmMetricsTable :arm-names="armNames" :rows="rows" />
				</div>
			</N8nCollapsiblePanel>
		</div>
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
	gap: var(--spacing--xs);
}

.dot {
	display: inline-block;
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	margin-right: var(--spacing--4xs);
	border-radius: var(--radius--full);
}

/* Arm names are folder names: keep their case in table headers. */
.name {
	text-transform: none;
}

.case {
	display: flex;
	flex-direction: column;
}

.clickable {
	cursor: pointer;
}

.arm {
	display: inline-flex;
	align-items: center;
}

/* Tables take the width of their content, not of the column. */
.value {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-variant-numeric: tabular-nums;
}
</style>
