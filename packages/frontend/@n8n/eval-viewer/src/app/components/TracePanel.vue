<script setup lang="ts">
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { computed, ref } from 'vue';

import type { Turn } from '../../schema';
import { useToolColor } from '../colors';
import { formatMs, formatTokens } from '../format';
import { buildTrace, percentOf, ticks, type Span } from '../trace';
import ToolCallCard from './ToolCallCard.vue';

/** `durationMs` sets a shared time scale, so traces side by side compare by length. */
const props = defineProps<{ turns: Turn[]; durationMs?: number }>();
const toolColor = useToolColor();

const trace = computed(() => buildTrace(props.turns));
const scale = computed(() => ({
	start: trace.value.start,
	end: trace.value.start + (props.durationMs ?? trace.value.end - trace.value.start),
}));
const axis = computed(() => ticks(scale.value.end - scale.value.start));
const rows = computed(() => {
	const toolItems = props.turns.flatMap((turn) =>
		turn.items.flatMap((item) => (item.kind === 'tool' ? [item] : [])),
	);
	return trace.value.spans.map((span) => ({
		span,
		item: toolItems.find((item) => item.id === span.callId),
	}));
});

const openIds = ref<string[]>([]);
const toggle = (span: Span) => {
	openIds.value = openIds.value.includes(span.id)
		? openIds.value.filter((id) => id !== span.id)
		: [...openIds.value, span.id];
};

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

const x = (time: number) => `${percentOf(time, scale.value)}%`;
const width = (span: Span) =>
	`${Math.max(percentOf(span.end ?? span.start, scale.value) - percentOf(span.start, scale.value), 0.2)}%`;
</script>

<template>
	<div :class="$style.panel" data-test-id="trace-panel">
		<N8nText v-if="trace.spans.length === 0" color="text-light">
			No model steps for this attempt: the run-debug page has no section for its thread.
		</N8nText>
		<template v-else>
			<div :class="$style.row">
				<span />
				<svg :class="$style.axis" role="presentation">
					<g v-for="tick in axis" :key="tick">
						<line :x1="x(trace.start + tick)" :x2="x(trace.start + tick)" y1="0" y2="100%" />
						<text :x="x(trace.start + tick)" y="70%">{{ formatMs(tick) }}</text>
					</g>
				</svg>
			</div>
			<template v-for="{ span, item } in rows" :key="span.id">
				<N8nTooltip
					:content="`${span.label} · ${detail(span)}`"
					placement="top-start"
					:show-after="150"
					as-child
				>
					<button
						type="button"
						:class="[$style.row, $style.span]"
						:aria-disabled="item ? undefined : 'true'"
						:aria-expanded="item ? openIds.includes(span.id) : undefined"
						:data-test-id="`trace-${span.kind}`"
						@click="item && toggle(span)"
					>
						<N8nText
							size="small"
							:bold="span.kind !== 'tool' && span.kind !== 'model'"
							:class="$style.label"
							:style="{ paddingInlineStart: `calc(var(--spacing--sm) * ${span.depth})` }"
						>
							{{ span.label }}
						</N8nText>
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
							></rect>
						</svg>
					</button>
				</N8nTooltip>
				<ToolCallCard
					v-if="item && openIds.includes(span.id)"
					:item="item"
					open
					:class="$style.card"
				/>
			</template>
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
	/* Wide enough for "model step 10 · tool_use" at the deepest indent; the time and tokens are in the tooltip. */
	grid-template-columns: minmax(calc(var(--spacing--4xl) + var(--spacing--2xl)), 38%) 1fr;
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

.span[aria-disabled] {
	cursor: default;
}

@media (hover: hover) {
	.span:hover {
		background-color: var(--background--hover);
	}
}

.card {
	margin: var(--spacing--4xs) 0 var(--spacing--2xs) var(--spacing--lg);
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
