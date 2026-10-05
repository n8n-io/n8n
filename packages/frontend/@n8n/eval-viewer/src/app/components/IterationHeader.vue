<script setup lang="ts">
import { N8nCallout, N8nHeading, N8nText } from '@n8n/design-system';
import { computed } from 'vue';

import type { IterationSummary } from '../../schema';
import { armColorVar } from '../colors';
import { formatCost, formatNumber, formatSeconds, formatTokens } from '../format';

const props = defineProps<{ iteration: IterationSummary; armName: string }>();

const stats = computed(() => {
	const metrics = props.iteration.metrics;
	const scenarios = props.iteration.scenarios;
	const expectations = props.iteration.expectations;
	const firstBuild = props.iteration.firstBuild;
	return [
		{
			label: 'scenarios',
			value: `${scenarios.filter((run) => run.passed).length}/${scenarios.length}`,
		},
		{
			label: 'expectations',
			value: expectations.length
				? `${expectations.filter((entry) => entry.pass).length}/${expectations.length}`
				: '–',
		},
		{
			label: 'built',
			value: props.iteration.built === null ? '–' : props.iteration.built ? 'yes' : 'no',
		},
		{ label: 'time (wall)', value: formatSeconds(metrics?.wallSeconds) },
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
		{ label: 'cost', value: formatCost(metrics?.cost) },
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
	<header :class="$style.header">
		<div :class="$style.title">
			<span
				:class="$style.dot"
				:style="{ backgroundColor: `var(${armColorVar(iteration.arm)})` }"
			/>
			<N8nText size="small" color="text-light">
				{{ armName }} · {{ iteration.sub }} · thread {{ iteration.thread ?? '–' }}
			</N8nText>
		</div>
		<N8nHeading tag="h1" size="xlarge">
			{{ iteration.caseName }} · iteration {{ iteration.index + 1 }}
		</N8nHeading>
		<N8nCallout v-if="iteration.buildError" theme="danger">{{ iteration.buildError }}</N8nCallout>
		<dl :class="$style.stats" data-test-id="iteration-metrics">
			<div v-for="stat in stats" :key="stat.label" :class="$style.stat">
				<dt>
					<N8nText size="xsmall" color="text-light">{{ stat.label }}</N8nText>
				</dt>
				<dd>
					<N8nText size="medium" bold>{{ stat.value }}</N8nText>
				</dd>
			</div>
		</dl>
		<N8nText v-if="!iteration.metrics" size="xsmall" color="text-light">
			No summary.json entry for this thread, so no per-build metrics.
		</N8nText>
	</header>
</template>

<style module>
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.dot {
	display: inline-block;
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
}

.stats {
	margin: 0;
	display: grid;
	grid-template-columns: repeat(
		auto-fill,
		minmax(calc(var(--spacing--4xl) + var(--spacing--xl)), 1fr)
	);
	gap: var(--spacing--2xs);
}

.stat {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--md);
}

.stat dd {
	margin: var(--spacing--5xs) 0 0;
	font-variant-numeric: tabular-nums;
}
</style>
