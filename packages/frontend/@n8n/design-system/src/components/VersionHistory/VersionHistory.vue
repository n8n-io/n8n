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
	buildHistoryRows,
	groupIdForVersion,
	isHistoryRow,
	listContainsId,
	type HistoryRow,
} from './versionHistoryRows';
import VersionHistoryGroup from './VersionHistoryGroup.vue';
import VersionHistoryHeading from './VersionHistoryHeading.vue';
import VersionHistoryItem from './VersionHistoryItem.vue';
import { useI18n } from '../../composables/useI18n';
import { N8nListbox } from '../N8nListbox';
import N8nLoading from '../N8nLoading/Loading.vue';
import N8nRecycleScroller from '../N8nRecycleScroller';
import N8nScrollArea from '../N8nScrollArea';
import N8nSpinner from '../N8nSpinner';

defineOptions({ name: 'VersionHistory' });

const props = withDefaults(defineProps<VersionHistoryProps>(), {
	items: () => [],
	loading: false,
	hasMore: false,
	loadingMore: false,
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

const slots = defineSlots<{
	/** Content shown when the list is empty. The panel centers it. */
	empty?: () => unknown;
	/** Replaces the compare control and the menu. Receives the row. */
	actions?: (props: { item: VersionHistoryRow }) => unknown;
	/** Replaces the heading label. */
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

// The list keeps one version and moves the highlight with the pointer.
// Up and down move between rows. Left and right stay free for a group.
const listboxProps = {
	selectionBehavior: 'replace' as const,
	orientation: 'vertical' as const,
};

const { t } = useI18n();
const expandedIds = ref<Set<string>>(new Set());
// Used only when the parent omits selectedId. The default applies on first render.
const uncontrolledSelectedId = ref<string | undefined>(props.defaultSelectedId);
const scrollerRef = ref<{
	$el?: Element;
	scrollToKey: (key: string) => void;
} | null>(null);
const loadMoreSentinel = ref<HTMLElement | null>(null);
// The latest row the parent asked to show. Cleared after the scroll runs.
const pendingScrollId = ref<string | undefined>();

// The scroller has no slot after the last row. This row carries the end marker
// and the footer so both stay in the scroll height.
const END_ROW_KEY = 'version-history-end';

interface EndRow {
	key: typeof END_ROW_KEY;
	kind: 'end';
}

function isEndRow(value: unknown): value is EndRow {
	return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'end';
}

const listLabel = computed(() => props.label ?? t('versionHistory.label'));
const loadingLabel = computed(() => props.loadingLabel ?? t('versionHistory.loading'));
const loadingMoreLabel = computed(() => props.loadingMoreLabel ?? t('versionHistory.loadingMore'));
// The scroller root is the scrollport. The sentinel is the last row.
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

const showEnd = computed(() => props.hasMore || props.loadingMore || Boolean(slots.footer));

const scrollerItems = computed((): Array<HistoryRow | EndRow> => {
	if (!showEnd.value) return rows.value;

	return [...rows.value, { key: END_ROW_KEY, kind: 'end' }];
});

function onSelect(id: string | undefined) {
	if (!id) return;
	if (props.selectedId === undefined) {
		uncontrolledSelectedId.value = id;
	}
	emit('select', id);
}

function onAction(itemId: string, actionId: string) {
	emit('action', { itemId, actionId });
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

// A menu opened from a row sits outside the list.
// Keep the row highlighted while that menu has focus.
function onListFocusOut(event: FocusEvent) {
	const next = event.relatedTarget;
	if (!(next instanceof Element) || !next.closest('[role="menu"]')) return;
	event.stopPropagation();
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

function flushScroll() {
	const id = pendingScrollId.value;
	if (!id || props.loading) return;
	// Drop a target that is not in the loaded list. Keep it while the list is still empty.
	if (props.items.length > 0 && !listContainsId(props.items, id)) {
		pendingScrollId.value = undefined;
		return;
	}

	// The row is missing until its group opens. Keep the request for the next pass.
	if (!rows.value.some((row) => row.key === id)) return;

	const scroller = scrollerRef.value;
	if (!scroller) return;

	scroller.scrollToKey(id);
	pendingScrollId.value = undefined;
}

/** Scroll a row into view. A group that contains the id opens first. */
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

function onListScroll() {
	maybeLoadMore();
}

watch(rows, () => {
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
		<N8nScrollArea
			v-else-if="rows.length"
			:class="$style.scroll"
			edge-fade="y"
			:enable-vertical-scroll="false"
		>
			<N8nListbox
				v-bind="listboxProps"
				:class="$style.list"
				:model-value="activeId"
				:label="listLabel"
				@update:model-value="onSelect"
				@keydown.capture="onListKeydown"
				@focusout.capture="onListFocusOut"
			>
				<N8nRecycleScroller
					ref="scrollerRef"
					:items="scrollerItems"
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
								!item.connectAbove &&
									!item.isFirst &&
									item.kind !== 'heading' &&
									$style.segmentStart,
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
						<div v-else-if="isEndRow(item)" :class="$style.end">
							<div
								v-if="hasMore || loadingMore"
								ref="loadMoreSentinel"
								:class="[$style.loadMore, !loadingMore && $style.sentinel]"
								data-test-id="version-history-load-more"
								:role="loadingMore ? 'status' : undefined"
								:aria-live="loadingMore ? 'polite' : undefined"
								:aria-busy="loadingMore ? 'true' : undefined"
								:aria-hidden="loadingMore ? undefined : 'true'"
								:aria-label="loadingMore ? loadingMoreLabel : undefined"
							>
								<div v-if="loadingMore" :class="$style.loader">
									<N8nSpinner type="grid" size="small" aria-hidden="true" />
								</div>
							</div>
							<div
								v-if="$slots.footer"
								:class="$style.footer"
								data-test-id="version-history-footer"
							>
								<slot name="footer" />
							</div>
						</div>
					</template>
				</N8nRecycleScroller>
			</N8nListbox>
		</N8nScrollArea>

		<div v-else :class="$style.empty" data-test-id="version-history-empty">
			<slot name="empty" />
		</div>
	</section>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	min-width: 0;
	color: var(--color--text);
}

.scroll {
	flex: 1;
	min-height: 0;

	// The list fills the frame. The scroller inside it scrolls.
	:global([data-reka-scroll-area-viewport]) {
		position: relative;
	}
}

.list {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	min-height: 0;
	min-width: 0;
	// The rows draw their own gap. Listbox padding would move the timeline.
	--n8n-listbox--gap: 0;
	--n8n-listbox-item--padding: 0;
	--n8n-listbox-item--min-height: 0;
	// The timeline uses the foreground line. The default active fill hides that line.
	--n8n-listbox-item--color--background--selected: var(--background--hover);

	// CSS modules ignore :deep(). :global() reaches the listbox and the scroller.
	// The scroller's minimum height is the full list, so the frame clips it.
	:global([role='listbox']) {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		min-width: 0;
		overflow: hidden;
	}

	:global(.recycle-scroller-wrapper) {
		min-height: 0;
	}
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
	width: 1px;
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

.end {
	width: 100%;
}

.loadMore {
	box-sizing: border-box;
	width: 100%;
}

.sentinel {
	height: var(--spacing--5xs);
}

.loader {
	display: flex;
	justify-content: center;
	width: 100%;
	padding: var(--spacing--xs) 0;
}

.footer {
	padding: var(--spacing--sm) var(--spacing--2xs);
}
</style>
