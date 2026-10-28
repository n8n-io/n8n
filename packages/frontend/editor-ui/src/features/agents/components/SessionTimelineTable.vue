<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { vElementSize } from '@vueuse/components';
import type { AgentChatResumeDto, AgentJsonConfig } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { N8nRecycleScroller } from '@n8n/design-system';
import SessionTimelineRow from './SessionTimelineRow.vue';
import type { TimelineItem } from '../session-timeline.types';
import { filteredTimelineItemIndexes, timelineItemKey } from '../session-timeline.utils';
import { backgroundJobTimelineLabelKey } from '../utils/background-job-labels';

const ROW_HEIGHT = 40;
const VIRTUALIZE_AFTER_ROWS = 100;

const props = defineProps<{
	items: TimelineItem[];
	respondToApproval?: (payload: AgentChatResumeDto) => Promise<void>;
	pendingApprovalRunIds?: ReadonlySet<string>;
	agentName?: string;
	projectId?: string;
	agentId?: string;
	threadId?: string;
	personalisation?: AgentJsonConfig['personalisation'] | null;
	tools?: AgentJsonConfig['tools'];
	selectedIndex: number | null;
	visibleKinds: Set<string>;
	searchQuery?: string;
	noticeIndex?: number;
}>();

const emit = defineEmits<{ select: [index: number | null] }>();

const i18n = useI18n();
const tableRef = ref<HTMLElement | null>(null);
const scrollerRef = ref<{
	scrollToKey: (key: string, behavior?: ScrollBehavior) => void;
} | null>(null);
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

type Row = { id: string; kind: 'event'; item: TimelineItem; index: number; sortKey: number };

const rows = computed<Row[]>(function getRows() {
	const events: Row[] = filteredTimelineItemIndexes(
		props.items,
		props.visibleKinds,
		props.searchQuery ?? '',
		labelForKey,
	).map(function toEventRow(index) {
		const item = props.items[index];
		return {
			id: timelineItemKey(item),
			kind: 'event',
			item,
			index,
			sortKey: item.timestamp,
		};
	});

	return events.sort(function sortRows(a, b) {
		return a.sortKey - b.sortKey;
	});
});

const shouldVirtualizeRows = computed(function shouldVirtualize() {
	return rows.value.length > VIRTUALIZE_AFTER_ROWS;
});
const tabbableEventIndex = computed(function getTabbableEventIndex() {
	return rows.value.find((row) => row.index === props.selectedIndex)?.index ?? rows.value[0]?.index;
});

function onRowClick(event: MouseEvent, index: number) {
	if (
		event.target instanceof Element &&
		event.target.closest(
			'a, button, input, select, textarea, [role="button"], [contenteditable="true"]',
		)
	) {
		return;
	}
	emit('select', index);
}

function onRowKeydown(event: KeyboardEvent) {
	if (event.target !== event.currentTarget) return;
	if (event.key === 'Escape') {
		if (props.selectedIndex === null) return;
		event.preventDefault();
		emit('select', null);
		return;
	}

	if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
	if (event.ctrlKey || event.altKey || event.shiftKey) return;
	event.preventDefault();
	const direction = event.key === 'ArrowDown' ? 1 : -1;
	const currentIndex = rows.value.findIndex((row) => row.index === props.selectedIndex);
	const nextIndex = event.metaKey
		? direction === 1
			? rows.value.length - 1
			: 0
		: currentIndex < 0
			? direction === 1
				? 0
				: rows.value.length - 1
			: Math.max(0, Math.min(rows.value.length - 1, currentIndex + direction));
	const row = rows.value[nextIndex];
	if (row) emit('select', row.index);
}

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

function scrollSelectedIntoView(): void {
	const selectedIndex = props.selectedIndex;
	if (selectedIndex === null) return;
	const rowId = rows.value.find((row) => row.index === selectedIndex)?.id;
	if (!rowId) return;

	const behavior =
		shouldVirtualizeRows.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches
			? 'auto'
			: 'smooth';
	bindScrollContainer();
	const row = tableRef.value?.querySelector<HTMLElement>(`[data-timeline-row-id="${rowId}"]`);
	if (shouldVirtualizeRows.value && !row) {
		/** Row measurements can change the target offset during a smooth scroll. */
		scrollerRef.value?.scrollToKey(rowId, 'auto');
		return;
	}

	if (!row || !scrollContainer) return;

	const rowBounds = row.getBoundingClientRect();
	const containerBounds = scrollContainer.getBoundingClientRect();
	if (rowBounds.top < containerBounds.top) {
		scrollContainer.scrollTo({
			top: scrollContainer.scrollTop + rowBounds.top - containerBounds.top,
			behavior,
		});
	} else if (rowBounds.bottom > containerBounds.bottom) {
		scrollContainer.scrollTo({
			top: scrollContainer.scrollTop + rowBounds.bottom - containerBounds.bottom,
			behavior,
		});
	}
	updateScrollMask();
}

defineExpose({ scrollSelectedIntoView });

watch(
	() => props.selectedIndex,
	() => {
		const activeElement = document.activeElement;
		const shouldMoveFocus =
			activeElement instanceof HTMLElement &&
			tableRef.value?.contains(activeElement) === true &&
			activeElement.matches('[data-timeline-row-id]');
		void nextTick(async () => {
			scrollSelectedIntoView();
			if (!shouldMoveFocus) return;
			await nextTick();
			const rowId = rows.value.find((row) => row.index === props.selectedIndex)?.id;
			if (!rowId) return;
			tableRef.value
				?.querySelector<HTMLElement>(`[data-timeline-row-id="${rowId}"]`)
				?.focus({ preventScroll: true });
		});
	},
);

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
					data-test-id="timeline-row"
					:data-timeline-row-id="row.id"
					:class="$style.rowWrapper"
					role="row"
					:aria-selected="props.selectedIndex === row.index"
					:tabindex="tabbableEventIndex === row.index ? 0 : -1"
					@click="onRowClick($event, row.index)"
					@keydown="onRowKeydown"
					@keydown.enter.self.prevent="emit('select', row.index)"
					@keydown.space.self.prevent="emit('select', row.index)"
				>
					<div role="gridcell">
						<SessionTimelineRow
							:project-id="props.projectId"
							:agent-id="props.agentId"
							:thread-id="props.threadId"
							:item="row.item"
							:respond-to-approval="props.respondToApproval"
							:pending-approval-run-ids="props.pendingApprovalRunIds"
							:agent-name="props.agentName"
							:tools="props.tools"
							:selected="props.selectedIndex === row.index"
							:search-query="props.searchQuery"
							:personalisation="props.personalisation"
						/>
					</div>
					<div v-if="rowIndex < rows.length - 1" :class="$style.divider"><span></span></div>
				</div>
				<div
					v-if="$slots.notice && row.index === props.noticeIndex"
					:class="$style.rowWrapper"
					data-test-id="timeline-notice-row"
					role="row"
				>
					<div role="gridcell"><slot name="notice" /></div>
				</div>
			</template>
		</div>
		<N8nRecycleScroller
			v-else-if="rows.length > 0"
			ref="scrollerRef"
			:items="rows"
			:item-size="ROW_HEIGHT"
			item-key="id"
			role="rowgroup"
		>
			<template #default="{ item: row, updateItemSize }">
				<div
					v-element-size="() => updateItemSize({ id: row.id })"
					data-test-id="timeline-row"
					:data-timeline-row-id="row.id"
					:class="$style.rowWrapper"
					role="row"
					:aria-selected="props.selectedIndex === row.index"
					:tabindex="tabbableEventIndex === row.index ? 0 : -1"
					@click="onRowClick($event, row.index)"
					@keydown="onRowKeydown"
					@keydown.enter.self.prevent="emit('select', row.index)"
					@keydown.space.self.prevent="emit('select', row.index)"
				>
					<div role="gridcell">
						<SessionTimelineRow
							:project-id="props.projectId"
							:agent-id="props.agentId"
							:thread-id="props.threadId"
							:item="row.item"
							:respond-to-approval="props.respondToApproval"
							:pending-approval-run-ids="props.pendingApprovalRunIds"
							:agent-name="props.agentName"
							:tools="props.tools"
							:selected="props.selectedIndex === row.index"
							:search-query="props.searchQuery"
							:personalisation="props.personalisation"
						/>
					</div>
					<div
						v-if="$slots.notice && row.index === props.noticeIndex"
						data-test-id="timeline-notice-row"
						role="gridcell"
					>
						<slot name="notice" />
					</div>
					<div v-if="row.id !== rows[rows.length - 1].id" :class="$style.divider">
						<span></span>
					</div>
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
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	padding-block-end: var(--spacing--lg);
}

.rowWrapper {
	display: flex;
	flex-direction: column;
	width: 100%;
	max-width: var(--n8n-session-panel--container-width, none);
	margin: 0 auto;
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
