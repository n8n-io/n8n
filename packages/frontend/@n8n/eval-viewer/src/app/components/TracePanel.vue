<script setup lang="ts">
import {
	N8nIcon,
	N8nSegmentControl,
	N8nText,
	N8nTooltip,
	type SegmentOption,
} from '@n8n/design-system';
import { computed, ref } from 'vue';

import type { TranscriptItem, Turn } from '../../schema';
import { useToolColor } from '../colors';
import { formatMs, formatNumber, formatTokens } from '../format';
import { skillFileOf, skillsOf, skillTargetOf } from '../skills';
import { buildTrace, percentOf, ticks, type Span } from '../trace';
import SkillButton from './SkillButton.vue';
import ValueBlock from './ValueBlock.vue';

type ToolItem = Extract<TranscriptItem, { kind: 'tool' }>;

/** `durationMs` sets a shared time scale, so traces side by side compare by length. */
const props = defineProps<{ turns: Turn[]; durationMs?: number }>();
const toolColor = useToolColor();

const trace = computed(() => buildTrace(props.turns));
const skills = computed(() => skillsOf(props.turns));
const scale = computed(() => ({
	start: trace.value.start,
	end: trace.value.start + (props.durationMs ?? trace.value.end - trace.value.start),
}));
const axis = computed(() => ticks(scale.value.end - scale.value.start));

/** Index of the parent span of each span, or -1. Spans come in tree order with a depth. */
const parents = computed(() =>
	trace.value.spans.map((span, index, spans) => {
		for (let at = index - 1; at >= 0; at--) if (spans[at].depth < span.depth) return at;
		return -1;
	}),
);

const collapsedIds = ref<string[]>([]);
const openIds = ref<string[]>([]);
const toggleIn = (ids: string[], id: string) =>
	ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id];

const rows = computed(() => {
	const toolItems = props.turns.flatMap((turn) =>
		turn.items.flatMap((item) => (item.kind === 'tool' ? [item] : [])),
	);
	const spans = trace.value.spans;
	const isHidden = (index: number): boolean => {
		const parent = parents.value[index];
		return parent >= 0 && (collapsedIds.value.includes(spans[parent].id) || isHidden(parent));
	};
	return spans.flatMap((span, index) =>
		isHidden(index)
			? []
			: [
					{
						span,
						item: toolItems.find((item) => item.id === span.callId),
						children: parents.value.filter((parent) => parent === index).length,
					},
				],
	);
});

const hasDetail = (span: Span, item: ToolItem | undefined) =>
	item !== undefined || span.kind === 'thinking';

function toggle(span: Span, children: number, item: ToolItem | undefined) {
	if (children > 0) collapsedIds.value = toggleIn(collapsedIds.value, span.id);
	else if (hasDetail(span, item)) openIds.value = toggleIn(openIds.value, span.id);
}

const KIND_COLORS: Record<Span['kind'], string> = {
	iteration: '--color--neutral-400',
	turn: '--color--neutral-300',
	model: '--color--blue-300',
	thinking: '--color--purple-300',
	tool: '--color--neutral-500',
};
const colorOf = (span: Span) => `var(${span.tool ? toolColor(span.tool) : KIND_COLORS[span.kind]})`;

function argOf(item: ToolItem | undefined, key: string): string | null {
	const args: unknown = item?.args;
	if (typeof args !== 'object' || args === null) return null;
	const value: unknown = Reflect.get(args, key);
	return typeof value === 'string' ? value : null;
}

/** Secondary text after the label: the finish reason, a tool action, a skill file, or the start of a thought. */
function noteOf(span: Span, item: ToolItem | undefined): string | null {
	if (span.kind === 'thinking') return span.content;
	const file = item ? skillFileOf(item) : null;
	return span.note ?? (file ? (file.filePath ?? file.skillId) : argOf(item, 'action'));
}

type IoTab = 'input' | 'output';
const ioTabs = ref<Record<string, IoTab>>({});
const setIoTab = (span: Span, tab: IoTab) => {
	ioTabs.value = { ...ioTabs.value, [span.id]: tab };
};

const sizeOf = (value: unknown) => `${formatNumber(JSON.stringify(value ?? null).length)} chars`;
const ioOptions = (item: ToolItem): Array<SegmentOption<IoTab>> => [
	{ value: 'input', label: `Input · ${sizeOf(item.args)}` },
	{
		value: 'output',
		label: item.hasResult ? `Output · ${sizeOf(item.result)}` : 'Output · not recorded',
	},
];

const duration = (span: Span) => (span.end === null ? null : formatMs(span.end - span.start));

function detail(span: Span): string {
	const time = duration(span) ?? 'time not recorded';
	const usage = span.usage
		? ` · in ${formatTokens(span.usage.input)} (cache read ${formatTokens(span.usage.cacheRead)}) · out ${formatTokens(span.usage.output)}`
		: '';
	return `${span.derived && span.end !== null ? `${time} (derived)` : time}${usage}`;
}

const title = (span: Span) => (span.note ? `${span.label} · ${span.note}` : span.label);
const indent = (span: Span) => `calc(var(--spacing--xs) * ${span.depth})`;

const x = (time: number) => `${percentOf(time, scale.value)}%`;
const widthPercent = (span: Span) =>
	Math.max(
		percentOf(span.end ?? span.start, scale.value) - percentOf(span.start, scale.value),
		0.2,
	);

/** Duration text inside wide bars, else after the bar, or before it when the bar ends near the edge. */
function durationLabel(span: Span) {
	const start = percentOf(span.start, scale.value);
	const width = widthPercent(span);
	if (width > 18) return { x: `${start}%`, dx: 4, anchor: 'start', inside: true };
	if (start + width < 85) return { x: `${start + width}%`, dx: 4, anchor: 'start', inside: false };
	return { x: `${start}%`, dx: -4, anchor: 'end', inside: false };
}
</script>

<template>
	<div :class="$style.panel" data-test-id="trace-panel">
		<N8nText v-if="trace.spans.length === 0" color="text-light">
			No model steps for this attempt: the run-debug page has no section for its thread.
		</N8nText>
		<template v-else>
			<div :class="[$style.row, $style.header]">
				<span />
				<svg :class="$style.axis" role="presentation">
					<text v-for="tick in axis" :key="tick" :x="x(trace.start + tick)" y="60%">
						{{ formatMs(tick) }}
					</text>
				</svg>
			</div>
			<template v-for="{ span, item, children } in rows" :key="span.id">
				<N8nTooltip
					:content="`${title(span)} · ${detail(span)}`"
					placement="top-start"
					:show-after="300"
					as-child
				>
					<button
						type="button"
						:class="[$style.row, $style.span, { [$style.open]: openIds.includes(span.id) }]"
						:aria-disabled="children > 0 || hasDetail(span, item) ? undefined : 'true'"
						:aria-expanded="
							children > 0
								? !collapsedIds.includes(span.id)
								: hasDetail(span, item)
									? openIds.includes(span.id)
									: undefined
						"
						:data-test-id="`trace-${span.kind}`"
						@click="toggle(span, children, item)"
					>
						<span
							:class="$style.label"
							:style="{ paddingInlineStart: indent(span), borderInlineStartColor: colorOf(span) }"
						>
							<N8nIcon
								v-if="children > 0 || hasDetail(span, item)"
								:icon="
									(children > 0 ? !collapsedIds.includes(span.id) : openIds.includes(span.id))
										? 'chevron-down'
										: 'chevron-right'
								"
								size="xsmall"
								:class="$style.chevron"
							/>
							<span v-else :class="$style.chevron" />
							<code v-if="span.kind === 'tool'" :class="$style.tool">{{ span.label }}</code>
							<N8nText
								v-else
								size="small"
								:bold="span.kind === 'iteration' || span.kind === 'turn'"
								:color="span.kind === 'thinking' ? 'text-light' : undefined"
								:class="$style.name"
							>
								{{ span.label }}
							</N8nText>
							<N8nText
								v-if="noteOf(span, item)"
								size="xsmall"
								color="text-light"
								:class="$style.note"
							>
								{{ noteOf(span, item) }}
							</N8nText>
							<N8nText v-if="children > 0" size="xsmall" color="text-light">
								({{ children }})
							</N8nText>
							<N8nIcon
								v-if="item?.hasResult && item.failed"
								icon="x"
								color="danger"
								size="xsmall"
								aria-label="failed"
							/>
						</span>
						<svg :class="$style.bar" role="img" :aria-label="`${title(span)}: ${detail(span)}`">
							<line
								v-for="tick in axis"
								:key="tick"
								:x1="x(trace.start + tick)"
								:x2="x(trace.start + tick)"
								y1="0"
								y2="100%"
							/>
							<rect
								v-if="span.kind !== 'thinking'"
								:x="x(span.start)"
								y="20%"
								:width="`${widthPercent(span)}%`"
								height="60%"
								rx="2"
								:fill="colorOf(span)"
								:fill-opacity="span.derived ? 0.55 : 1"
								:stroke="span.derived ? colorOf(span) : 'none'"
								:stroke-dasharray="span.derived ? '3 2' : undefined"
							></rect>
							<text
								v-if="span.kind !== 'thinking' && duration(span)"
								:x="durationLabel(span).x"
								:dx="durationLabel(span).dx"
								y="50%"
								:text-anchor="durationLabel(span).anchor"
								:class="{ [$style.inside]: durationLabel(span).inside }"
							>
								{{ duration(span) }}
							</text>
						</svg>
					</button>
				</N8nTooltip>
				<div
					v-if="span.kind === 'thinking' && openIds.includes(span.id)"
					:class="$style.detail"
					:style="{ marginInlineStart: indent(span), borderInlineStartColor: colorOf(span) }"
					data-test-id="trace-thinking-detail"
				>
					<N8nText size="xsmall" bold color="text-light">THINKING (summary)</N8nText>
					<N8nText tag="p" size="small" :class="$style.prewrap">{{ span.content }}</N8nText>
				</div>
				<div
					v-else-if="item && openIds.includes(span.id)"
					:class="$style.detail"
					:style="{ marginInlineStart: indent(span), borderInlineStartColor: colorOf(span) }"
					:data-test-id="`tool-call-${item.tool}`"
				>
					<SkillButton :target="skillTargetOf(skills, item)" />
					<N8nSegmentControl
						:model-value="ioTabs[span.id] ?? 'input'"
						:options="ioOptions(item)"
						:class="$style.ioTabs"
						aria-label="Tool call input or output"
						@update:model-value="setIoTab(span, $event)"
					/>
					<ValueBlock v-if="(ioTabs[span.id] ?? 'input') === 'input'" :value="item.args" />
					<ValueBlock v-else :value="item.hasResult ? item.result : undefined" />
				</div>
			</template>
		</template>
	</div>
</template>

<style module>
.panel {
	display: flex;
	flex-direction: column;
}

.row {
	display: grid;
	/* Wide enough for "model step 10 · tool_use" at the deepest indent; tokens are in the tooltip. */
	grid-template-columns: minmax(calc(var(--spacing--4xl) + var(--spacing--2xl)), 38%) 1fr;
	align-items: stretch;
	gap: var(--spacing--2xs);
}

.header {
	border-bottom: var(--border);
}

.span {
	width: 100%;
	padding: 0;
	border: none;
	background: transparent;
	color: inherit;
	text-align: left;
	cursor: pointer;
}

.span[aria-disabled] {
	cursor: default;
}

.open {
	background-color: var(--background--hover);
}

@media (hover: hover) {
	.span:hover {
		background-color: var(--background--hover);
	}
}

.label {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	border-inline-start: var(--spacing--5xs) solid transparent;
}

.chevron {
	flex-shrink: 0;
	width: var(--spacing--xs);
	color: var(--text-color--subtle);
}

.name,
.tool,
.note {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

/* The note gives up its space before the label truncates. */
.name,
.tool {
	flex: 0 1 auto;
}

.note {
	flex: 1 1 0;
}

.tool {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
}

.bar,
.axis {
	width: 100%;
	height: calc(var(--spacing--md) + var(--spacing--4xs));
	overflow: visible;
}

.bar line {
	stroke: var(--border-color--subtle);
}

.bar text,
.axis text {
	fill: var(--text-color--subtle);
	font-size: var(--font-size--3xs);
	font-variant-numeric: tabular-nums;
	dominant-baseline: central;
}

.axis text {
	text-anchor: middle;
}

/* Bar colours are light in both themes, so text on a bar stays dark. */
.bar text.inside {
	fill: var(--color--neutral-950);
}

.ioTabs {
	align-self: flex-start;
}

.prewrap {
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
}

.detail {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-block: var(--spacing--4xs) var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-inline-start: var(--spacing--5xs) solid;
	border-radius: 0 var(--radius--md) var(--radius--md) 0;
	background-color: var(--background--surface);
}
</style>
