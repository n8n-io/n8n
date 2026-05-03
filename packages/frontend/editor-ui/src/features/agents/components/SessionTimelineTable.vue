<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nRecycleScroller } from '@n8n/design-system';
import SessionTimelineRow from './SessionTimelineRow.vue';
import type { IdleRange, TimelineItem } from '../session-timeline.types';
import { filteredTimelineItemIndexes, formatDuration } from '../session-timeline.utils';

const ROW_HEIGHT = 40;
const SCROLL_PADDING = 24;

const props = defineProps<{
	items: TimelineItem[];
	selectedIndex: number | null;
	visibleKinds: Set<string>;
	searchQuery?: string;
	idleRanges?: IdleRange[];
}>();

const emit = defineEmits<{ select: [index: number] }>();

const i18n = useI18n();
const tableRef = ref<HTMLElement | null>(null);
const canScrollUp = ref(false);
const canScrollDown = ref(false);
let scrollContainer: HTMLElement | null = null;

function labelForKey(key: string): string {
	switch (key) {
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
		case 'working-memory-updated':
			return i18n.baseText('agentSessions.timeline.memoryUpdated');
		case 'suspension':
			return i18n.baseText('agentSessions.timeline.suspended');
		case 'suspension-waiting':
			return i18n.baseText('agentSessions.timeline.waitingForUser');
		case 'agentSessions.timeline.tool.richInteraction':
		case 'agentSessions.timeline.tool.richInteractionDisplay':
			return i18n.baseText(key);
		default:
			return key;
	}
}

type Row =
	| { id: string; kind: 'event'; item: TimelineItem; index: number; sortKey: number }
	| { id: string; kind: 'idle'; range: IdleRange; sortKey: number };

const rows = computed<Row[]>(() => {
	const events: Row[] = filteredTimelineItemIndexes(
		props.items,
		props.visibleKinds,
		props.searchQuery ?? '',
		labelForKey,
	).map((index) => ({
		id: `event-${index}`,
		kind: 'event',
		item: props.items[index],
		index,
		sortKey: props.items[index].timestamp,
	}));

	const idles: Row[] = (props.idleRanges ?? []).map((range, index) => ({
		id: `idle-${range.start}-${range.end}-${index}`,
		kind: 'idle',
		range,
		sortKey: range.start,
	}));

	return [...events, ...idles].sort((a, b) => a.sortKey - b.sortKey);
});

function updateScrollMask() {
	if (!scrollContainer) {
		canScrollUp.value = false;
		canScrollDown.value = false;
		return;
	}
	canScrollUp.value = scrollContainer.scrollTop > 0;
	canScrollDown.value =
		scrollContainer.scrollTop + scrollContainer.clientHeight < scrollContainer.scrollHeight - 1;
}

function bindScrollContainer() {
	const nextScrollContainer = tableRef.value?.querySelector<HTMLElement>(
		'.recycle-scroller-wrapper',
	);
	if (nextScrollContainer === scrollContainer) return;

	scrollContainer?.removeEventListener('scroll', updateScrollMask);
	scrollContainer = nextScrollContainer ?? null;
	scrollContainer?.addEventListener('scroll', updateScrollMask, { passive: true });
	updateScrollMask();
}

function visibleRowElement(rowId: string): HTMLElement | undefined {
	const visibleRows = tableRef.value?.querySelectorAll<HTMLElement>('[data-timeline-row-id]');

	return Array.from(visibleRows ?? []).find((element) => element.dataset.timelineRowId === rowId);
}

function scrollVisibleRowIntoView(rowId: string): boolean {
	if (!scrollContainer) return false;

	const rowElement = visibleRowElement(rowId);
	if (!rowElement) return false;

	const containerRect = scrollContainer.getBoundingClientRect();
	const rowRect = rowElement.getBoundingClientRect();

	if (rowRect.top - SCROLL_PADDING < containerRect.top) {
		scrollContainer.scrollTop -= containerRect.top - rowRect.top + SCROLL_PADDING;
	} else if (rowRect.bottom + SCROLL_PADDING > containerRect.bottom) {
		scrollContainer.scrollTop += rowRect.bottom - containerRect.bottom + SCROLL_PADDING;
	}

	return true;
}

function scrollRowIntoView(rowId: string) {
	if (!scrollContainer) return;
	if (scrollVisibleRowIntoView(rowId)) return;

	const rowIndex = rows.value.findIndex((row) => row.id === rowId);
	if (rowIndex === -1) return;

	const rowTop = rowIndex * ROW_HEIGHT;
	const rowBottom = rowTop + ROW_HEIGHT;
	const viewportTop = scrollContainer.scrollTop;
	const viewportBottom = viewportTop + scrollContainer.clientHeight;

	if (rowTop - SCROLL_PADDING < viewportTop) {
		scrollContainer.scrollTop = Math.max(0, rowTop - SCROLL_PADDING);
	} else if (rowBottom + SCROLL_PADDING > viewportBottom) {
		scrollContainer.scrollTop = rowBottom + SCROLL_PADDING - scrollContainer.clientHeight;
	}

	void nextTick(() => {
		scrollVisibleRowIntoView(rowId);
		updateScrollMask();
	});
}

watch(
	() => rows.value.length,
	() => {
		void nextTick(() => {
			bindScrollContainer();
			updateScrollMask();
		});
	},
);

onMounted(() => {
	void nextTick(bindScrollContainer);
});

onBeforeUnmount(() => {
	scrollContainer?.removeEventListener('scroll', updateScrollMask);
});

watch(
	() => props.selectedIndex,
	(selectedIndex) => {
		if (selectedIndex === null) return;
		void nextTick(() => {
			scrollRowIntoView(`event-${selectedIndex}`);
			updateScrollMask();
		});
	},
);
</script>

<template>
	<div
		ref="tableRef"
		:class="[
			$style.table,
			canScrollUp && $style.canScrollUp,
			canScrollDown && $style.canScrollDown,
		]"
	>
		<N8nRecycleScroller v-if="rows.length > 0" :items="rows" :item-size="ROW_HEIGHT" item-key="id">
			<template #default="{ item: row }">
				<div
					v-if="row.kind === 'event'"
					data-test-id="timeline-row"
					:data-timeline-row-id="row.id"
					:class="$style.rowWrapper"
					@click="emit('select', row.index)"
				>
					<SessionTimelineRow :item="row.item" :selected="props.selectedIndex === row.index" />
				</div>
				<div
					v-else
					data-test-id="timeline-idle-row"
					:data-timeline-row-id="row.id"
					:class="$style.idleRow"
				>
					<span :class="$style.idlePill">
						{{ i18n.baseText('agentSessions.timeline.idle') }} ·
						{{ formatDuration(row.range.end - row.range.start) }}
					</span>
				</div>
			</template>
		</N8nRecycleScroller>
		<div v-else data-test-id="timeline-empty" :class="$style.empty">
			{{ i18n.baseText('executionsLandingPage.noResults') }}
		</div>
	</div>
</template>

<style module lang="scss">
.table {
	background-color: var(--background--surface);
	padding: var(--spacing--4xs);
	height: 100%;
}

.rowWrapper {
	width: 100%;
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
}

.table :global(.recycle-scroller-wrapper) {
	scrollbar-width: none;
	scroll-padding-block: var(--spacing--lg);

	&::-webkit-scrollbar {
		display: none;
	}
}

.canScrollDown :global(.recycle-scroller-wrapper) {
	mask-image: linear-gradient(to bottom, black 0%, black 95%, transparent 100%);
}

.canScrollUp :global(.recycle-scroller-wrapper) {
	mask-image: linear-gradient(to bottom, transparent 0%, black 2%, black 100%);
}

.canScrollUp.canScrollDown :global(.recycle-scroller-wrapper) {
	mask-image: linear-gradient(to bottom, transparent 0%, black 2%, black 95%, transparent 100%);
}

.idleRow {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	height: var(--height--xl);
	padding: var(--spacing--2xs) var(--spacing--sm);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	/* Match the chart's idle styling — striped 45° gradient. */
	background-image: repeating-linear-gradient(
		45deg,
		var(--color--foreground--shade-1) 0 4px,
		transparent 4px 8px
	);
}

.idlePill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--lg);
	/* Page-bg fill so the pill stands out against the striped row backdrop,
	   mirroring the .idleFill treatment on the chart. */
	background-color: var(--color--background);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: lowercase;
	letter-spacing: 0.02em;
	white-space: nowrap;
}
</style>
