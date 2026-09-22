<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, useTemplateRef, watch } from 'vue';
import { VisuallyHidden } from 'reka-ui';
import { N8nDialog, N8nDialogHeader } from '../N8nDialog';
import N8nIcon from '../N8nIcon';
import N8nInput from '../N8nInput';
import N8nRecycleScroller from '../N8nRecycleScroller';
import N8nTabs from '../N8nTabs';
import N8nText from '../N8nText';
import N8nIconButton from '../N8nIconButton';

import type { TabOptions } from '../N8nTabs';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useDebounceFn } from '@vueuse/core';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { isInteractiveElementInFocus } from '../../utils';

import CreateWorkflowRow from './CreateWorkflowRow.vue';
import ToolRow from './ToolRow.vue';
import ToolDetailView from './ToolDetailView.vue';
import ToolSettingsView from './ToolSettingsView.vue';
import {
	CATEGORY_BY_KIND,
	hasToolConnection,
	type FlattenedRow,
	type ToolCategoryKey,
	type ToolConnectionItem,
	type ToolConnectionSettings,
} from './types';

const props = withDefaults(
	defineProps<{
		open?: boolean;
		items: ToolConnectionItem[];
		/** Tabs to render, in order. Declared categories show even while empty. */
		categories: ToolCategoryKey[];
		title?: string;
		searchPlaceholder?: string;
		detailItem?: ToolConnectionItem | null;
		detailMode?: 'detail' | 'settings';
		hideBackButton?: boolean;
		allowWorkflowCreation?: boolean;
		workflowCreationLoading?: boolean;
		/** Delay search updates by this number of milliseconds. Search is immediate by default. */
		debounceSearchValue?: number;
	}>(),
	{
		open: false,
		detailItem: null,
		detailMode: 'detail',
		allowWorkflowCreation: false,
		workflowCreationLoading: false,
	},
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	'update:searchQuery': [value: string];
	'update:detailItem': [value: ToolConnectionItem | null];
	disconnect: [item: ToolConnectionItem];
	save: [item: ToolConnectionItem, settings?: ToolConnectionSettings];
	'select-credential': [item: ToolConnectionItem, authType: string, credentialId: string];
	'credential-dropdown-open': [item: ToolConnectionItem];
	'first-credential-connect': [item: ToolConnectionItem];
	'new-credential-connect': [item: ToolConnectionItem];
	'open-detail': [item: ToolConnectionItem];
	connect: [item: ToolConnectionItem];
	'create-workflow': [];
}>();

const i18n = useI18n();
const modalTitle = computed(() => props.title ?? i18n.baseText('tools.connection.title'));
const searchPlaceholder = computed(
	() => props.searchPlaceholder ?? i18n.baseText('tools.connection.search.placeholder'),
);

const ITEM_HEIGHT = 64;

const searchQuery = ref('');
const effectiveSearchQuery = ref('');

function applySearch(value: string) {
	effectiveSearchQuery.value = value;
	emit('update:searchQuery', value);
}

const setDebouncedSearch = useDebounceFn(
	applySearch,
	getDebounceTime(props.debounceSearchValue ?? 0),
);

function updateSearch(value: string) {
	if (props.debounceSearchValue === undefined) {
		applySearch(value);
		return;
	}

	void setDebouncedSearch(value);
}

watch(searchQuery, updateSearch);

const activeCategory = ref<ToolCategoryKey>(props.categories[0] ?? 'connected');
const isMcpCategory = computed(() => activeCategory.value === 'mcp');

const searchInputRef = useTemplateRef('searchInputRef');
const scrollerRef = useTemplateRef('scrollerRef');

function focusSearchInput() {
	void nextTick(() => {
		searchInputRef.value?.focus();
	});
}

/**
 * Search text and active tab live as long as this component, which a consumer
 * mounts for exactly one modal session — so stepping aside for a follow-up
 * dialog leaves them intact. The scroll offset does not survive on its own:
 * the dialog content unmounts while hidden, so carry it across by hand.
 */
const savedScrollTop = ref(0);

watch(
	() => props.open,
	async (isOpen) => {
		if (!isOpen) {
			savedScrollTop.value = scrollerRef.value?.scrollTop ?? 0;
			return;
		}
		focusSearchInput();
		await nextTick();
		scrollerRef.value?.scrollTo(savedScrollTop.value);
	},
);

onMounted(() => {
	if (props.open) {
		focusSearchInput();
	}
});

const hasActiveSearch = computed(() => effectiveSearchQuery.value.length > 0);

function matchesQuery(item: ToolConnectionItem): boolean {
	if (!effectiveSearchQuery.value) return true;
	const query = effectiveSearchQuery.value.toLowerCase();
	return (
		item.title.toLowerCase().includes(query) ||
		(item.description ?? '').toLowerCase().includes(query)
	);
}

const hasConnectedTab = computed(() => props.categories.includes('connected'));

function categoryOf(item: ToolConnectionItem): ToolCategoryKey {
	return item.category ?? CATEGORY_BY_KIND[item.kind];
}

/**
 * "All" ranks connected tools first, then those backed by n8n credits, then the
 * rest — so the most immediately usable tools sit on top. Lower rank sorts first.
 */
function allSortRank(item: ToolConnectionItem): number {
	if (hasToolConnection(item.status)) return 0;
	if (item.freeCredits) return 1;
	return 2;
}

function itemsForCategory(category: ToolCategoryKey): ToolConnectionItem[] {
	// Stable sort keeps each bucket in its original order (Array.sort is stable).
	if (category === 'all') return [...props.items].sort((a, b) => allSortRank(a) - allSortRank(b));
	if (category === 'connected') return props.items.filter((item) => hasToolConnection(item.status));
	return props.items.filter(
		(item) =>
			categoryOf(item) === category &&
			(hasConnectedTab.value ? !hasToolConnection(item.status) : true),
	);
}

const countByCategory = computed<Record<string, number>>(() => {
	const counts: Record<string, number> = {};
	for (const category of props.categories) {
		counts[category] = itemsForCategory(category).filter(matchesQuery).length;
	}
	return counts;
});

/** Past this the exact number stops being useful and starts crowding the tab. */
const MAX_DISPLAYED_COUNT = 99;

/**
 * Every tab states its count, zero included: a bare tab would be ambiguous
 * between "nothing here" and "not loaded yet", and some categories populate
 * asynchronously (project workflows, community previews).
 */
function tabCount(category: ToolCategoryKey): string {
	const count = countByCategory.value[category] ?? 0;
	return count > MAX_DISPLAYED_COUNT ? `${MAX_DISPLAYED_COUNT}+` : String(count);
}

type CreateWorkflowRow = { key: 'create-workflow' };
type NavigableRow = FlattenedRow | CreateWorkflowRow;
type ListRow = NavigableRow | { key: 'suggestion' };

const toolRows = computed<FlattenedRow[]>(() =>
	itemsForCategory(activeCategory.value)
		.filter(matchesQuery)
		.map((item) => ({ key: `item:${item.id}`, item })),
);

const showCreateWorkflowRow = computed(
	() => activeCategory.value === 'workflows' && props.allowWorkflowCreation,
);

const flattenedRows = computed<ListRow[]>(() => {
	const rows: ListRow[] = [...toolRows.value];

	if (showCreateWorkflowRow.value) {
		rows.unshift({ key: 'create-workflow' });
	}

	if (isMcpCategory.value) {
		rows.push({ key: 'suggestion' });
	}

	return rows;
});

function isNavigableRow(row: ListRow): row is NavigableRow {
	return row.key !== 'suggestion';
}

const navigableRows = computed<NavigableRow[]>(() => flattenedRows.value.filter(isNavigableRow));

/** Categories only worth a tab once they hold something. */
const HIDE_WHEN_EMPTY: ToolCategoryKey[] = ['community'];

/**
 * Deliberately independent of the search query, so the tab strip stays put
 * while typing and the counts alone show where the matches are.
 */
const visibleCategories = computed(() =>
	props.categories.filter(
		(category) => !HIDE_WHEN_EMPTY.includes(category) || itemsForCategory(category).length > 0,
	),
);

const tabsVisible = computed(
	() => props.categories.length > 1 && visibleCategories.value.length > 0,
);

async function selectCategory(category: ToolCategoryKey) {
	activeCategory.value = category;
	await nextTick();
	listIndex.value = 0;
	const firstRow = navigableRows.value[0];
	if (firstRow) {
		scrollerRef.value?.scrollToKeyIfNeeded(firstRow.key);
	}
}

const CATEGORY_I18N: Record<ToolCategoryKey, BaseTextKey> = {
	all: 'tools.connection.categories.all',
	connected: 'tools.connection.categories.connected',
	'built-in': 'tools.connection.categories.builtIn',
	mcp: 'tools.connection.categories.mcp',
	ai: 'tools.connection.categories.ai',
	n8n: 'tools.connection.categories.n8n',
	'n8n-connect': 'tools.connection.categories.n8nConnect',
	'app-action': 'tools.connection.categories.appAction',
	community: 'tools.connection.categories.community',
	workflows: 'tools.connection.categories.workflows',
	agents: 'tools.connection.categories.agents',
	data: 'tools.connection.categories.data',
};

function categoryLabel(category: ToolCategoryKey): string {
	return i18n.baseText(CATEGORY_I18N[category]);
}

/**
 * The count rides in the label rather than `tag`, which would render a chip per
 * tab — far louder than a muted number next to the name.
 */
const tabOptions = computed<Array<TabOptions<ToolCategoryKey>>>(() =>
	visibleCategories.value.map((category) => ({
		value: category,
		label: `${categoryLabel(category)} (${tabCount(category)})`,
	})),
);

// The active tab can still disappear — a consumer changing its declared set, or
// a hide-when-empty category losing its last item. Fall back to a tab that
// exists rather than leaving no tab selected.
watch(visibleCategories, (categories) => {
	if (categories.length > 0 && !categories.includes(activeCategory.value)) {
		activeCategory.value = categories[0];
	}
});

watch(effectiveSearchQuery, function resetActiveSearchResult() {
	listIndex.value = 0;
});

const isDefaultView = computed(() => !props.detailItem);

const fixedProps = {
	/** We want a custom position for close button as it breaks horizontal alignment */
	showCloseButton: false,
	/** Use aria-label for screen readers to announce what modal is for. We dont need a visual one. */
	header: undefined,
};

const isListEmpty = computed(() => toolRows.value.length === 0);
const emptyMessage = computed(() => {
	if (hasActiveSearch.value) {
		return i18n.baseText('tools.connection.empty.noResults', {
			interpolate: { query: effectiveSearchQuery.value },
		});
	}
	return i18n.baseText('tools.connection.empty.title');
});

function openDetail(item: ToolConnectionItem) {
	emit('open-detail', item);
	emit('update:detailItem', item);
}

function closeDetail() {
	emit('update:detailItem', null);
}

function handleOpenChange(value: boolean) {
	emit('update:open', value);
	if (!value) {
		closeDetail();
	}
}

const listIndex = ref(0);
const keyboardInstructionsId = useId();
const activeListRow = computed(() => navigableRows.value[listIndex.value]);
const activeToolAnnouncement = computed(() => {
	if (!activeListRow.value) return '';

	const title =
		'item' in activeListRow.value
			? activeListRow.value.item.title
			: i18n.baseText('generic.create.workflow');

	return i18n.baseText('tools.connection.search.activeItem', {
		interpolate: {
			title,
			position: listIndex.value + 1,
			total: navigableRows.value.length,
		},
	});
});

watch(navigableRows, (rows) => {
	listIndex.value = Math.min(listIndex.value, Math.max(rows.length - 1, 0));
});

function isListRowSelected(row: NavigableRow): boolean {
	return navigableRows.value[listIndex.value]?.key === row.key;
}

function handleNavigateListIndex(delta: number) {
	const maxIndex = navigableRows.value.length - 1;
	if (maxIndex < 0) return;

	listIndex.value = Math.min(Math.max(listIndex.value + delta, 0), maxIndex);
	scrollerRef.value?.scrollToKeyIfNeeded(navigableRows.value[listIndex.value].key);
}

function activateActiveListRow() {
	if (!activeListRow.value) return;

	if (!('item' in activeListRow.value)) {
		emit('create-workflow');
		return;
	}

	openDetail(activeListRow.value.item);
}

function onNavigationKeyPress(event: KeyboardEvent) {
	const target = event.target;
	const isSearchInputFocused =
		target instanceof Element &&
		target.closest('[data-test-id="tools-connection-search"]') !== null;

	switch (event.key) {
		case 'Backspace':
			if (isDefaultView.value || isInteractiveElementInFocus()) break;
			event.preventDefault();
			closeDetail();
			focusSearchInput();
			break;
		case 'Enter':
			if (!isDefaultView.value || !activeListRow.value || !isSearchInputFocused) break;
			event.preventDefault();
			activateActiveListRow();
			break;
		case 'ArrowDown':
		case 'ArrowUp':
			if (!isDefaultView.value || (!isSearchInputFocused && isInteractiveElementInFocus())) break;
			event.preventDefault();
			if (event.metaKey) {
				handleNavigateListIndex(
					event.key === 'ArrowDown' ? navigableRows.value.length : -navigableRows.value.length,
				);
				break;
			}
			handleNavigateListIndex(event.key === 'ArrowDown' ? 1 : -1);
			if (!isSearchInputFocused) {
				focusSearchInput();
			}
			break;
		default:
	}
}

let lastPointerPosition: { x: number; y: number } | undefined;

function trackPointerPosition(event: PointerEvent) {
	lastPointerPosition = { x: event.clientX, y: event.clientY };
}

function onPointerMoveListRow(event: PointerEvent, row: NavigableRow) {
	const pointerMoved =
		lastPointerPosition?.x !== event.clientX || lastPointerPosition.y !== event.clientY;

	trackPointerPosition(event);
	if (pointerMoved) {
		listIndex.value = navigableRows.value.findIndex((listRow) => listRow.key === row.key);
	}
}
</script>

<template>
	<N8nDialog
		v-bind="fixedProps"
		size="xlarge"
		:open="open"
		:aria-label="isDefaultView ? modalTitle : detailItem?.title"
		data-test-id="tools-connection-modal"
		:class="$style.modal"
		@keydown="onNavigationKeyPress"
		@pointermove="trackPointerPosition"
		@update:open="handleOpenChange"
	>
		<div :class="$style.body">
			<ToolSettingsView
				v-if="detailItem && detailMode === 'settings'"
				:key="detailItem.id"
				:item="detailItem"
				:hide-back-button="hideBackButton"
				@back="closeDetail"
				@close="handleOpenChange(false)"
				@disconnect="emit('disconnect', $event)"
				@save="(item, settings) => emit('save', item, settings)"
				@select-credential="
					(item, authType, credentialId) => emit('select-credential', item, authType, credentialId)
				"
				@credential-dropdown-open="emit('credential-dropdown-open', $event)"
				@first-credential-connect="emit('first-credential-connect', $event)"
				@new-credential-connect="emit('new-credential-connect', $event)"
			>
				<template v-if="$slots['settings-body']" #body="slotProps">
					<slot name="settings-body" v-bind="slotProps" />
				</template>
			</ToolSettingsView>
			<ToolDetailView
				v-else-if="detailItem"
				:item="detailItem"
				:hide-back-button="hideBackButton"
				@back="closeDetail"
				@close="handleOpenChange(false)"
				@select-credential="
					(item, authType, credentialId) => emit('select-credential', item, authType, credentialId)
				"
				@credential-dropdown-open="emit('credential-dropdown-open', $event)"
				@first-credential-connect="emit('first-credential-connect', $event)"
				@new-credential-connect="emit('new-credential-connect', $event)"
			>
				<template v-if="$slots['detail-body']" #body="slotProps">
					<slot name="detail-body" v-bind="slotProps" />
				</template>
			</ToolDetailView>
			<template v-else>
				<div :class="$style.top">
					<N8nDialogHeader :class="$style.header">
						<N8nText as="h2" step="lg" bold>
							{{ modalTitle }}
						</N8nText>
						<N8nIconButton
							:aria-label="i18n.baseText('generic.close')"
							size="large"
							variant="ghost"
							icon="x"
							@click="handleOpenChange(false)"
						/>
					</N8nDialogHeader>
					<N8nInput
						ref="searchInputRef"
						v-model="searchQuery"
						:placeholder="searchPlaceholder"
						:aria-describedby="keyboardInstructionsId"
						clearable
						data-test-id="tools-connection-search"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nInput>
					<VisuallyHidden :id="keyboardInstructionsId" feature="fully-hidden">
						{{ i18n.baseText('tools.connection.search.keyboardInstructions') }}
					</VisuallyHidden>
					<VisuallyHidden
						feature="fully-hidden"
						role="status"
						aria-live="polite"
						aria-atomic="true"
					>
						{{ activeToolAnnouncement }}
					</VisuallyHidden>
				</div>
				<N8nTabs
					v-if="tabsVisible"
					:model-value="activeCategory"
					:options="tabOptions"
					variant="modern"
					justified
					:class="$style.tabs"
					data-test-id="tools-connection-tabs"
					@update:model-value="selectCategory"
				/>

				<div :class="[$style.listWrapper, isListEmpty ? $style.listWrapperEmpty : null]">
					<template v-if="isListEmpty">
						<CreateWorkflowRow
							v-if="showCreateWorkflowRow"
							:loading="workflowCreationLoading"
							:class="{ [$style.selectedToolRow]: isListRowSelected({ key: 'create-workflow' }) }"
							@pointermove="onPointerMoveListRow($event, { key: 'create-workflow' })"
							@create="emit('create-workflow')"
						/>
						<div :class="$style.empty" data-test-id="tools-connection-empty">
							<N8nText color="text-light">{{ emptyMessage }}</N8nText>
						</div>
						<div v-if="isMcpCategory" :class="$style.suggestionRow">
							<slot name="suggestion-footer" />
						</div>
					</template>
					<N8nRecycleScroller
						v-else
						ref="scrollerRef"
						:items="flattenedRows"
						:item-size="ITEM_HEIGHT"
						item-key="key"
						:class="$style.scroller"
					>
						<template #default="{ item: row }">
							<CreateWorkflowRow
								v-if="row.key === 'create-workflow'"
								:data-active="isListRowSelected(row)"
								:loading="workflowCreationLoading"
								:class="{ [$style.selectedToolRow]: isListRowSelected(row) }"
								@pointermove="onPointerMoveListRow($event, row)"
								@create="emit('create-workflow')"
							/>
							<ToolRow
								v-else-if="'item' in row"
								:item="row.item"
								:data-active="isListRowSelected(row)"
								:class="{ [$style.selectedToolRow]: isListRowSelected(row) }"
								@pointermove="onPointerMoveListRow($event, row)"
								@open-detail="openDetail($event)"
								@connect="emit('connect', $event)"
								@select-credential="
									(item, authType, credentialId) =>
										emit('select-credential', item, authType, credentialId)
								"
								@credential-dropdown-open="emit('credential-dropdown-open', $event)"
								@credential-dropdown-close="focusSearchInput"
								@first-credential-connect="emit('first-credential-connect', $event)"
								@new-credential-connect="emit('new-credential-connect', $event)"
							/>
							<div v-else :class="$style.suggestionRow">
								<slot name="suggestion-footer" />
							</div>
						</template>
					</N8nRecycleScroller>
				</div>
			</template>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
@use '../../css/mixins/mixins';

.modal {
	--n8n-dialog-content--padding: 0;
}

.body {
	display: flex;
	flex-direction: column;
	height: 70vh;
	max-height: 640px;
	min-height: 0;
	padding: 0;
}

.top {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--md);
	padding-block-start: calc(var(--spacing--md) - var(--spacing--4xs));
	padding-block-end: var(--spacing--lg);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-direction: row;
	gap: var(--spacing--4xs);

	button {
		flex-shrink: 0;
		margin-inline-end: calc(var(--spacing--2xs) * -1);
	}
}

.searchInput {
	flex: 1;
}

// N8nTabs owns the tab styling, and the justified strip gives every tab an equal
// slot, so it cannot overflow at this tab count; this only supplies the divider
// and stops the strip shrinking.
.tabs {
	border-bottom: 1px solid var(--border-color);
	flex-shrink: 0;
	overflow: hidden;
}

.listWrapper {
	display: flex;
	flex-direction: column;
	flex: 1 1 0;
	min-height: 0;
	overflow: hidden;
	padding-block-start: var(--spacing--2xs);
}

.listWrapperEmpty {
	padding-inline: var(--spacing--2xs);
}

.scroller {
	height: 100%;
	overflow-y: auto;
	scrollbar-gutter: stable;
	@include mixins.scroll-bar;

	:global(.recycle-scroller-items-wrapper) {
		padding-inline-start: var(--spacing--2xs);
	}
}

.selectedToolRow {
	background: var(--background--hover);
}

.empty {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
	min-height: 200px;
}

.suggestionRow {
	width: 100%;

	&:has(*) {
		margin-top: var(--spacing--sm);
	}
}
</style>
