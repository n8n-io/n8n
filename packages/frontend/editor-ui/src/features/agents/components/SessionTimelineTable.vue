<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nRecycleScroller } from '@n8n/design-system';
import SessionTimelineRow from './SessionTimelineRow.vue';
import type { IdleRange, TimelineItem } from '../session-timeline.types';
import { filteredTimelineItemIndexes, formatDuration } from '../session-timeline.utils';
import { backgroundJobTimelineLabelKey } from '../utils/background-job-labels';

const ROW_HEIGHT = 40;
const VIRTUALIZE_AFTER_ROWS = 100;

const props = defineProps<{
	items: TimelineItem[];
	selectedIndex: number | null;
	visibleKinds: Set<string>;
	searchQuery?: string;
	idleRanges?: IdleRange[];
}>();

const i18n = useI18n();
const tableRef = ref<HTMLElement | null>(null);
const canScrollUp = ref(false);
const canScrollDown = ref(false);
let scrollContainer: HTMLElement | null = null;

function labelForKey(key: string): string {
	const backgroundJobKey = backgroundJobTimelineLabelKey(key);
	if (backgroundJobKey) return i18n.baseText(backgroundJobKey);

	switch (key) {
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
			return i18n.baseText('agentSessions.timeline.executionFailed');
		case 'execution-interrupted':
			return i18n.baseText('agentSessions.timeline.executionInterrupted');
		case 'suspension':
			return i18n.baseText('agentSessions.timeline.hitlRequest');
		case 'hitl-response':
			return i18n.baseText('agentSessions.timeline.hitlResponse');
		case 'approval-requested':
			return i18n.baseText('agentSessions.timeline.approvalRequested');
		case 'hitl-requested':
			return i18n.baseText('agentSessions.timeline.hitlRequested');
		case 'wait-requested':
			return i18n.baseText('agentSessions.timeline.waitRequested');
		case 'approved':
			return i18n.baseText('agentSessions.timeline.approved');
		case 'responded':
			return i18n.baseText('agentSessions.timeline.responseReceived');
		case 'declined':
			return i18n.baseText('agentSessions.timeline.declined');
		case 'error':
			return i18n.baseText('agentSessions.timeline.error');
		default:
			return key;
	}
}

type Row =
	| { id: string; kind: 'event'; item: TimelineItem; index: number; sortKey: number }
	| { id: string; kind: 'idle'; range: IdleRange; sortKey: number };

const rows = computed<Row[]>(function getRows() {
	const events: Row[] = filteredTimelineItemIndexes(
		props.items,
		props.visibleKinds,
		props.searchQuery ?? '',
		labelForKey,
	).map(function toEventRow(index) {
		return {
			id: `event-${index}`,
			kind: 'event',
			item: props.items[index],
			index,
			sortKey: props.items[index].timestamp,
		};
	});

	const idles: Row[] = (props.idleRanges ?? []).map(function toIdleRow(range, index) {
		return {
			id: `idle-${range.start}-${range.end}-${index}`,
			kind: 'idle',
			range,
			sortKey: range.start,
		};
	});

	return [...events, ...idles].sort(function sortRows(a, b) {
		return a.sortKey - b.sortKey;
	});
});

const shouldVirtualizeRows = computed(function shouldVirtualize() {
	return rows.value.length > VIRTUALIZE_AFTER_ROWS;
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
	const nextScrollContainer =
		tableRef.value?.querySelector<HTMLElement>('[data-timeline-scroll-container]') ??
		tableRef.value?.querySelector<HTMLElement>('.recycle-scroller-wrapper');
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
</script>

<template>
	<div
		ref="tableRef"
		:class="[
			$style.table,
			canScrollUp && $style.canScrollUp,
			canScrollDown && $style.canScrollDown,
		]"
		role="grid"
		:aria-label="i18n.baseText('agentSessions.timeline.events')"
	>
		<div
			v-if="rows.length > 0 && !shouldVirtualizeRows"
			:class="$style.directRows"
			data-timeline-scroll-container
			role="rowgroup"
		>
			<template v-for="(row, rowIndex) in rows" :key="row.id">
				<div
					v-if="row.kind === 'event'"
					data-test-id="timeline-row"
					:data-timeline-row-id="row.id"
					:class="$style.rowWrapper"
					role="row"
					:aria-selected="props.selectedIndex === row.index"
				>
					<SessionTimelineRow :item="row.item" :selected="props.selectedIndex === row.index" />
					<div v-if="rowIndex < rows.length - 1" :class="$style.divider"><span></span></div>
				</div>
				<div
					v-else
					data-test-id="timeline-idle-row"
					:data-timeline-row-id="row.id"
					:class="$style.idleRow"
					role="row"
				>
					<span :class="$style.idlePill" role="gridcell">
						{{ i18n.baseText('agentSessions.timeline.idle') }} ·
						{{ formatDuration(row.range.end - row.range.start) }}
					</span>
				</div>
			</template>
		</div>
		<N8nRecycleScroller
			v-else-if="rows.length > 0"
			:items="rows"
			:item-size="ROW_HEIGHT"
			item-key="id"
			role="rowgroup"
		>
			<template #default="{ item: row, index: rowIndex }">
				<div
					v-if="row.kind === 'event'"
					data-test-id="timeline-row"
					:data-timeline-row-id="row.id"
					:class="$style.rowWrapper"
					role="row"
					:aria-selected="props.selectedIndex === row.index"
				>
					<SessionTimelineRow :item="row.item" :selected="props.selectedIndex === row.index" />
					<div v-if="rowIndex < rows.length - 1" :class="$style.divider"><span></span></div>
				</div>
				<div
					v-else
					data-test-id="timeline-idle-row"
					:data-timeline-row-id="row.id"
					:class="$style.idleRow"
					role="row"
				>
					<span :class="$style.idlePill" role="gridcell">
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
	padding: var(--spacing--lg) 0;
	height: 100%;
}

.rowWrapper {
	display: flex;
	flex-direction: column;
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

.directRows {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow-y: auto;
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

.canScrollDown .directRows {
	mask-image: linear-gradient(to bottom, black 0%, black 95%, transparent 100%);
}

.canScrollUp .directRows {
	mask-image: linear-gradient(to bottom, transparent 0%, black 2%, black 100%);
}

.canScrollUp.canScrollDown .directRows {
	mask-image: linear-gradient(to bottom, transparent 0%, black 2%, black 95%, transparent 100%);
}

.idleRow {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
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

.divider {
	width: 100%;
	padding-inline: var(--spacing--lg);
	transform: translateX(2px);

	> span {
		display: block;
		height: var(--height--4xs);
		width: 1px;
		background-color: var(--border-color);
	}
}
</style>
