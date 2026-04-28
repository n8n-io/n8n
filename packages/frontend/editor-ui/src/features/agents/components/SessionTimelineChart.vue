<script lang="ts" setup>
import { computed } from 'vue';
import { truncate } from '@n8n/utils';
import { useI18n } from '@n8n/i18n';
import { N8nTooltip } from '@n8n/design-system';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import type { CSSProperties } from 'vue';
import type { IdleRange, TimelineItem } from '../session-timeline.types';
import { builtinToolLabelKey, formatDuration, itemFilterKey } from '../session-timeline.utils';
import { chartBlockStyle, pillStyle as kindPillStyle } from '../session-timeline.styles';

const props = defineProps<{
	items: TimelineItem[];
	idleRanges: IdleRange[];
	sessionStart: number;
	sessionEnd: number;
	visibleKinds: Set<string>;
	selectedIndex: number | null;
}>();

const emit = defineEmits<{ select: [index: number] }>();

const i18n = useI18n();

const INSTANT_MS = 100;

type Segment =
	| { kind: 'event'; item: TimelineItem; index: number; duration: number }
	| { kind: 'idle'; range: IdleRange };

const segments = computed<Segment[]>(() => {
	const out: Segment[] = [];
	const idles = [...props.idleRanges].sort((a, b) => a.start - b.start);
	let idleIdx = 0;
	for (let i = 0; i < props.items.length; i++) {
		const item = props.items[i];
		while (idleIdx < idles.length && idles[idleIdx].start <= item.timestamp) {
			out.push({ kind: 'idle', range: idles[idleIdx] });
			idleIdx++;
		}
		const duration = item.endTimestamp ? item.endTimestamp - item.timestamp : INSTANT_MS;
		out.push({ kind: 'event', item, index: i, duration });
	}
	while (idleIdx < idles.length) {
		out.push({ kind: 'idle', range: idles[idleIdx] });
		idleIdx++;
	}
	return out;
});

function isDimmed(item: TimelineItem): boolean {
	if (props.visibleKinds.size === 0) return false;
	return !props.visibleKinds.has(itemFilterKey(item));
}

function cellStyle(seg: Segment): Record<string, string> {
	if (seg.kind === 'idle') return { flex: '0 0 56px' };
	// flex-shrink: 1 lets cells contract when total min-widths exceed the chart width.
	return { flex: `${Math.max(seg.duration, 1)} 1 0` };
}

function eventStyle(item: TimelineItem): CSSProperties {
	const style: CSSProperties = chartBlockStyle(item.kind);
	if (isDimmed(item)) {
		style.opacity = '0.15';
		style.pointerEvents = 'none';
	}
	return style;
}

function pillStyle(item: TimelineItem): CSSProperties {
	return kindPillStyle(item.kind);
}

function popoverLabel(item: TimelineItem): string {
	switch (item.kind) {
		case 'user':
			return i18n.baseText('agentSessions.timeline.user');
		case 'agent':
			return i18n.baseText('agentSessions.timeline.agent');
		case 'tool':
			return i18n.baseText('agentSessions.timeline.tool');
		case 'workflow':
			return i18n.baseText('agentSessions.timeline.workflow');
		case 'node':
			return i18n.baseText('agentSessions.timeline.node');
		case 'working-memory':
			return i18n.baseText('agentSessions.timeline.memory');
		case 'suspension':
			return i18n.baseText('agentSessions.timeline.suspension');
		default:
			return '';
	}
}

function popoverName(item: TimelineItem): string {
	switch (item.kind) {
		case 'user':
		case 'agent':
			return truncate(item.content ?? '', 80);
		case 'tool': {
			const key = builtinToolLabelKey(item.toolName);
			return key ? i18n.baseText(key) : (item.toolName ?? '');
		}
		case 'workflow':
			return item.workflowName ?? item.toolName ?? '';
		case 'node':
			return item.nodeDisplayName ?? item.toolName ?? '';
		case 'working-memory':
			return i18n.baseText('agentSessions.timeline.memoryUpdated');
		case 'suspension':
			return i18n.baseText('agentSessions.timeline.waitingForUser');
		default:
			return '';
	}
}

/**
 * Real-event duration for the popover. Returns empty when the item has no
 * `endTimestamp` greater than `timestamp` — point events (user/agent text,
 * memory, suspension) and incomplete tool calls. The chart's `seg.duration`
 * applies a synthetic `INSTANT_MS` floor so point events get a visible block;
 * we deliberately don't use that here, otherwise every popover would read
 * "100ms".
 */
function popoverDuration(item: TimelineItem): string {
	if (!item.endTimestamp || item.endTimestamp <= item.timestamp) return '';
	return formatDuration(item.endTimestamp - item.timestamp);
}

function idleDuration(range: IdleRange): string {
	return formatDuration(range.end - range.start);
}

function popoverTime(item: TimelineItem): string {
	if (!item.timestamp) return '';
	return convertToDisplayDate(new Date(item.timestamp).toISOString()).time;
}

function onClick(index: number, item: TimelineItem): void {
	if (isDimmed(item)) return;
	emit('select', index);
}
</script>

<template>
	<div :class="$style.chart">
		<div
			v-for="(seg, segIdx) in segments"
			:key="segIdx"
			data-test-id="timeline-cell"
			:class="$style.cell"
			:style="cellStyle(seg)"
		>
			<N8nTooltip placement="top" :show-after="100" :content-class="$style.tooltipContent">
				<template v-if="seg.kind === 'idle'">
					<div data-test-id="timeline-idle" :class="$style.idle">
						<span :class="$style.idleFill">{{ i18n.baseText('agentSessions.timeline.idle') }}</span>
					</div>
				</template>
				<template v-else>
					<button
						type="button"
						data-test-id="timeline-block"
						:class="[$style.block, props.selectedIndex === seg.index && $style.selected]"
						:data-selected="props.selectedIndex === seg.index ? 'true' : undefined"
						:style="eventStyle(seg.item)"
						@click="onClick(seg.index, seg.item)"
					/>
				</template>
				<template #content>
					<div v-if="seg.kind === 'idle'" :class="$style.popoverInner">
						<span :class="[$style.popoverPill, $style.idlePill]">
							{{ i18n.baseText('agentSessions.timeline.idle') }}
						</span>
						<span :class="$style.popoverMeta">{{ idleDuration(seg.range) }}</span>
					</div>
					<div v-else :class="$style.popoverInner">
						<span :class="$style.popoverPill" :style="pillStyle(seg.item)">
							{{ popoverLabel(seg.item) }}
						</span>
						<span :class="$style.popoverName">{{ popoverName(seg.item) }}</span>
						<span v-if="popoverDuration(seg.item)" :class="$style.popoverMeta">
							{{ popoverDuration(seg.item) }}
						</span>
						<span :class="$style.popoverMeta">{{ popoverTime(seg.item) }}</span>
					</div>
				</template>
			</N8nTooltip>
		</div>
	</div>
</template>

<style module lang="scss">
.chart {
	display: flex;
	align-items: stretch;
	gap: 1px;
	height: 28px;
	width: 100%;
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
}

/*
 * Each segment lives inside a flex .cell that owns the inline flex sizing.
 * The TooltipTrigger span (a real DOM element with a measurable bounding rect
 * — required by reka-ui's positioning) fills the cell, and the block/idle
 * inside fills the span.
 */
.cell {
	display: flex;
	align-items: stretch;
	min-width: 24px;
}

.cell > span {
	display: flex;
	flex: 1 0 0;
	align-items: stretch;
	min-width: 0;
}

.idle {
	position: relative;
	flex: 1 0 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background-image: repeating-linear-gradient(
		45deg,
		var(--color--foreground--shade-1) 0 4px,
		transparent 4px 8px
	);
	border-radius: var(--radius--sm);
	cursor: default;
}

.idleFill {
	display: inline-flex;
	align-items: center;
	padding: 1px var(--spacing--3xs);
	background-color: var(--color--background);
	border-radius: var(--radius--lg);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: lowercase;
	letter-spacing: 0.02em;
}

.idlePill {
	background-color: var(--color--foreground--tint-1);
	color: var(--color--text--tint-1);
}

.block {
	position: relative;
	flex: 1 0 0;
	margin: 4px 0;
	border: none;
	border-radius: var(--radius--sm);
	padding: 0;
	cursor: pointer;
	transition: filter 0.15s;

	&:hover {
		filter: brightness(1.1);
	}
}

.selected {
	outline: 2px solid var(--color--warning);
	outline-offset: 1px;
	/* Lift above neighbouring idle stripes so the highlight outline doesn't
	   get covered by the adjacent .idle background. */
	z-index: 2;
}

/*
 * Override the design-system tooltip's fixed dark background with the page
 * background + a border so the tooltip adapts correctly to light and dark
 * mode. Also remove the 180px max-width so our single-line row layout
 * (pill · name · duration · time) doesn't wrap.
 */
.tooltipContent {
	max-width: none;
	/* foreground--tint-2 is a raised surface (also used by the chart strip
	   and top bar) that stands out from page bg in BOTH light and dark mode. */
	background: var(--color--foreground--tint-2);
	border: var(--border);
	color: var(--color--text);

	/* Match the arrow fill to the tooltip bg so the pointer doesn't show
	   as the wrong color against the panel. */
	svg {
		fill: var(--color--foreground--tint-2);
	}
}

.popoverInner {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	white-space: nowrap;
}

.popoverPill {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--lg);
}

.popoverName {
	max-width: 320px;
	overflow: hidden;
	text-overflow: ellipsis;
}

.popoverMeta {
	color: var(--color--text--tint-1);
	font-variant-numeric: tabular-nums;
}
</style>
