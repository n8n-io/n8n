<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { truncate } from '@n8n/utils/string/truncate';
import { useI18n } from '@n8n/i18n';
import { N8nBadge, N8nHoverCard, N8nIconButton } from '@n8n/design-system';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import type { CSSProperties } from 'vue';
import type { TimelineItem } from '../session-timeline.types';
import {
	backgroundJobSignalSummary,
	executionErrorLabel,
	executionErrorMessage,
	formatDuration,
	hitlRequestLabelKey,
	hitlTimelineName,
	isErroredTimelineItem,
	isSubAgentTimelineItem,
	matchesTimelineFilters,
	timelineItemStatus,
} from '../session-timeline.utils';
import { chartBlockStyleForItem } from '../session-timeline.styles';
import { formatToolNameForDisplay, resolveToolNameForDisplay } from '../utils/toolDisplayName';
import SessionTimelinePill from './SessionTimelinePill.vue';

const props = defineProps<{
	items: TimelineItem[];
	sessionStart: number;
	sessionEnd: number;
	visibleKinds: Set<string>;
	selectedIndex: number | null;
}>();

const SCROLL_PADDING = 48;

const emit = defineEmits<{ select: [index: number] }>();

type Segment = { kind: 'event'; item: TimelineItem; index: number; duration: number };

type PopoverTarget = { segment: Segment; reference: HTMLElement };

const i18n = useI18n();
const carouselRef = ref<HTMLElement | null>(null);
const chartRef = ref<HTMLElement | null>(null);
const hasOverflow = ref(false);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
const activePopover = ref<PopoverTarget | null>(null);
const popoverOpen = ref(false);
const activePopoverStatus = computed(() => {
	const segment = activePopover.value?.segment;
	return segment?.kind === 'event' ? timelineItemStatus(segment.item) : undefined;
});

const INSTANT_MS = 100;
const POPOVER_SHOW_DELAY_MS = 300;
const POPOVER_HIDE_DELAY_MS = 100;
let showPopoverTimer: ReturnType<typeof setTimeout> | null = null;
let hidePopoverTimer: ReturnType<typeof setTimeout> | null = null;
let resizeObserver: ResizeObserver | null = null;

let hoveredPopover: PopoverTarget | null = null;
let focusedPopover: PopoverTarget | null = null;

const segments = computed<Segment[]>(() => {
	const out: Segment[] = [];
	for (let i = 0; i < props.items.length; i++) {
		const item = props.items[i];
		const duration = item.endTimestamp ? item.endTimestamp - item.timestamp : INSTANT_MS;
		out.push({ kind: 'event', item, index: i, duration });
	}
	return out;
});

function isDimmed(item: TimelineItem): boolean {
	return !matchesTimelineFilters(item, props.visibleKinds);
}

function cellStyle(seg: Segment): Record<string, string> {
	// flex-shrink: 1 lets cells contract when total min-widths exceed the chart width.
	return { flex: `${Math.max(seg.duration, 1)} 1 0` };
}

function eventStyle(item: TimelineItem): CSSProperties {
	const style: CSSProperties = chartBlockStyleForItem(item);
	if (isDimmed(item)) {
		style.opacity = '0.15';
		style.pointerEvents = 'none';
	}
	return style;
}

function popoverPillKind(item: TimelineItem) {
	return isSubAgentTimelineItem(item) ? 'subagent' : item.kind;
}

function popoverLabel(item: TimelineItem): string {
	if (isSubAgentTimelineItem(item)) return i18n.baseText('agentSessions.timeline.subAgent');
	switch (item.kind) {
		case 'background-task-signal':
			return i18n.baseText('agents.chat.backgroundTasks.resultsReceived');
		case 'user':
			return i18n.baseText('agentSessions.timeline.user');
		case 'agent':
			return i18n.baseText('agentSessions.timeline.agent');
		case 'skill':
			return i18n.baseText('agentSessions.timeline.skill');
		case 'tool':
			return i18n.baseText('agentSessions.timeline.tool');
		case 'workflow':
			return i18n.baseText('agentSessions.timeline.workflow');
		case 'node':
			return i18n.baseText('agentSessions.timeline.node');
		case 'execution-error':
			return executionErrorLabel(item, i18n);
		case 'suspension':
			return i18n.baseText(hitlRequestLabelKey(item.hitlRequestType));
		case 'hitl-response':
			return i18n.baseText('agentSessions.timeline.hitlResponse');
		default:
			return '';
	}
}

function popoverName(item: TimelineItem): string {
	if (isSubAgentTimelineItem(item)) {
		return item.subAgentName ?? formatToolNameForDisplay(item.toolName);
	}
	switch (item.kind) {
		case 'background-task-signal':
			return backgroundJobSignalSummary(item, i18n);
		case 'user':
		case 'agent':
			return truncate(item.content ?? '', 80);
		case 'skill':
			return item.skillName ?? resolveToolNameForDisplay(item.toolName, i18n, item.toolOutput);
		case 'tool': {
			return resolveToolNameForDisplay(item.toolName, i18n, item.toolOutput);
		}
		case 'workflow':
			return item.workflowName ?? formatToolNameForDisplay(item.toolName);
		case 'node':
			return item.nodeDisplayName ?? formatToolNameForDisplay(item.toolName);
		case 'execution-error':
			return executionErrorMessage(item, i18n);
		case 'suspension':
		case 'hitl-response':
			return hitlTimelineName(item, i18n);
		default:
			return '';
	}
}

function statusLabel(item: TimelineItem): string | undefined {
	const status = timelineItemStatus(item);
	return status ? i18n.baseText(status.labelKey) : undefined;
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

function popoverTime(item: TimelineItem): string {
	if (!item.timestamp) return '';
	return convertToDisplayDate(new Date(item.timestamp).toISOString()).time;
}

function blockAriaLabel(item: TimelineItem): string {
	return [popoverLabel(item), popoverName(item), statusLabel(item)]
		.filter((part): part is string => Boolean(part))
		.join(', ');
}

function onClick(index: number, item: TimelineItem): void {
	if (isDimmed(item)) return;
	emit('select', index);
}

function showPopover(segment: Segment, event: MouseEvent | FocusEvent): void {
	if (!(event.currentTarget instanceof HTMLElement)) return;
	const target = { segment, reference: event.currentTarget };
	if (event.type === 'focus') {
		focusedPopover = target;
	} else {
		hoveredPopover = target;
	}
	clearShowPopoverTimer();
	clearHidePopoverTimer();
	if (popoverOpen.value) {
		activePopover.value = target;
		return;
	}
	showPopoverTimer = setTimeout(() => {
		activePopover.value = target;
		popoverOpen.value = true;
	}, POPOVER_SHOW_DELAY_MS);
}

function clearShowPopoverTimer(): void {
	if (!showPopoverTimer) return;
	clearTimeout(showPopoverTimer);
	showPopoverTimer = null;
}

function clearHidePopoverTimer(): void {
	if (!hidePopoverTimer) return;
	clearTimeout(hidePopoverTimer);
	hidePopoverTimer = null;
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

function updateScrollState(): void {
	const chart = chartRef.value;
	if (!chart) {
		hasOverflow.value = false;
		canScrollLeft.value = false;
		canScrollRight.value = false;
		return;
	}

	const availableWidth = carouselRef.value?.clientWidth ?? chart.clientWidth;
	const maxScrollLeft = Math.max(0, chart.scrollWidth - chart.clientWidth);
	hasOverflow.value = chart.scrollWidth - availableWidth > 1;
	canScrollLeft.value = hasOverflow.value && chart.scrollLeft > 1;
	canScrollRight.value = hasOverflow.value && chart.scrollLeft < maxScrollLeft - 1;
}

function scrollChart(direction: -1 | 1): void {
	const chart = chartRef.value;
	if (!chart) return;

	const distance = Math.max(chart.clientWidth - SCROLL_PADDING, SCROLL_PADDING);
	const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
		? 'auto'
		: 'smooth';
	chart.scrollBy({ left: direction * distance, top: 0, behavior });
}

function hidePopover(event: MouseEvent | FocusEvent): void {
	if (event.type === 'blur') {
		focusedPopover = null;
	} else {
		hoveredPopover = null;
	}
	clearShowPopoverTimer();
	clearHidePopoverTimer();
	const remainingTarget = focusedPopover ?? hoveredPopover;
	if (remainingTarget) {
		activePopover.value = remainingTarget;
		popoverOpen.value = true;
		return;
	}
	/** Keep the card open while the pointer crosses a gap between cells. */
	hidePopoverTimer = setTimeout(() => {
		popoverOpen.value = false;
		activePopover.value = null;
		hidePopoverTimer = null;
	}, POPOVER_HIDE_DELAY_MS);
}

watch(
	() => props.selectedIndex,
	() => {
		void nextTick(scrollSelectedIntoView);
	},
);

watch(segments, () => {
	void nextTick(updateScrollState);
});

onMounted(() => {
	const chart = chartRef.value;
	if (!chart) return;

	chart.addEventListener('scroll', updateScrollState, { passive: true });
	resizeObserver = new ResizeObserver(updateScrollState);
	resizeObserver.observe(chart);
	if (carouselRef.value) resizeObserver.observe(carouselRef.value);
	updateScrollState();
});

onBeforeUnmount(() => {
	clearShowPopoverTimer();
	clearHidePopoverTimer();
	chartRef.value?.removeEventListener('scroll', updateScrollState);
	resizeObserver?.disconnect();
});
</script>

<template>
	<div ref="carouselRef" :class="$style.carousel">
		<N8nIconButton
			v-if="hasOverflow"
			icon="chevron-left"
			variant="ghost"
			size="small"
			:aria-label="i18n.baseText('agentSessions.timeline.scrollBackward')"
			:disabled="!canScrollLeft"
			@click="scrollChart(-1)"
		/>
		<div ref="chartRef" :class="$style.chart">
			<N8nHoverCard
				:open="popoverOpen"
				hide-trigger
				:reference="activePopover?.reference"
				side="top"
				align="center"
				:side-offset="8"
				:close-delay="0"
				max-width="none"
				:content-class="$style.hoverCardContent"
			>
				<!-- One shared HoverCard avoids hundreds of tooltip instances; segment handlers set content and reference. -->
				<template #content>
					<div v-if="activePopover" :class="$style.popoverInner">
						<SessionTimelinePill
							:kind="popoverPillKind(activePopover.segment.item)"
							:label="popoverLabel(activePopover.segment.item)"
							show-label
						/>
						<span :class="$style.popoverName">{{ popoverName(activePopover.segment.item) }}</span>
						<N8nBadge
							v-if="activePopoverStatus"
							:variant="activePopoverStatus.theme"
							size="xxsmall"
							:data-test-id="
								activePopoverStatus.kind === 'hitl-response'
									? 'timeline-popover-hitl-response-badge'
									: activePopover.segment.item.kind === 'execution-error'
										? 'timeline-popover-execution-error-badge'
										: 'timeline-popover-tool-error-badge'
							"
						>
							{{ i18n.baseText(activePopoverStatus.labelKey) }}
						</N8nBadge>
						<span v-if="popoverDuration(activePopover.segment.item)" :class="$style.popoverMeta">
							{{ popoverDuration(activePopover.segment.item) }}
						</span>
						<span :class="$style.popoverMeta">{{ popoverTime(activePopover.segment.item) }}</span>
					</div>
				</template>
			</N8nHoverCard>
			<div
				v-for="(seg, segIdx) in segments"
				:key="segIdx"
				data-test-id="timeline-cell"
				:data-error="seg.kind === 'event' && isErroredTimelineItem(seg.item) ? 'true' : undefined"
				:class="$style.cell"
				:style="cellStyle(seg)"
			>
				<button
					type="button"
					data-test-id="timeline-block"
					:data-timeline-index="seg.index"
					:data-error="isErroredTimelineItem(seg.item) ? 'true' : undefined"
					:aria-label="blockAriaLabel(seg.item)"
					:class="$style.block"
					:style="eventStyle(seg.item)"
					@mouseenter="showPopover(seg, $event)"
					@mouseleave="hidePopover($event)"
					@focus="showPopover(seg, $event)"
					@blur="hidePopover($event)"
					@click="onClick(seg.index, seg.item)"
				/>
			</div>
		</div>
		<N8nIconButton
			v-if="hasOverflow"
			icon="chevron-right"
			variant="ghost"
			size="small"
			:aria-label="i18n.baseText('agentSessions.timeline.scrollForward')"
			:disabled="!canScrollRight"
			@click="scrollChart(1)"
		/>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/mixins';

.carousel {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: var(--spacing--4xs);
	width: 100%;
	min-width: 0;
	overflow-x: auto;
	scroll-snap-type: x mandatory;
	height: var(--height--lg);
	padding-block: var(--spacing--xs);
	max-width: var(--n8n-session-panel--container-width, none);
	margin: 0 auto;

	// @include mixins.scroll-mask(x);
}

.chart {
	display: flex;
	align-items: stretch;
	flex: 1;
	gap: 1px;
	height: var(--height--sm);
	min-width: 0;
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
	position: relative;
	display: flex;
	align-items: stretch;
	min-width: var(--height--3xs);
	flex-shrink: 0;
	transition:
		opacity,
		transform var(--duration--snappy) var(--easing--ease-out);

	/** First cell is actually #2 cause we have a hidden trigger element **/
	&:nth-child(2) .block {
		border-top-left-radius: var(--radius);
		border-bottom-left-radius: var(--radius);
	}
	&:last-child .block {
		border-top-right-radius: var(--radius);
		border-bottom-right-radius: var(--radius);
	}
}

.cell[data-error='true']::before {
	position: absolute;
	top: calc(var(--spacing--5xs) * -1);
	left: 0;
	width: 100%;
	height: var(--spacing--4xs);
	background-color: var(--color--danger);
	content: '';
	/* Only needs to clear the block inside this cell. */
	z-index: 1;
}

.chart:has(.block:hover) .block:not(:hover) {
	opacity: 0.4;
}

.block {
	position: relative;
	flex: 1 0 0;
	border: none;
	margin: 4px 0;
	padding: 0;
	background-color: var(--session-timeline-chart-block-color);
	cursor: pointer;
	transition: filter 0.15s;
}

/*
 * Keep the shared hover card compact so the single-line row layout
 * (pill · name · duration · time) doesn't wrap.
 */
.hoverCardContent {
	max-width: none;
	min-height: var(--height--sm);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	word-wrap: break-word;
	display: flex;
	align-items: center;
	justify-content: center;
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
	color: var(--text-color--subtler);
	font-variant-numeric: tabular-nums;
}
</style>
