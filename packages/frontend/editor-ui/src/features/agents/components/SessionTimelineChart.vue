<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { truncate } from '@n8n/utils';
import { useI18n } from '@n8n/i18n';
import { HoverCardContent, HoverCardPortal, HoverCardRoot, HoverCardTrigger } from 'reka-ui';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import type { CSSProperties } from 'vue';
import type { IdleRange, TimelineItem } from '../session-timeline.types';
import { builtinToolLabelKey, formatDuration, itemFilterKey } from '../session-timeline.utils';
import { chartBlockStyle } from '../session-timeline.styles';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';
import SessionTimelinePill from './SessionTimelinePill.vue';

const props = defineProps<{
	items: TimelineItem[];
	idleRanges: IdleRange[];
	sessionStart: number;
	sessionEnd: number;
	visibleKinds: Set<string>;
	selectedIndex: number | null;
}>();

const SCROLL_PADDING = 48;

const emit = defineEmits<{ select: [index: number] }>();

const i18n = useI18n();
const chartRef = ref<HTMLElement | null>(null);
const activePopover = ref<{ segment: Segment; reference: HTMLElement } | null>(null);
const popoverOpen = ref(false);

const INSTANT_MS = 100;
const POPOVER_SHOW_DELAY_MS = 300;
let showPopoverTimer: ReturnType<typeof setTimeout> | null = null;

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
			const key = builtinToolLabelKey(item.toolName, item.toolOutput);
			return key ? i18n.baseText(key) : formatToolNameForDisplay(item.toolName);
		}
		case 'workflow':
			return item.workflowName ?? formatToolNameForDisplay(item.toolName);
		case 'node':
			return item.nodeDisplayName ?? formatToolNameForDisplay(item.toolName);
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

function showPopover(segment: Segment, event: MouseEvent | FocusEvent): void {
	if (!(event.currentTarget instanceof HTMLElement)) return;
	const reference = event.currentTarget;
	clearShowPopoverTimer();
	showPopoverTimer = setTimeout(() => {
		activePopover.value = { segment, reference };
		popoverOpen.value = true;
	}, POPOVER_SHOW_DELAY_MS);
}

function clearShowPopoverTimer(): void {
	if (!showPopoverTimer) return;
	clearTimeout(showPopoverTimer);
	showPopoverTimer = null;
}

function showSelectedPopover(): void {
	const selectedIndex = props.selectedIndex;
	if (selectedIndex === null) {
		popoverOpen.value = false;
		activePopover.value = null;
		return;
	}

	const segment = segments.value.find((seg) => seg.kind === 'event' && seg.index === selectedIndex);
	const reference = chartRef.value?.querySelector<HTMLElement>(
		`[data-timeline-index="${selectedIndex}"]`,
	);

	if (segment && reference) {
		activePopover.value = { segment, reference };
		popoverOpen.value = true;
	}
}

function scrollSelectedIntoView(): void {
	const selectedIndex = props.selectedIndex;
	const chart = chartRef.value;
	if (selectedIndex === null || !chart) return;

	const selectedBlock = chart.querySelector<HTMLElement>(
		`[data-timeline-index="${selectedIndex}"]`,
	);
	if (!selectedBlock) return;

	const blockLeft = selectedBlock.offsetLeft;
	const blockRight = blockLeft + selectedBlock.offsetWidth;
	const viewportLeft = chart.scrollLeft;
	const viewportRight = viewportLeft + chart.clientWidth;

	if (blockLeft - SCROLL_PADDING < viewportLeft) {
		chart.scrollLeft = Math.max(0, blockLeft - SCROLL_PADDING);
	} else if (blockRight + SCROLL_PADDING > viewportRight) {
		chart.scrollLeft = blockRight + SCROLL_PADDING - chart.clientWidth;
	}
}

function hidePopover(segment: Segment): void {
	clearShowPopoverTimer();
	if (segment.kind === 'event' && segment.index === props.selectedIndex) {
		showSelectedPopover();
		return;
	}

	popoverOpen.value = false;
	activePopover.value = null;
}

watch(
	() => props.selectedIndex,
	() => {
		clearShowPopoverTimer();
		void nextTick(() => {
			scrollSelectedIntoView();
			showSelectedPopover();
		});
	},
);

onBeforeUnmount(clearShowPopoverTimer);
</script>

<template>
	<div ref="chartRef" :class="$style.chart">
		<HoverCardRoot :open="popoverOpen" :close-delay="0">
			<!-- One shared HoverCard avoids hundreds of tooltip instances; segment handlers set content and reference. -->
			<HoverCardTrigger as="span" :class="$style.popoverTrigger" />
			<HoverCardPortal>
				<HoverCardContent
					:reference="activePopover?.reference"
					side="top"
					align="center"
					:side-offset="8"
					:class="$style.tooltipContent"
				>
					<div v-if="activePopover?.segment.kind === 'idle'" :class="$style.popoverInner">
						<SessionTimelinePill
							kind="idle"
							:label="i18n.baseText('agentSessions.timeline.idle')"
							show-label
						/>
						<span :class="$style.popoverMeta">{{ idleDuration(activePopover.segment.range) }}</span>
					</div>
					<div v-else-if="activePopover" :class="$style.popoverInner">
						<SessionTimelinePill
							:kind="activePopover.segment.item.kind"
							:label="popoverLabel(activePopover.segment.item)"
							show-label
						/>
						<span :class="$style.popoverName">{{ popoverName(activePopover.segment.item) }}</span>
						<span v-if="popoverDuration(activePopover.segment.item)" :class="$style.popoverMeta">
							{{ popoverDuration(activePopover.segment.item) }}
						</span>
						<span :class="$style.popoverMeta">{{ popoverTime(activePopover.segment.item) }}</span>
					</div>
				</HoverCardContent>
			</HoverCardPortal>
		</HoverCardRoot>
		<div
			v-for="(seg, segIdx) in segments"
			:key="segIdx"
			data-test-id="timeline-cell"
			:class="$style.cell"
			:style="cellStyle(seg)"
		>
			<div
				v-if="seg.kind === 'idle'"
				data-test-id="timeline-idle"
				:class="$style.idle"
				@mouseenter="showPopover(seg, $event)"
				@mouseleave="hidePopover(seg)"
			>
				<span :class="$style.idleFill">{{ i18n.baseText('agentSessions.timeline.idle') }}</span>
			</div>
			<button
				v-else
				type="button"
				data-test-id="timeline-block"
				:data-timeline-index="seg.index"
				:class="[$style.block, props.selectedIndex === seg.index && $style.selected]"
				:data-selected="props.selectedIndex === seg.index ? 'true' : undefined"
				:style="eventStyle(seg.item)"
				@mouseenter="showPopover(seg, $event)"
				@mouseleave="hidePopover(seg)"
				@focus="showPopover(seg, $event)"
				@blur="hidePopover(seg)"
				@click="onClick(seg.index, seg.item)"
			/>
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
	overflow-x: auto;
	scrollbar-width: none;
	scroll-padding-inline: var(--spacing--lg);
	border-radius: var(--radius);

	&::-webkit-scrollbar {
		display: none;
	}
}

/*
 * Each segment lives inside a flex .cell that owns the inline flex sizing.
 * Hover/focus popover positioning is handled by one shared HoverCard above,
 * anchored to the active block/idle element.
 */
.cell {
	display: flex;
	align-items: stretch;
	min-width: 24px;
	flex-shrink: 0;
	transition:
		opacity,
		transform var(--duration--snappy) var(--easing--ease-out);
}

.chart:has(.block:hover, .block.selected) .block:not(:hover):not(.selected) {
	opacity: 0.6;
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

.block {
	position: relative;
	flex: 1 0 0;
	margin: 4px 0;
	border: none;
	border-radius: var(--radius--sm);
	padding: 0;
	background-color: var(--session-timeline-chart-block-color);
	cursor: pointer;
	transition: filter 0.15s;
}

.selected {
	outline: 2px solid var(--session-timeline-chart-block-color);
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
.popoverTrigger {
	display: none;
}

.tooltipContent {
	max-width: none;
	min-height: var(--height--sm);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	border-radius: var(--radius--xs);
	box-shadow: var(--shadow--sm);
	word-wrap: break-word;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
	background: var(--background--surface);
	border: var(--border);
	color: var(--color--text);
}

.popoverInner {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	white-space: nowrap;
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
