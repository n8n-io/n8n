<script setup lang="ts">
import { N8nSegmentControl, N8nText } from '@n8n/design-system';
import { computed, ref } from 'vue';

import type { Turn } from '../../schema';
import { useToolColor } from '../colors';
import { formatMs, formatTokens } from '../format';
import { arcPath, sunburstArcs, type Arc, type SunburstMode } from '../sunburst';

const props = defineProps<{ turns: Turn[] }>();
const emit = defineEmits<{ focus: [item: string] }>();
const toolColor = useToolColor();

const mode = ref<SunburstMode>('time');
const modes: Array<{ label: string; value: SunburstMode }> = [
	{ label: 'Time', value: 'time' },
	{ label: 'Tokens', value: 'tokens' },
];
const RINGS: Array<[number, number]> = [
	[0.22, 0.48],
	[0.5, 0.74],
	[0.76, 1],
];
const NEUTRALS = ['--color--neutral-300', '--color--neutral-200'];

const arcs = computed(() => sunburstArcs(props.turns, mode.value));
const total = computed(() =>
	arcs.value.filter((arc) => arc.ring === 0).reduce((sum, arc) => sum + arc.value, 0),
);
const format = (value: number) => (mode.value === 'time' ? formatMs(value) : formatTokens(value));
const fill = (arc: Arc, index: number) => {
	if (arc.tool) return `var(${toolColor(arc.tool)})`;
	if (arc.ring === 2) return 'var(--color--blue-300)';
	return `var(${NEUTRALS[index % NEUTRALS.length]})`;
};
const path = (arc: Arc) => arcPath(RINGS[arc.ring][0], RINGS[arc.ring][1], arc.start, arc.end);
const title = (arc: Arc) => `${arc.label}: ${format(arc.value)}${arc.derived ? ' (derived)' : ''}`;
const legend = computed(() => [
	...new Set(arcs.value.flatMap((arc) => (arc.tool ? [arc.tool] : []))),
]);
</script>

<template>
	<div :class="$style.panel" data-test-id="sunburst-panel">
		<div :class="$style.controls">
			<N8nSegmentControl v-model="mode" :options="modes" size="small" />
			<N8nText size="xsmall" color="text-light">
				Inner ring: turns. Middle ring: model steps. Outer ring:
				{{
					mode === 'time'
						? 'model generation (recorded) and tool calls (derived gap until the next step, split evenly between the calls of one step)'
						: 'tool calls, each with the input and output tokens of the step that called it (split evenly), or text answer'
				}}. Total {{ format(total) }}. Select an arc to open its transcript item.
			</N8nText>
		</div>
		<N8nText v-if="arcs.length === 0" color="text-light"
			>No model steps for this iteration.</N8nText
		>
		<div v-else :class="$style.body">
			<svg
				viewBox="-1.02 -1.02 2.04 2.04"
				:class="$style.chart"
				role="img"
				aria-label="Sunburst of turns, model steps and tool calls"
			>
				<path
					v-for="(arc, i) in arcs"
					:key="arc.id"
					:d="path(arc)"
					:fill="fill(arc, i)"
					:class="$style.arc"
					@click="emit('focus', arc.focus)"
				>
					<title>{{ title(arc) }}</title>
				</path>
			</svg>
			<ul :class="$style.legend">
				<li>
					<span :class="$style.swatch" :style="{ backgroundColor: 'var(--color--blue-300)' }" />
					<N8nText size="small">{{ mode === 'time' ? 'model generation' : 'text answer' }}</N8nText>
				</li>
				<li v-for="tool in legend" :key="tool">
					<span :class="$style.swatch" :style="{ backgroundColor: `var(${toolColor(tool)})` }" />
					<N8nText size="small">{{ tool }}</N8nText>
				</li>
			</ul>
		</div>
	</div>
</template>

<style module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}

.body {
	display: flex;
	gap: var(--spacing--lg);
	align-items: flex-start;
	flex-wrap: wrap;
}

.chart {
	width: min(100%, calc(var(--spacing--5xl) * 2));
}

.arc {
	stroke: var(--background--surface);
	/* In viewBox units: the chart radius is 1. */
	stroke-width: 0.004;
	cursor: pointer;
}

@media (hover: hover) {
	.arc:hover {
		opacity: 0.8;
	}
}

.legend {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.legend li {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.swatch {
	display: inline-block;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--4xs);
}
</style>
