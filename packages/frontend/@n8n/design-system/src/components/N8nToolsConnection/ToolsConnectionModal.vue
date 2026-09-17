<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, useTemplateRef, watch } from 'vue';
import { VisuallyHidden } from 'reka-ui';
import { N8nDialog, type DialogSize } from '../N8nDialog';
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

type PickerCreateAction = {
	category: ToolCategoryKey;
	label: string;
	description?: string;
	testId?: string;
};

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
		/** Dialog width. Consumers with more tabs (e.g. the n8n Connect section) can widen it. */
		size?: DialogSize;
		createAction?: PickerCreateAction;
		createActionLoading?: boolean;
		emptyMessage?: string;
		noResultsMessage?: string;
		/** Render only the modal body when an owning feature supplies the dialog shell. */
		embedded?: boolean;
		showConnectActions?: boolean;
		/** Keep the list scrollbar visible instead of revealing it on hover. */
		persistentScrollbar?: boolean;
		connectLabel?: (item: ToolConnectionItem) => string;
		connectAriaLabel?: (item: ToolConnectionItem) => string;
		connectedLabel?: (item: ToolConnectionItem) => string;
		/** Delay search updates by this number of milliseconds. Search is immediate by default. */
		debounceSearchValue?: number;
	}>(),
	{
		open: false,
		detailItem: null,
		detailMode: 'detail',
		size: 'xlarge',
		createAction: undefined,
		createActionLoading: false,
		emptyMessage: undefined,
		noResultsMessage: undefined,
		embedded: false,
		showConnectActions: false,
		persistentScrollbar: false,
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
	create: [];
}>();

const i18n = useI18n();
const modalTitle = computed(() => props.title ?? i18n.baseText('tools.connection.title'));
const containerComponent = computed(() => (props.embedded ? 'div' : N8nDialog));
const containerProps = computed(() =>
	props.embedded
		? {}
		: {
				open: props.open,
				size: props.size,
				...fixedProps,
				'aria-label': modalTitle.value,
			},
);
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

const normalizedSearchQuery = computed(() => effectiveSearchQuery.value.trim());
const hasActiveSearch = computed(() => normalizedSearchQuery.value.length > 0);

function matchesQuery(item: ToolConnectionItem): boolean {
	if (!normalizedSearchQuery.value) return true;
	const query = normalizedSearchQuery.value.toLowerCase();
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

type ListRow = FlattenedRow | { key: 'suggestion' };

const toolRows = computed<FlattenedRow[]>(() =>
	itemsForCategory(activeCategory.value)
		.filter(matchesQuery)
		.map((item) => ({ key: `item:${item.id}`, item })),
);

const flattenedRows = computed<ListRow[]>(() =>
	isMcpCategory.value ? [...toolRows.value, { key: 'suggestion' }] : toolRows.value,
);

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

const fixedProps = {
	/** We want a custom position for close button as it breaks horizontal alignment */
	showCloseButton: false,
	/** Use aria-label for screen readers to announce what modal is for. We dont need a visual one. */
	header: undefined,
};

const isListEmpty = computed(() => toolRows.value.length === 0);
const resolvedEmptyMessage = computed(() => {
	if (hasActiveSearch.value) {
		if (props.noResultsMessage) return props.noResultsMessage;
		return i18n.baseText('tools.connection.empty.noResults', {
			interpolate: { query: normalizedSearchQuery.value },
		});
	}
	return props.emptyMessage ?? i18n.baseText('tools.connection.empty.title');
});
const showCreateAction = computed(() => props.createAction?.category === activeCategory.value);

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
const activeToolRow = computed(() => toolRows.value[listIndex.value]);
const activeToolAnnouncement = computed(() => {
	if (!activeToolRow.value) return '';

	return i18n.baseText('tools.connection.search.activeItem', {
		interpolate: {
			title: activeToolRow.value.item.title,
			position: listIndex.value + 1,
			total: toolRows.value.length,
		},
	});
});

watch(toolRows, (rows) => {
	listIndex.value = Math.min(listIndex.value, Math.max(rows.length - 1, 0));
});

watch(effectiveSearchQuery, function resetActiveSearchResult() {
	listIndex.value = 0;
});

function isToolRowSelected(index: number): boolean {
	return listIndex.value === index;
}

function handleNavigateListIndex(delta: number) {
	const maxIndex = toolRows.value.length - 1;
	if (maxIndex < 0) return;

	listIndex.value = Math.min(Math.max(listIndex.value + delta, 0), maxIndex);
	scrollerRef.value?.scrollToKeyIfNeeded(toolRows.value[listIndex.value].key);
}

function onNavigationKeyPress(event: KeyboardEvent) {
	const isDefaultView = !props.detailItem;
	const target = event.target;
	const isSearchInputFocused =
		target instanceof Element &&
		target.closest('[data-test-id="tools-connection-search"]') !== null;

	switch (event.key) {
		case 'Backspace':
			if (isDefaultView || isInteractiveElementInFocus()) break;
			event.preventDefault();
			closeDetail();
			focusSearchInput();
			break;
		case 'Enter':
			if (!isDefaultView || !activeToolRow.value || !isSearchInputFocused) break;
			event.preventDefault();
			openDetail(activeToolRow.value.item);
			break;
		case 'ArrowDown':
		case 'ArrowUp':
			if (!isDefaultView) break;
			event.preventDefault();
			if (event.metaKey) {
				handleNavigateListIndex(
					event.key === 'ArrowDown' ? toolRows.value.length : -toolRows.value.length,
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

function onPointerMoveToolRow(event: PointerEvent, index: number) {
	const pointerMoved =
		lastPointerPosition?.x !== event.clientX || lastPointerPosition.y !== event.clientY;

	trackPointerPosition(event);
	if (pointerMoved) listIndex.value = index;
}

function toolRowIndex(row: FlattenedRow): number {
	return toolRows.value.findIndex((toolRow) => toolRow.key === row.key);
}
</script>

<template>
	<component
		:is="containerComponent"
		v-bind="containerProps"
		data-test-id="tools-connection-modal"
		:class="[$style.modal, props.embedded && $style.embedded]"
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
				<div :class="$style.header">
					<N8nInput
						ref="searchInputRef"
						v-model="searchQuery"
						:placeholder="searchPlaceholder"
						:aria-describedby="keyboardInstructionsId"
						clearable
						data-test-id="tools-connection-search"
						:class="$style.searchInput"
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
					<N8nIconButton
						v-if="!embedded"
						:aria-label="i18n.baseText('generic.close')"
						size="large"
						variant="ghost"
						icon="x"
						@click="handleOpenChange(false)"
					/>
				</div>

				<N8nTabs
					v-if="tabsVisible"
					:model-value="activeCategory"
					:options="tabOptions"
					size="small"
					variant="modern"
					justified
					:class="$style.tabs"
					data-test-id="tools-connection-tabs"
					@update:model-value="selectCategory"
				/>

				<button
					v-if="showCreateAction && createAction"
					type="button"
					:class="$style.createRow"
					:disabled="createActionLoading"
					:aria-busy="createActionLoading"
					:data-test-id="createAction.testId ?? 'tools-connection-create'"
					@click="emit('create')"
				>
					<span :class="$style.createIcon" aria-hidden="true">
						<N8nIcon
							:icon="createActionLoading ? 'loader-circle' : 'plus'"
							:size="20"
							:spin="createActionLoading"
						/>
					</span>
					<span :class="$style.createText">
						<N8nText tag="span" bold>
							{{ createAction.label }}
						</N8nText>
						<N8nText v-if="createAction.description" tag="span" size="small" color="text-light">
							{{ createAction.description }}
						</N8nText>
					</span>
				</button>

				<div :class="$style.listWrapper">
					<template v-if="isListEmpty">
						<div :class="$style.empty" data-test-id="tools-connection-empty">
							<N8nText color="text-light">{{ resolvedEmptyMessage }}</N8nText>
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
						:class="[$style.scroller, persistentScrollbar && $style.persistentScrollbar]"
					>
						<template #default="{ item: row }">
							<ToolRow
								v-if="'item' in row"
								:item="row.item"
								:show-connect-action="props.showConnectActions"
								:connect-label="props.connectLabel?.(row.item)"
								:connect-aria-label="props.connectAriaLabel?.(row.item)"
								:connected-label="props.connectedLabel?.(row.item)"
								:data-active="isToolRowSelected(toolRowIndex(row))"
								:class="{ [$style.selectedToolRow]: isToolRowSelected(toolRowIndex(row)) }"
								@pointermove="onPointerMoveToolRow($event, toolRowIndex(row))"
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
	</component>
</template>

<style lang="scss" module>
@use '../../css/mixins/mixins';
@use '../../css/mixins/focus';

.modal {
	--n8n-dialog-content--padding: 0;
}

.body {
	display: flex;
	flex-direction: column;
	height: 70vh;
	max-height: calc(var(--height--5xl) * 6);
	min-height: 0;
	padding: 0;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--md);

	button {
		flex-shrink: 0;
		margin-inline-end: calc(var(--spacing--2xs) * -1);
	}
}

.embedded {
	height: 100%;
	min-height: 0;

	.body {
		height: min(60dvh, calc(var(--height--5xl) * 5));
		max-height: 100%;
	}

	.header {
		padding: 0;
	}

	.searchInput {
		margin-top: 0;
		margin-bottom: var(--spacing--lg);
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

.createRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	height: 64px;
	padding: var(--spacing--2xs) var(--spacing--xs);
	margin-inline: var(--spacing--2xs);
	border: 0;
	border-radius: var(--radius);
	background: none;
	color: inherit;
	text-align: left;
	cursor: pointer;
	flex-shrink: 0;

	&:hover:not(:disabled) {
		background: var(--background--hover);
	}

	&:focus-visible {
		@include focus.focus-ring-inset;
	}

	&:disabled {
		cursor: default;
	}
}

.createIcon {
	flex-shrink: 0;
	width: var(--height--xl);
	height: var(--height--xl);
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color--primary);
	background-color: var(--color--orange-alpha-100);
	border-radius: var(--radius--full);
}

.createText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1 1 0;
	min-width: 0;
	font-weight: var(--font-weight--medium);
}

.listWrapper {
	display: flex;
	flex-direction: column;
	flex: 1 1 0;
	min-height: 0;
	overflow: hidden;
	padding-block-start: var(--spacing--2xs);
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

.persistentScrollbar {
	@include mixins.scroll-bar;
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
