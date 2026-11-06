<script setup lang="ts">
import { useIntersectionObserver } from '@n8n/composables/useIntersectionObserver';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import type {
	VersionHistoryActionPayload,
	VersionHistoryItem as VersionHistoryRow,
	VersionHistoryProps,
	VersionHistoryTogglePayload,
} from './VersionHistory.types';
import {
	pinnedHeading,
	scrollTopBelowHeading,
	type HeadingPlacement,
	type PinnedHeading,
} from './stickyHeading';
import {
	buildHistoryRows,
	groupIdForVersion,
	isHistoryRow,
	listContainsId,
} from './versionHistoryRows';
import VersionHistoryGroup from './VersionHistoryGroup.vue';
import VersionHistoryHeading from './VersionHistoryHeading.vue';
import VersionHistoryItem from './VersionHistoryItem.vue';
import { useI18n } from '../../composables/useI18n';
import { N8nListbox } from '../N8nListbox';
import N8nLoading from '../N8nLoading/Loading.vue';
import N8nRecycleScroller from '../N8nRecycleScroller';

defineOptions({ name: 'N8nVersionHistory' });

const props = withDefaults(defineProps<VersionHistoryProps>(), {
	items: () => [],
	loading: false,
	hasMore: false,
	loadingMore: false,
	showCompare: true,
});

const emit = defineEmits<{
	/** The user opens a version. */
	select: [id: string];
	/**
	 * The user opens a version with Command or Control held.
	 * The open version stays the same.
	 */
	selectSeparate: [id: string];
	/** The user compares a version. */
	compare: [id: string];
	/** The user chooses an action from a version menu. */
	action: [value: VersionHistoryActionPayload];
	/** The user opens or closes a group. */
	toggle: [value: VersionHistoryTogglePayload];
	/** The end of the list is near the bottom of the scroll area and more versions can be loaded. */
	loadMore: [];
}>();

defineSlots<{
	/** Content shown when the list is empty. The panel centers it. */
	empty?: () => unknown;
	/** Replaces the compare control and the menu. Receives the row. */
	actions?: (props: { item: VersionHistoryRow }) => unknown;
	/** Replaces the heading label. The pinned copy uses the same slot. */
	heading?: (props: { id: string; label: string }) => unknown;
	/** Content after the last row. It scrolls with the list. */
	footer?: () => unknown;
}>();

const SKELETON_ROWS = [
	{ title: '42%', meta: '68%' },
	{ title: '28%', meta: '52%' },
	{ title: '36%', meta: '60%' },
] as const;

// The scroller measures each row and replaces this estimate.
// The estimate covers the gap between marks and two lines of text.
const ESTIMATED_ROW_HEIGHT = 48;

// Fixed list behavior for the version rows.
const listboxProps = {
	// One version stays open. A second activation keeps that version.
	selectionBehavior: 'replace' as const,
	// Pointer movement moves the highlight. Arrow keys take it from the row under the pointer.
	highlightOnHover: true,
	// Up and down move between rows.
	orientation: 'vertical' as const,
};

const { t } = useI18n();
const expandedIds = ref<Set<string>>(new Set());
// Used only when the parent omits selectedId. The default applies on first render.
const uncontrolledSelectedId = ref<string | undefined>(props.defaultSelectedId);
const scrollerRef = ref<{
	$el?: Element;
	scrollTo: (position: number, behavior?: ScrollBehavior) => void;
	getItemOffset: (key: string) => number | undefined;
	getItemSize: (key: string) => number | undefined;
} | null>(null);
const loadMoreSentinel = ref<HTMLElement | null>(null);
const listScrollTop = ref(0);
// Measured scrollbar thickness. Keeps the pin off the scrollbar.
const scrollbarWidth = ref(0);
const pinned = ref<PinnedHeading | undefined>();
// The latest row the parent asked to show. Cleared after the scroll runs.
const pendingScrollId = ref<string | undefined>();

const listLabel = computed(() => props.label ?? t('versionHistory.label'));
const loadingLabel = computed(() => props.loadingLabel ?? t('versionHistory.loading'));
const loadingMoreLabel = computed(() => props.loadingMoreLabel ?? t('versionHistory.loadingMore'));
// The scroller root is the scrollport. The sentinel sits in its footer.
const scrollRoot = computed(() => {
	const element = scrollerRef.value?.$el ?? null;
	return element instanceof HTMLElement ? element : null;
});

// One request at a time. The parent sets loadingMore, then appends the page.
const loadRequested = ref(false);

function requestMore() {
	if (loadRequested.value || !props.hasMore || props.loadingMore || props.loading) return;
	loadRequested.value = true;
	emit('loadMore');
}

// The end marker is short. Start the next page while two rows are still below the fold.
function maybeLoadMore() {
	const element = scrollRoot.value;
	if (!element) return;
	const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
	if (distance <= ESTIMATED_ROW_HEIGHT * 2) requestMore();
}

const { observe: observeForLoadMore, disconnect } = useIntersectionObserver({
	root: scrollRoot,
	threshold: 0.01,
	onIntersect: () => {
		requestMore();
	},
});

// The observer stops after one intersection. Watch again when the page changes.
watch(
	[
		loadMoreSentinel,
		scrollRoot,
		() => props.hasMore,
		() => props.loadingMore,
		() => props.loading,
		() => props.items.length,
	],
	([sentinel, root, hasMore, loadingMore, loading]) => {
		if (sentinel && root && hasMore && !loadingMore && !loading) {
			observeForLoadMore(sentinel);
			return;
		}
		disconnect();
	},
	{ flush: 'post' },
);

watch(
	() => props.loadingMore,
	(loadingMore, wasLoading) => {
		if (!wasLoading || loadingMore) return;
		loadRequested.value = false;
		void nextTick(() => maybeLoadMore());
	},
);

watch(
	() => props.items.length,
	() => {
		loadRequested.value = false;
		void nextTick(() => maybeLoadMore());
	},
);
const activeId = computed(() =>
	props.selectedId !== undefined ? props.selectedId : uncontrolledSelectedId.value,
);

const selectedGroupId = computed(() => groupIdForVersion(props.items, activeId.value));

function openGroup(groupId: string | undefined) {
	if (!groupId || expandedIds.value.has(groupId)) return;
	const next = new Set(expandedIds.value);
	next.add(groupId);
	expandedIds.value = next;
}

// Open the group that contains the selected version. Closing it stays closed
// until the selection moves.
watch(selectedGroupId, (groupId) => openGroup(groupId), { immediate: true });

const rows = computed(() => buildHistoryRows(props.items, expandedIds.value));

function onSelect(id: string | undefined) {
	if (!id) return;
	if (props.selectedId === undefined) {
		uncontrolledSelectedId.value = id;
	}
	emit('select', id);
}

function onAction(id: string, action: string) {
	emit('action', { id, action });
}

function onToggle(id: string) {
	const next = new Set(expandedIds.value);
	const expanded = !next.has(id);
	if (expanded) next.add(id);
	else next.delete(id);
	expandedIds.value = next;
	emit('toggle', { id, expanded });
}

// Command or Control with Enter or Space opens the version without replacing the open one.
// A click with those keys is handled on the row.
function onModifiedActivation(event: KeyboardEvent) {
	if (event.key !== 'Enter' && event.key !== ' ') return;
	if (!event.metaKey && !event.ctrlKey) return;
	if (!(event.target instanceof Element)) return;

	const option = event.target.closest('[role="option"]');
	if (!(option instanceof HTMLElement) || option.hasAttribute('aria-expanded')) return;

	const id = option.dataset.value;
	if (!id) return;

	event.preventDefault();
	event.stopPropagation();
	emit('selectSeparate', id);
}

function onListKeydown(event: KeyboardEvent) {
	onModifiedActivation(event);
	if (event.defaultPrevented) return;
	onGroupKeydown(event);
}

// The listbox handles Left and Right after the row.
// A group handles those keys first.
function onGroupKeydown(event: KeyboardEvent) {
	if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
	if (!(event.target instanceof Element)) return;

	const option = event.target.closest('[role="option"]');
	if (!(option instanceof HTMLElement) || !option.hasAttribute('aria-expanded')) return;

	const expanded = option.getAttribute('aria-expanded') === 'true';
	const rtl = getComputedStyle(option).direction === 'rtl';
	const openKey = rtl ? 'ArrowLeft' : 'ArrowRight';
	const closeKey = rtl ? 'ArrowRight' : 'ArrowLeft';
	const shouldOpen = event.key === openKey && !expanded;
	const shouldClose = event.key === closeKey && expanded;
	if (!shouldOpen && !shouldClose) return;

	const id = option.dataset.value;
	if (!id) return;

	event.preventDefault();
	event.stopPropagation();
	onToggle(id);
}

function headingPlacements(): HeadingPlacement[] {
	const scroller = scrollerRef.value;
	if (!scroller) return [];

	const placements: HeadingPlacement[] = [];
	for (const row of rows.value) {
		if (row.kind !== 'heading') continue;
		const top = scroller.getItemOffset(row.key);
		const height = scroller.getItemSize(row.key);
		if (top === undefined || height === undefined) continue;
		placements.push({ key: row.key, label: row.label, top, height });
	}

	return placements;
}

/** Distance to scroll so the row starts below the heading that covers it. */
function scrollTopFor(id: string): number | undefined {
	const scroller = scrollerRef.value;
	const row = rows.value.find((entry) => entry.key === id);
	if (!scroller || !row) return undefined;

	const top = scroller.getItemOffset(id);
	if (top === undefined) return undefined;

	return scrollTopBelowHeading(headingPlacements(), top, row.kind === 'heading');
}

function flushScroll() {
	const id = pendingScrollId.value;
	if (!id || props.loading) return;
	// Drop a target that is not in the loaded list. Keep it while the list is still empty.
	if (props.items.length > 0 && !listContainsId(props.items, id)) {
		pendingScrollId.value = undefined;
		return;
	}

	const top = scrollTopFor(id);
	if (top === undefined) return;

	scrollerRef.value?.scrollTo(top);
	pendingScrollId.value = undefined;

	// The first scroll uses estimated row heights. A group that just opened
	// is still short. Place the rendered row on the following frame.
	alignScroll(id, 0, 0);
}

const ALIGN_LIMIT = 6;

function scrollerElement(): HTMLElement | undefined {
	const element = scrollerRef.value?.$el;
	return element instanceof HTMLElement ? element : undefined;
}

function rowElement(root: HTMLElement, id: string): HTMLElement | undefined {
	const row = root.querySelector(`[data-row-id="${CSS.escape(id)}"]`);
	return row instanceof HTMLElement ? row : undefined;
}

function headingBefore(row: HTMLElement): HTMLElement | undefined {
	const container = row.closest('.recycle-scroller');
	if (!container) return undefined;

	let heading: HTMLElement | undefined;
	for (const candidate of container.querySelectorAll('[data-row-id]')) {
		if (candidate === row) return heading;
		if (!(candidate instanceof HTMLElement)) continue;
		if (candidate.querySelector('[data-test-id="version-history-heading"]')) heading = candidate;
	}

	return heading;
}

/** Distance from the scroller top to where this row should start. */
function rowClearance(row: HTMLElement, root: HTMLElement, isHeading: boolean): number {
	if (isHeading) return 0;

	const rootTop = root.getBoundingClientRect().top;
	const heading = headingBefore(row);
	if (heading) {
		const bottom = heading.getBoundingClientRect().bottom - rootTop;
		if (bottom > 1) return bottom;
	}

	const panel = root.closest('[data-test-id="version-history"]');
	const pin = panel?.querySelector('[data-test-id="version-history-sticky-heading"]');
	if (pin instanceof HTMLElement && pin.offsetHeight > 0) return pin.offsetHeight;

	return 0;
}

/** Move the scroll so the rendered row sits below its heading. Returns false when it is already there. */
function nudgeToward(id: string): boolean {
	const scroller = scrollerRef.value;
	const root = scrollerElement();
	if (!scroller || !root || root.clientHeight === 0) return false;

	const row = rowElement(root, id);
	if (!row) {
		const cached = scrollTopFor(id);
		if (cached === undefined) return false;
		const before = listScrollTop.value;
		const direction = cached >= before ? 1 : -1;
		scroller.scrollTo(before + direction * root.clientHeight);
		return listScrollTop.value !== before;
	}

	const historyRow = rows.value.find((entry) => entry.key === id);
	if (!historyRow) return false;

	const offset = row.getBoundingClientRect().top - root.getBoundingClientRect().top;
	const delta = offset - rowClearance(row, root, historyRow.kind === 'heading');
	if (Math.abs(delta) <= 1) return false;

	const before = listScrollTop.value;
	scroller.scrollTo(before + delta);
	return listScrollTop.value !== before;
}

function alignScroll(id: string, attempt: number, stable: number) {
	requestAnimationFrame(() => {
		void nextTick(() => {
			if (pendingScrollId.value) return;
			// Row heights settle a frame after the list opens a group.
			// Wait for two frames with no movement before stopping.
			const nextStable = nudgeToward(id) ? 0 : stable + 1;
			if (nextStable >= 2 || attempt >= ALIGN_LIMIT) return;
			alignScroll(id, attempt + 1, nextStable);
		});
	});
}

/** Scroll a row into view. A group that contains the id opens first. A heading above the row stays in view. */
function scrollTo(id: string) {
	pendingScrollId.value = id;
	openGroup(groupIdForVersion(props.items, id));
	void nextTick(() => flushScroll());
}

// The open version and the scroll target are separate.
// A click in the list must not move the scroll position.
watch(
	() => props.scrollToId,
	(id, previous) => {
		if (id) {
			scrollTo(id);
			return;
		}
		if (previous && pendingScrollId.value === previous) {
			pendingScrollId.value = undefined;
		}
	},
	{ immediate: true },
);

function updatePinnedHeading() {
	const scroller = scrollerRef.value;
	const element = scroller?.$el;
	if (element instanceof HTMLElement) {
		scrollbarWidth.value = Math.max(0, element.offsetWidth - element.clientWidth);
	}

	if (!scroller) {
		pinned.value = undefined;
		return;
	}

	pinned.value = pinnedHeading(headingPlacements(), listScrollTop.value);
}

function onListScroll(top: number) {
	listScrollTop.value = top;
	updatePinnedHeading();
	maybeLoadMore();
}

const pinClipStyle = computed(() => {
	if (!pinned.value) return undefined;

	return {
		// The clip matches the measured heading row. The value comes from layout, not a token.
		height: `${pinned.value.height}px`,
		// The scrollbar sits in the scroller. This inset keeps the pin off it.
		insetInlineEnd: scrollbarWidth.value > 0 ? `${scrollbarWidth.value}px` : undefined,
	};
});

const pinShiftStyle = computed(() => {
	if (!pinned.value || pinned.value.offset === 0) return undefined;

	return {
		transform: `translateY(${pinned.value.offset}px)`,
	};
});

watch(rows, () => {
	void nextTick(() => updatePinnedHeading());
	if (!pendingScrollId.value) return;
	void nextTick(() => flushScroll());
});

watch(
	() => props.loading,
	(loading) => {
		if (loading || !pendingScrollId.value) return;
		void nextTick(() => flushScroll());
	},
);

onMounted(() => {
	void nextTick(() => flushScroll());
});

defineExpose({ scrollTo });
</script>

<template>
	<section
		:class="$style.panel"
		data-test-id="version-history"
		:aria-label="!loading && !rows.length ? listLabel : undefined"
		:aria-busy="loading ? 'true' : undefined"
	>
		<div
			v-if="pinned && !loading && rows.length"
			:class="$style.pin"
			:style="pinClipStyle"
			data-test-id="version-history-sticky-heading"
			aria-hidden="true"
		>
			<div :class="[$style.row, $style.headingRow, $style.pinHeading]" :style="pinShiftStyle">
				<VersionHistoryHeading :label="pinned.label">
					<slot v-if="$slots.heading" name="heading" :id="pinned.key" :label="pinned.label" />
				</VersionHistoryHeading>
			</div>
		</div>
		<div
			v-if="loading"
			:class="$style.loading"
			role="status"
			aria-live="polite"
			:aria-label="loadingLabel"
			data-test-id="version-history-loading"
		>
			<div
				v-for="(row, index) in SKELETON_ROWS"
				:key="index"
				:class="$style.skeleton"
				aria-hidden="true"
			>
				<span :class="$style.skeletonMark">
					<span :class="$style.skeletonDot">
						<N8nLoading variant="circle" />
					</span>
				</span>
				<span :class="$style.skeletonCopy">
					<span :class="$style.skeletonLine" :style="{ width: row.title }">
						<N8nLoading variant="text" />
					</span>
					<span :class="$style.skeletonLine" :style="{ width: row.meta }">
						<N8nLoading variant="text" />
					</span>
				</span>
			</div>
		</div>

		<!-- The scroller mounts each row in a div, so this list cannot be a ul. -->
		<N8nListbox
			v-else-if="rows.length"
			v-bind="listboxProps"
			:class="$style.list"
			:model-value="activeId"
			:label="listLabel"
			@update:model-value="onSelect"
			@keydown.capture="onListKeydown"
		>
			<N8nRecycleScroller
				ref="scrollerRef"
				:items="rows"
				item-key="key"
				:item-size="ESTIMATED_ROW_HEIGHT"
				@scroll="onListScroll"
			>
				<template #default="{ item }">
					<div
						v-if="isHistoryRow(item)"
						:class="[
							$style.row,
							item.isFirst && $style.first,
							item.isLast && $style.last,
							item.kind === 'heading' && $style.headingRow,
							item.kind === 'heading' && pinned?.key === item.key && $style.pinnedSource,
							!item.connectAbove && !item.isFirst && item.kind !== 'heading' && $style.segmentStart,
						]"
						data-test-id="version-history-row"
						:data-row-id="item.key"
					>
						<!-- The gap sits outside the row content. A heading leaves this gap empty. -->
						<span
							v-if="item.connectAbove"
							:class="$style.gap"
							data-test-id="version-history-line"
							data-segment="gap"
						/>
						<VersionHistoryHeading v-if="item.kind === 'heading'" :label="item.label">
							<slot v-if="$slots.heading" name="heading" :id="item.key" :label="item.label" />
						</VersionHistoryHeading>
						<VersionHistoryItem
							v-else-if="item.kind === 'version'"
							:item="item.item"
							:show-compare="showCompare"
							:connect-above="item.connectAbove"
							:connect-below="item.connectBelow"
							:aria-setsize="rows.length"
							:aria-posinset="item.position"
							@compare="emit('compare', $event)"
							@select-separate="emit('selectSeparate', $event)"
							@action="onAction(item.item.id, $event)"
						>
							<template v-if="$slots.actions" #actions="slotProps">
								<slot name="actions" v-bind="slotProps" />
							</template>
						</VersionHistoryItem>
						<VersionHistoryGroup
							v-else-if="item.kind === 'group'"
							:id="item.groupId"
							:label="item.label"
							:expanded="item.expanded"
							:connect-above="item.connectAbove"
							:connect-below="item.connectBelow"
							:aria-setsize="rows.length"
							:aria-posinset="item.position"
							@toggle="onToggle(item.groupId)"
						/>
					</div>
				</template>
				<template v-if="hasMore || loadingMore || $slots.footer" #footer>
					<div
						v-if="hasMore || loadingMore"
						ref="loadMoreSentinel"
						:class="[$style.loadMore, loadingMore ? $style.loadingMore : $style.sentinel]"
						data-test-id="version-history-load-more"
						:role="loadingMore ? 'status' : undefined"
						:aria-live="loadingMore ? 'polite' : undefined"
						:aria-busy="loadingMore ? 'true' : undefined"
						:aria-hidden="loadingMore ? undefined : 'true'"
						:aria-label="loadingMore ? loadingMoreLabel : undefined"
					>
						<div v-if="loadingMore" :class="$style.skeleton" aria-hidden="true">
							<span :class="$style.skeletonMark">
								<span :class="$style.skeletonDot">
									<N8nLoading variant="circle" />
								</span>
							</span>
							<span :class="$style.skeletonCopy">
								<span :class="$style.skeletonLine" :style="{ width: '42%' }">
									<N8nLoading variant="text" />
								</span>
								<span :class="$style.skeletonLine" :style="{ width: '68%' }">
									<N8nLoading variant="text" />
								</span>
							</span>
						</div>
					</div>
					<div v-if="$slots.footer" :class="$style.footer" data-test-id="version-history-footer">
						<slot name="footer" />
					</div>
				</template>
			</N8nRecycleScroller>
		</N8nListbox>

		<div v-else :class="$style.empty" data-test-id="version-history-empty">
			<slot name="empty" />
		</div>
	</section>
</template>

<style lang="scss" module>
.panel {
	position: relative;
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	min-width: 0;
	color: var(--color--text);
}

// The pin sits over the list. Overflow hides the heading as the next one pushes it up.
.pin {
	position: absolute;
	z-index: 1;
	inset-block-start: 0;
	inset-inline: 0;
	overflow: hidden;
	pointer-events: none;
}

.pinHeading {
	pointer-events: auto;
	// The parent sets this to the surface behind the list.
	background-color: var(--version-history--heading--color--background, var(--background--surface));
}

// The pin draws this heading. Hide this copy so the two do not stack.
.pinnedSource {
	opacity: 0;
}

.list {
	position: relative;
	// Stay under the pinned heading. A focused row can still paint above the track.
	z-index: 0;
	flex: 1;
	min-height: 0;
}

.row {
	// Shared with the rail so the gap line and the dot use one center.
	--version-history--body-pad: var(--spacing--3xs);
	--version-history--rail-margin: var(--spacing--4xs);
	--version-history--rail-size: var(--spacing--lg);

	// The gap between rows. The timeline line in .gap uses the same length.
	--version-history--row-gap: var(--spacing--3xs);

	position: relative;
	display: block;
	box-sizing: border-box;
	width: 100%;
	padding-top: var(--version-history--row-gap);
	padding-inline: var(--spacing--2xs);
}

.first {
	padding-top: var(--spacing--3xs);
}

.last {
	padding-bottom: var(--spacing--3xs);
}

// Space with no line. The track ends, the heading shows, and the next track starts.
.headingRow {
	padding-top: var(--spacing--2xs);
	padding-bottom: var(--spacing--2xs);
}

// The heading row already holds the space before this track.
.segmentStart {
	padding-top: 0;
}

.gap {
	position: absolute;
	top: 0;
	left: calc(
		var(--spacing--2xs) + var(--version-history--body-pad) + var(--version-history--rail-margin) +
			(var(--version-history--rail-size) / 2)
	);
	width: var(--border-width);
	height: var(--version-history--row-gap);
	transform: translateX(-50%);
	background-color: var(--color--foreground);
	pointer-events: none;
}

.loading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-height: 0;
	padding: var(--spacing--sm) var(--spacing--2xs);
}

.skeleton {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs);
}

.skeletonMark {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--spacing--lg);
}

.skeletonDot {
	display: block;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	overflow: hidden;
	border-radius: 50%;
}

.skeletonCopy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.skeletonLine {
	display: block;
	height: var(--spacing--xs);
	overflow: hidden;
	border-radius: var(--radius--3xs);
}

.skeletonDot,
.skeletonLine {
	:global(.el-skeleton),
	:global(.el-skeleton__item) {
		width: 100%;
		height: 100%;
		// The shared skeleton fill matches this panel's background, so the rows disappear.
		background: var(--color--neutral-300);
	}

	:global(.el-skeleton.is-animated .el-skeleton__item) {
		background: linear-gradient(
			90deg,
			var(--color--neutral-300) 25%,
			var(--color--neutral-400) 37%,
			var(--color--neutral-300) 63%
		);
		background-size: 400% 100%;
	}
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--4xs);
	flex: 1;
	min-height: 0;
	padding: var(--spacing--lg) var(--spacing--md);
	text-align: center;
}

.loadMore {
	box-sizing: border-box;
}

.sentinel {
	height: var(--spacing--5xs);
}

.loadingMore {
	padding: 0 var(--spacing--2xs) var(--spacing--3xs);
}

.footer {
	padding: var(--spacing--sm) var(--spacing--2xs);
}
</style>
