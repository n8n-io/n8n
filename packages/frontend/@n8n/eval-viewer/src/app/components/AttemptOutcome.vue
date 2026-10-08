<script setup lang="ts">
import { N8nCollapsiblePanel, N8nIcon, N8nText } from '@n8n/design-system';
import { computed, ref } from 'vue';

import type { IterationSummary } from '../../schema';
import { formatCost, formatNumber, formatSeconds, formatTokens } from '../format';
import ScenarioVerdict from './ScenarioVerdict.vue';

/** The grades of one attempt: scenario runs, build expectations, and its metrics on demand. */
const props = defineProps<{ iteration: IterationSummary }>();

const showMetrics = ref(false);

const stats = computed((): Array<{ label: string; value: string }> => {
	const metrics = props.iteration.metrics;
	const firstBuild = props.iteration.firstBuild;
	return [
		{ label: 'time (wall)', value: formatSeconds(metrics?.wallSeconds) },
		{ label: 'cost', value: formatCost(metrics?.cost) },
		{ label: 'harness build time', value: formatSeconds(metrics?.harnessBuildSeconds) },
		{ label: 'model steps', value: formatNumber(metrics?.turns) },
		{
			label: 'tool calls (failed)',
			value: `${formatNumber(metrics?.toolCalls)} (${formatNumber(metrics?.toolFailed)})`,
		},
		{
			label: 'build calls (failed)',
			value: `${formatNumber(metrics?.buildCalls)} (${formatNumber(metrics?.buildFailed)})`,
		},
		{ label: 'tsc errors', value: formatNumber(metrics?.tscErrors) },
		{ label: 'input tokens', value: formatTokens(metrics?.inputTokens) },
		{
			label: 'cache read / write',
			value: `${formatTokens(metrics?.cacheReadTokens)} / ${formatTokens(metrics?.cacheWriteTokens)}`,
		},
		{ label: 'output tokens', value: formatTokens(metrics?.outputTokens) },
		{
			label: 'first build',
			value: firstBuild.oneShot
				? 'one-shot'
				: firstBuild.callsToFirstSave === null
					? 'never saved'
					: `saved on call ${firstBuild.callsToFirstSave}, ${firstBuild.rebuilds} rebuilds`,
		},
	];
});
</script>

<template>
	<div :class="$style.list" data-test-id="outcome-panel">
		<N8nText bold>Scenarios</N8nText>
		<N8nText v-if="iteration.scenarios.length === 0" size="small" color="text-light">
			This case has no scenarios, only build expectations.
		</N8nText>
		<ScenarioVerdict
			v-for="(run, scenarioIndex) in iteration.scenarios"
			:key="scenarioIndex"
			:run="run"
		/>
		<template v-if="iteration.expectations.length > 0">
			<N8nText bold>Build expectations</N8nText>
			<div v-for="(entry, i) in iteration.expectations" :key="i" :class="$style.expectation">
				<N8nIcon
					:icon="entry.pass ? 'check' : 'x'"
					:color="entry.pass ? 'success' : 'danger'"
					size="small"
				/>
				<div>
					<N8nText tag="p" size="small">{{ entry.expectation }}</N8nText>
					<N8nText v-if="entry.reason" tag="p" size="xsmall" color="text-light">{{
						entry.reason
					}}</N8nText>
				</div>
			</div>
		</template>
		<N8nCollapsiblePanel v-model="showMetrics" title="Attempt metrics">
			<dl :class="$style.stats" data-test-id="attempt-metrics">
				<div v-for="stat in stats" :key="stat.label" :class="$style.stat">
					<dt>
						<N8nText size="xsmall" color="text-light">{{ stat.label }}</N8nText>
					</dt>
					<dd>
						<N8nText size="small" bold>{{ stat.value }}</N8nText>
					</dd>
				</div>
			</dl>
			<N8nText v-if="!iteration.metrics" size="xsmall" color="text-light">
				No summary.json entry for this thread, so no per-build metrics.
			</N8nText>
		</N8nCollapsiblePanel>
	</div>
</template>

<style module>
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.expectation {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: flex-start;
}

.expectation p {
	margin: 0;
}

.stats {
	margin: 0;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(var(--spacing--4xl), 1fr));
	gap: var(--spacing--2xs);
}

.stat dd {
	margin: 0;
	font-variant-numeric: tabular-nums;
}
</style>
