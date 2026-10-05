<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { computed } from 'vue';

import type { Turn } from '../../schema';
import { useToolColor } from '../colors';
import { formatClock, formatMs } from '../format';
import { buildTrace, percentOf, ticks, type Span } from '../trace';

const props = defineProps<{ turns: Turn[] }>();
const emit = defineEmits<{ focus: [item: string] }>();
const toolColor = useToolColor();

const MODEL_LANE = 'model generation';
const trace = computed(() => buildTrace(props.turns));
const axis = computed(() => ticks(trace.value.end - trace.value.start, 12));

/** One lane for model generation, then one lane per tool in order of first use. */
const lanes = computed(() => {
	const bars = trace.value.spans.filter(
		(span) => (span.kind === 'model' || span.kind === 'tool') && span.end !== null,
	);
	const names = [MODEL_LANE, ...new Set(bars.flatMap((span) => (span.tool ? [span.tool] : [])))];
	return names.map((name) => ({
		name,
		bars: bars.filter((span) => (name === MODEL_LANE ? span.kind === 'model' : span.tool === name)),
	}));
});
const turnStarts = computed(() => trace.value.spans.filter((span) => span.kind === 'turn'));

const x = (time: number) => `${percentOf(time, trace.value)}%`;
const width = (span: Span) =>
	`${Math.max(percentOf(span.end ?? span.start, trace.value) - percentOf(span.start, trace.value), 0.15)}%`;
const color = (span: Span) => `var(${span.tool ? toolColor(span.tool) : '--color--blue-300'})`;
const title = (span: Span) =>
	`${span.label} · ${formatClock(span.start)} · ${formatMs((span.end ?? span.start) - span.start)}${span.derived ? ' (derived)' : ''}`;
</script>

<template>
	<div :class="$style.panel" data-test-id="timeline-panel">
		<N8nText v-if="lanes.length <= 1 && lanes[0]?.bars.length === 0" color="text-light">
			No model steps for this iteration.
		</N8nText>
		<template v-else>
			<N8nText size="xsmall" color="text-light">
				Steps on the wall clock from {{ formatClock(trace.start) }}. Tool lanes show the derived gap
				after the model step that called the tool. Dashed lines mark the start of a turn.
			</N8nText>
			<div :class="$style.lane">
				<span />
				<svg :class="$style.axis" role="presentation">
					<g v-for="tick in axis" :key="tick">
						<line :x1="x(trace.start + tick)" :x2="x(trace.start + tick)" y1="0" y2="100%" />
						<text :x="x(trace.start + tick)" y="70%">{{ formatMs(tick) }}</text>
					</g>
				</svg>
			</div>
			<div v-for="lane in lanes" :key="lane.name" :class="$style.lane" data-test-id="timeline-lane">
				<N8nText size="small" :class="$style.name">{{ lane.name }}</N8nText>
				<svg
					:class="$style.track"
					role="img"
					:aria-label="`${lane.name}: ${lane.bars.length} spans`"
				>
					<line
						v-for="turn in turnStarts"
						:key="turn.id"
						:x1="x(turn.start)"
						:x2="x(turn.start)"
						y1="0"
						y2="100%"
						:class="$style.turnLine"
					/>
					<rect
						v-for="span in lane.bars"
						:key="span.id"
						:x="x(span.start)"
						y="15%"
						:width="width(span)"
						height="70%"
						:fill="color(span)"
						:fill-opacity="span.derived ? 0.7 : 1"
						:class="$style.bar"
						@click="emit('focus', span.focus)"
					>
						<title>{{ title(span) }}</title>
					</rect>
				</svg>
			</div>
		</template>
	</div>
</template>

<style module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.lane {
	display: grid;
	grid-template-columns: minmax(var(--spacing--4xl), 16%) 1fr;
	align-items: center;
	gap: var(--spacing--2xs);
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.track,
.axis {
	width: 100%;
	height: var(--spacing--lg);
	overflow: visible;
}

.track {
	background-color: var(--background--subtle);
	border-radius: var(--radius--sm);
}

.bar {
	cursor: pointer;
}

.turnLine {
	stroke: var(--border-color--strong);
	stroke-dasharray: 4 3;
}

.axis line {
	stroke: var(--border-color--subtle);
}

.axis text {
	fill: var(--text-color--subtle);
	font-size: var(--font-size--3xs);
	text-anchor: middle;
}
</style>
