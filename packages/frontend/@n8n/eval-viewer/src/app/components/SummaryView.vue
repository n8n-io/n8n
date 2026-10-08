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
import { directionColor, formatCost, formatNumber, formatSeconds, formatSigned } from '../format';
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

/** Pass rate, cost and time of `value` against `base`, each beyond its noise floor. */
function trends(base: AttemptTotals | null, value: AttemptTotals | null) {
	if (!base || !value) return { pass: NO_TREND, cost: NO_TREND, time: NO_TREND };
	const rate = (totals: AttemptTotals) => ratio(totals.passed, totals.attempts);
	const relative = (baseValue: number | null) => Math.abs(baseValue ?? 0) * RELATIVE_NOISE;
	return {
		pass: trend(rate(base), rate(value), true, rateNoise(base.attempts, value.attempts)),
		cost: trend(base.medianCost, value.medianCost, false, relative(base.medianCost)),
		time: trend(base.medianTime, value.medianTime, false, relative(base.medianTime)),
	};
}

const sharedCases = computed(() => sharedCaseNames(props.index.arms));
const unsharedCases = computed(() =>
	caseNamesOf(props.index.arms).filter((caseName) => !sharedCases.value.includes(caseName)),
);

const scopeNote = computed(() =>
	[
		`Over the ${sharedCases.value.length} cases that every arm ran.`,
		unsharedCases.value.length > 0 ? `Left out: ${unsharedCases.value.join(', ')}.` : null,
		'An attempt passes when every scenario and expectation passes.',
	]
		.filter(Boolean)
		.join(' '),
);

/** Each arm over the cases every arm ran, against the first arm. */
const headline = computed(() => {
	const totals = props.index.arms.map((arm) =>
		attemptTotals(
			sharedCases.value.flatMap((caseName) => armCase(arm, caseName)?.iterations ?? []),
		),
	);
	return props.index.arms.map((arm, armIndex) => {
		const own = totals[armIndex];
		const change = armIndex === 0 ? trends(null, null) : trends(totals[0], own);
		const passRate = ratio(own.passed, own.attempts);
		const baseRate = ratio(totals[0].passed, totals[0].attempts);
		return {
			arm,
			passed: `${own.passed}/${own.attempts}`,
			cells: [
				{
					text:
						armIndex === 0
							? 'baseline'
							: passRate === null || baseRate === null
								? '–'
								: formatSigned((passRate - baseRate) * 100, (points) => `${formatNumber(points)}%`),
					trend: change.pass,
				},
				{ text: formatCost(own.medianCost), trend: change.cost },
				{ text: formatSeconds(own.medianTime), trend: change.time },
				{ text: `${own.built}/${own.attempts} built`, trend: NO_TREND },
			],
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
			<N8nHeading tag="h2" size="large">Arms</N8nHeading>
			<N8nText size="small" color="text-light">{{ scopeNote }}</N8nText>
			<N8nTableBase :class="$style.fit" data-test-id="arm-headline">
				<thead>
					<tr>
						<th scope="col">Arm</th>
						<th scope="col">Attempts passed</th>
						<th scope="col">Δ vs baseline</th>
						<th scope="col">Median cost</th>
						<th scope="col">Median time</th>
						<th scope="col">Builds</th>
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
						<td>
							<N8nText bold>{{ entry.passed }}</N8nText>
						</td>
						<td v-for="(cell, at) in entry.cells" :key="at">
							<span :class="$style.value">
								<N8nText :color="directionColor(cell.trend.direction)">{{ cell.text }}</N8nText>
								<N8nIcon
									v-if="cell.trend.arrow"
									:icon="cell.trend.arrow"
									:color="directionColor(cell.trend.direction)"
									size="small"
								/>
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
			<N8nTableBase :class="$style.fit">
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
.fit {
	width: fit-content;
	max-width: 100%;
}

.value {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-variant-numeric: tabular-nums;
}
</style>
