<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { ComponentPublicInstance } from 'vue';
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
const scrollerRef = ref<
	ComponentPublicInstance<{ scrollItemIntoView: (itemKey: string) => void }> | undefined
>();
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
	if (!scrollContainer) return;
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
			scrollerRef.value?.scrollItemIntoView(`event-${selectedIndex}`);
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
		<N8nRecycleScroller
			ref="scrollerRef"
			:items="rows"
			:item-size="ROW_HEIGHT"
			:scroll-padding="SCROLL_PADDING"
			item-key="id"
		>
			<template #default="{ item: row }">
				<div
					v-if="row.kind === 'event'"
					data-test-id="timeline-row"
					:class="$style.rowWrapper"
					@click="emit('select', row.index)"
				>
					<SessionTimelineRow :item="row.item" :selected="props.selectedIndex === row.index" />
				</div>
				<div v-else data-test-id="timeline-idle-row" :class="$style.idleRow">
					<span :class="$style.idlePill">
						{{ i18n.baseText('agentSessions.timeline.idle') }} ·
						{{ formatDuration(row.range.end - row.range.start) }}
					</span>
				</div>
			</template>
		</N8nRecycleScroller>
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
