<script setup lang="ts">
import {
	N8nBadge,
	N8nButton,
	N8nCollapsiblePanel,
	N8nHeading,
	N8nIcon,
	N8nTableBase,
	N8nText,
} from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';

import {
	armCase,
	attemptTotals,
	caseOf,
	failedChecks,
	iterationPassed,
	summarizeFirstBuilds,
	typicalBuild,
} from '../../metrics';
import type { IterationSummary, ViewerIndex } from '../../schema';
import { armColorVar } from '../colors';
import { comparisonRows } from '../comparison';
import { countVariant, formatCost, formatSeconds } from '../format';
import type { CaseSelection, CompareTab, Selection } from '../selection';
import ArmMetricsTable from './ArmMetricsTable.vue';
import BuildCompare from './BuildCompare.vue';
import MetricBars from './MetricBars.vue';
import PageHeader from './PageHeader.vue';

const props = defineProps<{ index: ViewerIndex; selection: CaseSelection }>();
const emit = defineEmits<{ select: [selection: Selection] }>();

const BAR_METRICS = [
	'scenarios',
	'expectations',
	'median.cost',
	'median.wallSeconds',
	'median.inputTokens',
	'median.toolCalls',
];

const showMetrics = ref(false);
const promptOpen = ref(false);
const promptClamped = ref(false);
const promptBox = ref<HTMLElement>();
const compareSection = ref<HTMLElement>();
onMounted(() => {
	const box = promptBox.value;
	promptClamped.value = box !== undefined && box.scrollHeight > box.clientHeight;
});

const caseName = computed(() => props.selection.caseName);
const info = computed(() => caseOf(props.index.arms, caseName.value));
const title = computed(() => info.value?.title ?? caseName.value);
const crumbs = computed(
	(): Array<{ label: string; selection: Selection }> => [
		{ label: 'Summary', selection: { kind: 'summary' } },
		{ label: title.value, selection: { kind: 'case', caseName: caseName.value } },
	],
);
const entries = computed(() => props.index.arms.map((arm) => armCase(arm, caseName.value)));
const attemptsByArm = computed(() => entries.value.map((entry) => entry?.iterations ?? []));
const attempts = computed(() => attemptsByArm.value.flat());

const typicalOf = (candidates: IterationSummary[]) =>
	typicalBuild(candidates, { passingOnly: true }) ??
	typicalBuild(candidates, { passingOnly: false });
const typicalIds = computed(() =>
	attemptsByArm.value.flatMap((armAttempts) => typicalOf(armAttempts)?.id ?? []),
);

/**
 * Column A shows the typical attempt of the first arm, column B that of the second arm. With one
 * arm, B shows a typical attempt with the other verdict, so a pass sits next to a fail.
 */
const defaultIds = computed((): Array<string | undefined> => {
	const [first, second] = typicalIds.value;
	if (second) return [first, second];
	const left = attempts.value.find((entry) => entry.id === first);
	const others = attempts.value.filter((entry) => entry.id !== first);
	const contrast = others.filter(
		(entry) => left && iterationPassed(entry) !== iterationPassed(left),
	);
	return [first, (typicalOf(contrast) ?? typicalOf(others))?.id];
});
const compareIds = computed({
	get: () => [
		props.selection.left ?? defaultIds.value[0],
		props.selection.right ?? defaultIds.value[1],
	],
	set: ([left, right]) => emit('select', { ...props.selection, left, right }),
});
const compareTab = computed({
	get: (): CompareTab => props.selection.tab ?? 'trace',
	set: (tab) => emit('select', { ...props.selection, tab }),
});
function showInColumnA(id: string) {
	compareIds.value = [id, compareIds.value[1]];
	compareSection.value?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}
const columnOf = (id: string) =>
	compareIds.value[0] === id ? 'A' : compareIds.value[1] === id ? 'B' : null;

const armTotals = computed(() => attemptsByArm.value.map(attemptTotals));
const gradeCount = (iteration: IterationSummary) =>
	iteration.scenarios.length + iteration.expectations.length;

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
	BAR_METRICS.flatMap((id) =>
		rows.value.filter((row) => row.id === id && row.values.some((value) => value !== null)),
	),
);
</script>

<template>
	<div :class="$style.view" data-test-id="case-view">
		<PageHeader :crumbs="crumbs" :title="title">
			<template #meta>
				<N8nText size="small" color="text-light">{{ caseName }}</N8nText>
				<N8nBadge v-for="tag in info?.tags ?? []" :key="tag" variant="subtle">{{ tag }}</N8nBadge>
			</template>
			<template v-if="info?.prompt" #description>
				<div>
					<div ref="promptBox" :class="[$style.prompt, !promptOpen && $style.clamped]">
						<N8nText>{{ info.prompt }}</N8nText>
					</div>
					<N8nButton
						v-if="promptClamped"
						variant="ghost"
						size="small"
						@click="promptOpen = !promptOpen"
					>
						{{ promptOpen ? 'Show less' : 'Show the full prompt' }}
					</N8nButton>
				</div>
			</template>
			<template #verdicts>
				<span
					v-for="(totals, armIndex) in armTotals"
					:key="armIndex"
					:class="$style.line"
					:data-test-id="`case-arm-${armIndex}`"
				>
					<span :class="$style.dot" :style="{ backgroundColor: `var(${armColorVar(armIndex)})` }" />
					<N8nText size="small" bold>{{ index.arms[armIndex].name }}</N8nText>
					<N8nBadge :variant="countVariant(totals.passed, totals.attempts)">
						{{ totals.passed }}/{{ totals.attempts }}
					</N8nBadge>
					<N8nText size="small" color="text-light">
						{{ formatCost(totals.medianCost) }} · {{ formatSeconds(totals.medianTime) }}
					</N8nText>
				</span>
				<N8nText size="xsmall" color="text-light">
					attempts that passed every scenario and expectation · median cost and time
				</N8nText>
			</template>
		</PageHeader>

		<section :class="$style.section">
			<N8nHeading tag="h2" size="large">Attempts</N8nHeading>
			<N8nText size="small" color="text-light">Select a row to show it in column A.</N8nText>
			<N8nTableBase>
				<thead>
					<tr>
						<th scope="col">Attempt</th>
						<th scope="col">Passed</th>
						<th scope="col">Why it failed (judge)</th>
						<th scope="col">Time</th>
						<th scope="col">Cost</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="iteration in attempts"
						:key="iteration.id"
						:class="[$style.clickable, columnOf(iteration.id) && $style.inCompare]"
						tabindex="0"
						:data-test-id="`case-attempt-${iteration.id}`"
						@click="showInColumnA(iteration.id)"
						@keydown.enter="showInColumnA(iteration.id)"
					>
						<td :class="$style.nowrap">
							<span :class="$style.attempt">
								<N8nIcon
									v-if="iterationPassed(iteration) !== null"
									:icon="iterationPassed(iteration) ? 'check' : 'x'"
									:color="iterationPassed(iteration) ? 'success' : 'danger'"
									size="small"
								/>
								<span
									:class="$style.dot"
									:style="{ backgroundColor: `var(${armColorVar(iteration.arm)})` }"
								/>
								<N8nText size="small">
									{{ index.arms[iteration.arm].name }} · attempt {{ iteration.index + 1 }}
								</N8nText>
								<N8nBadge v-if="columnOf(iteration.id)" variant="subtle">
									{{ columnOf(iteration.id) }}
								</N8nBadge>
							</span>
						</td>
						<td>
							<N8nBadge
								:variant="
									countVariant(
										gradeCount(iteration) - failedChecks(iteration).length,
										gradeCount(iteration),
									)
								"
							>
								{{ gradeCount(iteration) - failedChecks(iteration).length }}/{{
									gradeCount(iteration)
								}}
							</N8nBadge>
						</td>
						<td :class="$style.wrap">
							<N8nText v-if="iteration.buildError" tag="div" size="small" color="danger">
								{{ iteration.buildError }}
							</N8nText>
							<div v-for="(check, i) in failedChecks(iteration)" :key="i" :class="$style.clamped">
								<N8nText size="small" bold>{{ check.label }}</N8nText>
								<N8nText v-if="check.reason" size="small" color="text-light">
									— {{ check.reason }}
								</N8nText>
							</div>
						</td>
						<td :class="$style.nowrap">
							<N8nText size="small">{{ formatSeconds(iteration.metrics?.wallSeconds) }}</N8nText>
						</td>
						<td :class="$style.nowrap">
							<N8nText size="small">{{ formatCost(iteration.metrics?.cost) }}</N8nText>
						</td>
					</tr>
				</tbody>
			</N8nTableBase>
		</section>

		<section ref="compareSection" :class="$style.section" data-test-id="case-compare">
			<N8nHeading tag="h2" size="large">Compare</N8nHeading>
			<BuildCompare
				v-model:ids="compareIds"
				v-model:tab="compareTab"
				:index="index"
				:attempts="attempts"
				:typical-ids="typicalIds"
			/>
		</section>

		<div>
			<N8nCollapsiblePanel v-model="showMetrics" title="Arm metrics">
				<div :class="$style.section">
					<MetricBars :arm-names="armNames" :rows="barRows" />
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
	scroll-margin-top: var(--spacing--md);
}

.line,
.attempt {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.prompt {
	white-space: pre-wrap;
}

.clamped {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.wrap {
	white-space: normal;
}

.nowrap {
	white-space: nowrap;
}

.clickable {
	cursor: pointer;
}

.inCompare > td {
	background-color: var(--background--active);
}

.dot {
	display: inline-block;
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
}
</style>
