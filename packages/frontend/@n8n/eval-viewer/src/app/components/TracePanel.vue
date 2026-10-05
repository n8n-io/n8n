<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { computed } from 'vue';

import type { Turn } from '../../schema';
import { useToolColor } from '../colors';
import { formatMs, formatTokens } from '../format';
import { buildTrace, percentOf, ticks, type Span } from '../trace';

const props = defineProps<{ turns: Turn[] }>();
const emit = defineEmits<{ focus: [item: string] }>();
const toolColor = useToolColor();

const trace = computed(() => buildTrace(props.turns));
const axis = computed(() => ticks(trace.value.end - trace.value.start));

const KIND_COLORS: Record<Span['kind'], string> = {
	iteration: '--color--neutral-400',
	turn: '--color--neutral-300',
	model: '--color--blue-300',
	tool: '--color--neutral-500',
};
const colorOf = (span: Span) => `var(${span.tool ? toolColor(span.tool) : KIND_COLORS[span.kind]})`;

function detail(span: Span): string {
	const duration = span.end === null ? 'time not recorded' : formatMs(span.end - span.start);
	const usage = span.usage
		? ` · in ${formatTokens(span.usage.input)} (cache read ${formatTokens(span.usage.cacheRead)}) · out ${formatTokens(span.usage.output)}`
		: '';
	return `${span.derived && span.end !== null ? `${duration} (derived)` : duration}${usage}`;
}

const x = (time: number) => `${percentOf(time, trace.value)}%`;
const width = (span: Span) =>
	`${Math.max(percentOf(span.end ?? span.start, trace.value) - percentOf(span.start, trace.value), 0.2)}%`;
</script>

<template>
	<div :class="$style.panel" data-test-id="trace-panel">
		<N8nText v-if="trace.spans.length === 0" color="text-light">
			No model steps for this iteration: the run-debug page has no section for its thread.
		</N8nText>
		<template v-else>
			<N8nText size="xsmall" color="text-light">
				Model step spans use the recorded timestamp and step time. Tool call spans are derived: the
				gap until the next model step (tool run plus harness overhead); calls of one step share it.
				Select a span to open its transcript item.
			</N8nText>
			<div :class="$style.row">
				<span />
				<span />
				<svg :class="$style.axis" role="presentation">
					<g v-for="tick in axis" :key="tick">
						<line :x1="x(trace.start + tick)" :x2="x(trace.start + tick)" y1="0" y2="100%" />
						<text :x="x(trace.start + tick)" y="70%">{{ formatMs(tick) }}</text>
					</g>
				</svg>
			</div>
			<button
				v-for="span in trace.spans"
				:key="span.id"
				type="button"
				:class="[$style.row, $style.span]"
				:data-test-id="`trace-${span.kind}`"
				@click="emit('focus', span.focus)"
			>
				<N8nText
					size="small"
					:bold="span.kind !== 'tool' && span.kind !== 'model'"
					:class="$style.label"
					:style="{ paddingInlineStart: `calc(var(--spacing--sm) * ${span.depth})` }"
				>
					{{ span.label }}
				</N8nText>
				<N8nText size="xsmall" color="text-light" :class="$style.label">{{ detail(span) }}</N8nText>
				<svg :class="$style.bar" role="img" :aria-label="`${span.label}: ${detail(span)}`">
					<rect
						:x="x(span.start)"
						y="20%"
						:width="width(span)"
						height="60%"
						rx="2"
						:fill="colorOf(span)"
						:fill-opacity="span.derived ? 0.55 : 1"
						:stroke="span.derived ? colorOf(span) : 'none'"
						:stroke-dasharray="span.derived ? '3 2' : undefined"
					>
						<title>{{ span.label }}: {{ detail(span) }}</title>
					</rect>
				</svg>
			</button>
		</template>
	</div>
</template>

<style module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.row {
	display: grid;
	grid-template-columns: minmax(var(--spacing--4xl), 18%) minmax(var(--spacing--4xl), 22%) 1fr;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--md);
}

.span {
	width: 100%;
	padding: 0 var(--spacing--4xs);
	border: none;
	border-radius: var(--radius--sm);
	background: transparent;
	color: inherit;
	text-align: left;
	cursor: pointer;
}

@media (hover: hover) {
	.span:hover {
		background-color: var(--background--hover);
	}
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.bar,
.axis {
	width: 100%;
	height: var(--spacing--md);
	overflow: visible;
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
