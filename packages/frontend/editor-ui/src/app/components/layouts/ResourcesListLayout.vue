<script lang="ts" setup generic="ResourceType extends Resource = Resource">
import { computed, nextTick, ref, onMounted, watch, onBeforeUnmount, provide } from 'vue';

import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import PageViewLayoutList from '@/app/components/layouts/PageViewLayoutList.vue';
import ResourceListHeader from '@/app/components/layouts/ResourceListHeader.vue';
import ResourceListSkeleton from '@/app/components/layouts/ResourceListSkeleton.vue';
import {
	type ResourceListColumn,
	ResourceListColumnsKey,
} from '@/app/components/layouts/resourceListColumns';
import { ResourceListToolbarTargetKey } from '@/app/components/layouts/resourceListToolbar';
import ResourceFiltersDropdown from '@/app/components/forms/ResourceFiltersDropdown.vue';
import ResourcesListEmptyState, {
	isEmptyStateResourceKey,
} from '@/app/components/layouts/ResourcesListEmptyState.vue';
import type { DatatableColumn } from '@n8n/design-system';
import { useDebounce } from '@n8n/composables/useDebounce';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRoute, useRouter } from 'vue-router';
import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';

import type { BaseFilters, Resource, SortingAndPaginationUpdates } from '@/Interface';
import { isSharedResource, isResourceSortableByDate } from '@/app/utils/typeGuards';
import { type LocalStorageTabKey, useN8nLocalStorage } from '@/app/composables/useN8nLocalStorage';
import { useResourcesListI18n } from '@/app/composables/useResourcesListI18n';

import {
	N8nButton,
	N8nDatatable,
	N8nDropdownMenu,
	N8nTooltip,
	type DropdownMenuItemProps,
	N8nIcon,
	N8nInfoTip,
	N8nInput,
	N8nLink,
	N8nRecycleScroller,
	N8nText,
	getScrollParent,
} from '@n8n/design-system';
type UIConfig = {
	searchEnabled: boolean;
	showFiltersDropdown: boolean;
	sortEnabled: boolean;
};

const route = useRoute();
const router = useRouter();
const { callDebounced } = useDebounce();
const telemetry = useTelemetry();
const n8nLocalStorage = useN8nLocalStorage();

const props = withDefaults(
	defineProps<{
		resourceKey: string;
		displayName?: (resource: ResourceType) => string;
		resources: ResourceType[];
		disabled: boolean;
		initialize?: () => Promise<void>;
		filters?: BaseFilters;
		additionalFiltersHandler?: (
			resource: ResourceType,
			filters: BaseFilters,
			matches: boolean,
		) => boolean;
		shareable?: boolean;
		sortFns?: Record<string, (a: ResourceType, b: ResourceType) => number>;
		sortOptions?: string[];
		/**
		 * - `list-full`: the component gets every resource, and sorts and filters them
		 * - `list-paginated`: the parent fetches the resources in batches, and appends the next
		 *   batch on `load-more`
		 */
		type?: 'datatable' | 'list-full' | 'list-paginated';
		typeProps: { itemSize: number } | { columns: DatatableColumn[] };
		loading: boolean;
		customPageSize?: number;
		totalItems?: number;
		resourcesRefreshing?: boolean;
		// Set to true if sorting and filtering is done outside of the component
		dontPerformSortingAndFiltering?: boolean;
		hasEmptyState?: boolean;
		uiConfig?: UIConfig;
		tabKey?: LocalStorageTabKey;
		persistKeyExclusions?: string[];
		/** Show the list as columns under a header. The row cells must use the same keys */
		listColumns?: ResourceListColumn[];
	}>(),
	{
		displayName: (resource: ResourceType) => resource.name || '',
		initialize: async () => {},
		filters: () => ({ search: '', homeProject: '' }),
		sortFns: () => ({}),
		sortOptions: () => ['lastUpdated', 'lastCreated', 'nameAsc', 'nameDesc'],
		type: 'list-full',
		typeProps: () => ({ itemSize: 80 }),
		loading: true,
		additionalFiltersHandler: undefined,
		shareable: true,
		customPageSize: 25,
		totalItems: 0,
		dontPerformSortingAndFiltering: false,
		resourcesRefreshing: false,
		hasEmptyState: true,
		uiConfig: () => ({
			searchEnabled: true,
			showFiltersDropdown: true,
			sortEnabled: true,
		}),
		tabKey: 'workflows',
		persistKeyExclusions: () => [],
		listColumns: undefined,
	},
);

provide(
	ResourceListColumnsKey,
	computed(() => props.listColumns),
);

// The page header can host search, sort and filters in its tab row. Without one, they show above the list.
const toolbarTarget = ref<HTMLElement | null>(null);
provide(ResourceListToolbarTargetKey, (element) => {
	toolbarTarget.value = element;
});

const { getResourceText } = useResourcesListI18n(props.resourceKey);

const sortBy = ref(props.sortOptions[0]);
const hasFilters = ref(false);
const currentPage = ref(1);
const rowsPerPage = ref<number>(props.customPageSize);
const resettingFilters = ref(false);
const search = ref<HTMLElement | null>(null);
const listWrapperRef = ref<HTMLElement | null>(null);

// Preferred sorting, set by the user and preserved in local storage
const preferredSort = ref<string>(props.sortOptions[0]);

const emit = defineEmits<{
	'update:filters': [value: BaseFilters];
	'click:add': [event: Event];
	'update:pagination-and-sort': [value: SortingAndPaginationUpdates];
	'update:search': [value: string];
	/** The user scrolled near the end of a `list-paginated` list that has more resources */
	'load-more': [];
}>();

const slots = defineSlots<{
	header(): unknown;
	empty(): unknown;
	preamble(): unknown;
	postamble(): unknown;
	postdata(): unknown;
	'add-button'(): unknown;
	callout(): unknown;
	filters(props: {
		filters: Record<string, boolean | string | string[]>;
		setKeyValue: (key: string, value: unknown) => void;
	}): unknown;
	default(props: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data: any;
		columns?: DatatableColumn[];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		updateItemSize?: (data: any) => void;
	}): unknown;
	item(props: { item: unknown; index: number }): unknown;
	breadcrumbs(): unknown;
}>();

//computed
const filtersModel = computed({
	get: () => props.filters,
	set: (newValue) => emit('update:filters', newValue),
});

const showEmptyState = computed(() => {
	return (
		props.hasEmptyState &&
		props.resources.length === 0 &&
		// Don't show empty state if resources are refreshing or if filters are being set
		!hasFilters.value &&
		!filtersModel.value.search &&
		!props.resourcesRefreshing
	);
});

// Skeleton instead of list chrome while a refresh is deciding whether an
// unfiltered list is empty — prevents a chrome flash before the empty state.
const showLoadingState = computed(() => {
	return (
		props.loading ||
		(props.resourcesRefreshing &&
			props.resources.length === 0 &&
			!hasFilters.value &&
			!filtersModel.value.search)
	);
});

const sortMenuItems = computed<Array<DropdownMenuItemProps<string>>>(() =>
	props.sortOptions.map((sortOption) => ({
		id: sortOption,
		label: getResourceText(`sort.${sortOption}`, `sort.${sortOption}`),
		checked: sortOption === sortBy.value,
		testId: 'resources-list-sort-item',
	})),
);

const currentSortLabel = computed(() =>
	getResourceText(`sort.${sortBy.value}`, `sort.${sortBy.value}`),
);

const filterKeys = computed(() => {
	return Object.keys(filtersModel.value);
});

const filteredAndSortedResources = computed((): ResourceType[] => {
	if (props.dontPerformSortingAndFiltering) {
		return props.resources;
	}
	const filtered = props.resources.filter((resource) => {
		let matches = true;

		if (filtersModel.value.homeProject && isSharedResource(resource)) {
			matches =
				matches &&
				!!(
					'homeProject' in resource &&
					resource.homeProject &&
					resource.homeProject.id === filtersModel.value.homeProject
				);
		}

		if (filtersModel.value.search) {
			const searchString = filtersModel.value.search.toLowerCase();
			matches = matches && props.displayName(resource).toLowerCase().includes(searchString);
		}

		if (props.additionalFiltersHandler) {
			matches = props.additionalFiltersHandler(resource, filtersModel.value, matches);
		}

		return matches;
	});

	return filtered.sort((a, b) => {
		const sortableByDate = isResourceSortableByDate(a) && isResourceSortableByDate(b);
		switch (sortBy.value) {
			case 'lastUpdated':
				if (!sortableByDate) {
					return 0;
				}

				if ('updatedAt' in a && 'updatedAt' in b) {
					return props.sortFns.lastUpdated
						? props.sortFns.lastUpdated(a, b)
						: new Date(b.updatedAt ?? '').valueOf() - new Date(a.updatedAt ?? '').valueOf();
				}

				return 0;

			case 'lastCreated':
				if (!sortableByDate) {
					return 0;
				}

				if ('createdAt' in a && 'createdAt' in b) {
					return props.sortFns.lastCreated
						? props.sortFns.lastCreated(a, b)
						: new Date(b.createdAt ?? '').valueOf() - new Date(a.createdAt ?? '').valueOf();
				}

				return 0;
			case 'nameAsc':
				return props.sortFns.nameAsc
					? props.sortFns.nameAsc(a, b)
					: props.displayName(a).trim().localeCompare(props.displayName(b).trim());
			case 'nameDesc':
				return props.sortFns.nameDesc
					? props.sortFns.nameDesc(a, b)
					: props.displayName(b).trim().localeCompare(props.displayName(a).trim());
			default:
				return props.sortFns[sortBy.value] ? props.sortFns[sortBy.value](a, b) : 0;
		}
	});
});

//watchers

watch(
	() => props.filters,
	(value) => {
		filtersModel.value = value;
		if (hasAppliedFilters()) {
			hasFilters.value = true;
		}
	},
);

watch(
	() => filtersModel.value.homeProject,
	() => {
		sendFiltersTelemetry('homeProject');
	},
);

watch(
	() => filtersModel.value.tags,
	() => {
		sendFiltersTelemetry('tags');
	},
);

watch(
	() => filtersModel.value.type,
	() => {
		sendFiltersTelemetry('type');
	},
);

watch(
	() => filtersModel.value.search,
	() => callDebounced(sendFiltersTelemetry, { debounceTime: 1000, trailing: true }, 'search'),
);

watch(
	() => filtersModel.value.setupNeeded,
	() => {
		sendFiltersTelemetry('setupNeeded');
	},
);

watch(
	() => filtersModel.value.incomplete,
	() => {
		sendFiltersTelemetry('incomplete');
	},
);

watch([() => route.params?.projectId, () => route.name], async () => {
	await resetFilters();
	await loadPaginationPreferences();
	await props.initialize();
});

// Lifecycle hooks
onMounted(async () => {
	await loadPaginationPreferences();
	await props.initialize();
	await nextTick();

	if (hasAppliedFilters()) {
		hasFilters.value = true;
	}

	window.addEventListener('keydown', captureSearchHotKey);
});

onBeforeUnmount(() => {
	window.removeEventListener('keydown', captureSearchHotKey);
});

//methods
const captureSearchHotKey = (e: KeyboardEvent) => {
	if (!props.uiConfig.searchEnabled) return;
	if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
		e.preventDefault();
		focusSearchInput();
	}
};

const focusSearchInput = () => {
	if (search.value) {
		search.value.focus();
	}
};

const isFilterApplied = (key: string): boolean => {
	if (key === 'search') return false;

	if (typeof props.filters[key] === 'boolean') {
		return props.filters[key];
	}

	if (Array.isArray(props.filters[key])) {
		return props.filters[key].length > 0;
	}

	return props.filters[key] !== '';
};

const hasOnlyFiltersThatShowMoreResults = computed(() => {
	const activeFilters = filterKeys.value.filter(isFilterApplied);

	const filtersThatShowMoreResults = ['showArchived'];

	return activeFilters.every((filter) => {
		return filtersThatShowMoreResults.includes(filter);
	});
});

const hasAppliedFilters = (): boolean => {
	return !!filterKeys.value.find(isFilterApplied);
};

const setRowsPerPage = async (numberOfRowsPerPage: number) => {
	rowsPerPage.value = numberOfRowsPerPage;
	await savePaginationPreferences();
	emit('update:pagination-and-sort', {
		pageSize: numberOfRowsPerPage,
	});
};

const setSorting = async (sort: string, persistUpdate = true) => {
	sortBy.value = sort;
	if (persistUpdate) {
		scrollToTop();
		await savePaginationPreferences();
		sendSortingTelemetry();
	}
	emit('update:pagination-and-sort', {
		sort,
	});
};

const setCurrentPage = async (page: number, persistUpdate = true) => {
	const pageChanged = currentPage.value !== page;
	currentPage.value = page;
	if (pageChanged) {
		scrollToTop();
	}
	if (persistUpdate) {
		await savePaginationPreferences();
	}
	emit('update:pagination-and-sort', {
		page,
	});
};

const sendFiltersTelemetry = (source: string) => {
	// Prevent sending multiple telemetry events when resetting filters
	// Timeout is required to wait for search debounce to be over
	if (resettingFilters.value) {
		if (source !== 'reset') {
			return;
		}

		setTimeout(() => (resettingFilters.value = false), 1500);
	}

	const filters = filtersModel.value as Record<string, string[] | string | boolean>;
	const filtersSet: string[] = [];
	const filterValues: Array<string[] | string | boolean | null> = [];

	Object.keys(filters).forEach((key) => {
		if (filters[key]) {
			filtersSet.push(key);
			filterValues.push(key === 'search' ? null : filters[key]);
		}
	});

	telemetry.track(`User set filters in ${props.resourceKey} list`, {
		filters_set: filtersSet,
		filter_values: filterValues,
		[`${props.resourceKey}_total_in_view`]: props.resources.length,
		[`${props.resourceKey}_after_filtering`]: filteredAndSortedResources.value.length,
	});
};

const onAddButtonClick = (e: Event) => {
	emit('click:add', e);
};

const onUpdateFilters = (e: BaseFilters) => {
	scrollToTop();
	emit('update:filters', e);
};

const resetFilters = async () => {
	Object.keys(filtersModel.value).forEach((key) => {
		filtersModel.value[key] = Array.isArray(filtersModel.value[key]) ? [] : '';
	});

	// Reset the current page
	await setCurrentPage(1, false);

	resettingFilters.value = true;
	hasFilters.value = false;
	sendFiltersTelemetry('reset');
	emit('update:filters', filtersModel.value);
};

const itemSize = () => {
	if ('itemSize' in props.typeProps) {
		return props.typeProps.itemSize;
	}
	return 0;
};

const getColumns = () => {
	if ('columns' in props.typeProps) {
		return props.typeProps.columns;
	}
	return [];
};

const sendSortingTelemetry = () => {
	telemetry.track(`User changed sorting in ${props.resourceKey} list`, {
		sorting: sortBy.value,
	});
};

const onUpdateFiltersLength = (length: number) => {
	hasFilters.value = length > 0;
};

const onSearch = (s: string) => {
	scrollToTop();
	filtersModel.value.search = s;
	emit('update:search', s);
};

/**
 * Saves the sort to local storage and to the URL query parameters.
 * A `list-paginated` list loads more resources as the user scrolls, so it saves no page.
 */
const savePaginationPreferences = async () => {
	// For now, only available for paginated lists
	if (props.type !== 'list-paginated') {
		return;
	}
	const currentQuery = { ...route.query };

	// Older links can still have these parameters
	delete currentQuery.page;
	delete currentQuery.pageSize;

	// Only add the sort if it is different from the default value
	if (sortBy.value !== preferredSort.value && !props.persistKeyExclusions.includes(sortBy.value)) {
		currentQuery.sort = sortBy.value;
		preferredSort.value = sortBy.value;
	} else {
		delete currentQuery.sort;
	}

	n8nLocalStorage.saveProjectPreferencesToLocalStorage(
		(route.params.projectId as string) ?? '',
		props.tabKey,
		{
			sort: props.persistKeyExclusions.includes(sortBy.value) ? preferredSort.value : sortBy.value,
		},
	);

	await router.replace({
		query: Object.keys(currentQuery).length ? currentQuery : undefined,
	});
};

/**
 * Loads the sort from the URL query parameters or local storage.
 * The query parameter takes precedence.
 */
const loadPaginationPreferences = async () => {
	// For now, only available for paginated lists
	if (props.type !== 'list-paginated') {
		return;
	}
	const query = route.query;
	// For now, only load workflow list preferences from local storage
	const localStorageValues = n8nLocalStorage.loadProjectPreferencesFromLocalStorage(
		(route.params.projectId as string) ?? '',
		props.tabKey,
	);

	const emitPayload: SortingAndPaginationUpdates = {};

	if (query.sort) {
		// Update the sortBy value and emit the event based on the query parameter
		sortBy.value = emitPayload.sort = preferredSort.value = query.sort as string;
	} else if (localStorageValues.sort) {
		await setSorting(localStorageValues.sort, false);
		emitPayload.sort = localStorageValues.sort;
		preferredSort.value = localStorageValues.sort;
	} else {
		sortBy.value = props.sortOptions[0];
	}
	emit('update:pagination-and-sort', emitPayload);
};

// The list has no scroll area of its own: it scrolls with the page.
const getScrollContainer = () => getScrollParent(listWrapperRef.value);

const scrollToTop = () => {
	getScrollContainer()?.scrollTo({ top: 0 });
};

const hasMoreResources = computed(
	() => props.type === 'list-paginated' && props.resources.length < props.totalItems,
);

// Shown in the column header. A paginated list counts all resources, not only the loaded ones.
const resourceCount = computed(() =>
	props.type === 'list-paginated' ? props.totalItems : filteredAndSortedResources.value.length,
);

const loadMoreRef = ref<HTMLElement | null>(null);
const loadMoreRoot = ref<Element | null>(null);

const { observe: observeLoadMore, disconnect: disconnectLoadMore } = useIntersectionObserver({
	root: loadMoreRoot,
	// Start to load when the end of the list is one screen away
	rootMargin: '0px 0px 100% 0px',
	onIntersect: () => emit('load-more'),
	once: false,
});

// Observe again after each batch: a new observer reports at once if the end is still near,
// for example on a tall screen.
watch(
	[loadMoreRef, () => props.resources, () => props.resourcesRefreshing],
	([element, , refreshing]) => {
		if (!element || refreshing) {
			disconnectLoadMore();
			return;
		}
		const scrollParent = getScrollParent(element);
		loadMoreRoot.value = scrollParent === document.scrollingElement ? null : scrollParent;
		observeLoadMore(element);
	},
	{ flush: 'post' },
);

defineExpose({
	currentPage,
	setCurrentPage,
	getScrollContainer,
});
</script>

<template>
	<PageViewLayout page-scroll :class="$style.columnContainer">
		<template #header>
			<slot name="header" />
			<template v-if="!showLoadingState && !showEmptyState">
				<div v-if="$slots.breadcrumbs" :class="$style.breadcrumbsRow">
					<slot name="breadcrumbs"></slot>
				</div>

				<Teleport :to="toolbarTarget" :disabled="!toolbarTarget">
					<div :class="$style.toolbar" data-test-id="resources-list-toolbar">
						<N8nInput
							v-if="props.uiConfig.searchEnabled"
							ref="search"
							:model-value="filtersModel.search"
							:class="$style.search"
							:placeholder="getResourceText('search.placeholder', 'search.placeholder')"
							size="medium"
							clearable
							data-test-id="resources-list-search"
							@update:model-value="onSearch"
						>
							<template #prefix>
								<N8nIcon icon="search" />
							</template>
						</N8nInput>
						<N8nTooltip v-if="props.uiConfig.sortEnabled" :content="currentSortLabel">
							<span>
								<N8nDropdownMenu
									:items="sortMenuItems"
									placement="bottom-end"
									data-test-id="resources-list-sort"
									@select="setSorting"
								>
									<template #trigger>
										<N8nButton
											variant="outline"
											icon="arrow-up-down"
											size="medium"
											icon-only
											:aria-label="currentSortLabel"
										/>
									</template>
								</N8nDropdownMenu>
							</span>
						</N8nTooltip>
						<ResourceFiltersDropdown
							v-if="props.uiConfig.showFiltersDropdown"
							:keys="filterKeys"
							:reset="resetFilters"
							:model-value="filtersModel"
							:shareable="shareable"
							:just-icon="true"
							@update:model-value="onUpdateFilters"
							@update:filters-length="onUpdateFiltersLength"
						>
							<template #default="resourceFiltersSlotProps">
								<slot name="filters" v-bind="resourceFiltersSlotProps" />
							</template>
						</ResourceFiltersDropdown>
						<slot name="add-button"></slot>
					</div>
				</Teleport>

				<div
					v-if="props.uiConfig.showFiltersDropdown"
					v-show="hasFilters"
					class="mt-xs"
					data-test-id="resources-list-filters-applied-info"
				>
					<N8nInfoTip :bold="false">
						{{
							hasOnlyFiltersThatShowMoreResults
								? getResourceText('filters.active.shortText', 'filters.active.shortText')
								: getResourceText('filters.active', 'filters.active')
						}}
						<N8nLink data-test-id="workflows-filter-reset" size="small" @click="resetFilters">
							{{ getResourceText('filters.active.reset', 'filters.active.reset') }}
						</N8nLink>
					</N8nInfoTip>
				</div>

				<div v-if="$slots.breadcrumbs" class="pb-xs" />

				<ResourceListHeader
					v-if="listColumns && !resourcesRefreshing && filteredAndSortedResources.length > 0"
					:class="$style.columnHeader"
					:count="resourceCount"
				/>
			</template>
		</template>
		<div v-if="showLoadingState" class="resource-list-loading">
			<ResourceListSkeleton />
		</div>
		<template v-else>
			<div v-if="showEmptyState">
				<slot name="empty">
					<ResourcesListEmptyState
						v-if="isEmptyStateResourceKey(props.resourceKey)"
						:resource-key="props.resourceKey"
						:button-disabled="disabled"
						@click:button="onAddButtonClick"
					/>
				</slot>
			</div>
			<PageViewLayoutList v-else>
				<slot name="callout"></slot>

				<slot name="preamble" />

				<div v-if="resourcesRefreshing" class="resource-list-loading resource-list-loading-instant">
					<ResourceListSkeleton />
				</div>
				<div
					v-else-if="filteredAndSortedResources.length > 0"
					ref="listWrapperRef"
					data-test-id="resources-list-wrapper"
					:class="$style.listWrapper"
				>
					<!-- FULL SCROLLING LIST (Shows all resources, filtering and sorting is done in this component) -->
					<N8nRecycleScroller
						v-if="type === 'list-full'"
						data-test-id="resources-list"
						:items="filteredAndSortedResources"
						:item-size="itemSize()"
						:item-key="'id'"
						use-scroll-parent
					>
						<template #default="{ item, updateItemSize }">
							<slot :data="item" :update-item-size="updateItemSize" />
						</template>
					</N8nRecycleScroller>
					<!-- PAGINATED LIST -->
					<div
						v-else-if="type === 'list-paginated'"
						:class="$style.paginatedListWrapper"
						data-test-id="paginated-list"
					>
						<div :class="$style.listItems">
							<div v-for="(item, index) in resources" :key="index" :class="$style.listItem">
								<slot name="item" :item="item" :index="index">
									{{ item }}
								</slot>
							</div>
						</div>
						<div
							v-if="hasMoreResources"
							ref="loadMoreRef"
							:class="$style.loadMore"
							data-test-id="resources-list-load-more"
						>
							<ResourceListSkeleton :rows="3" :header="false" />
						</div>
					</div>
					<!-- DATATABLE -->
					<N8nDatatable
						v-if="type === 'datatable'"
						data-test-id="resources-table"
						:class="$style.datatable"
						:columns="getColumns()"
						:rows="filteredAndSortedResources"
						:current-page="currentPage"
						:rows-per-page="rowsPerPage"
						@update:current-page="setCurrentPage"
						@update:rows-per-page="setRowsPerPage"
					>
						<template #row="{ columns, row }">
							<slot :data="row" :columns="columns" />
						</template>

						<template #postdata>
							<slot name="postdata" />
						</template>
					</N8nDatatable>
				</div>

				<N8nText
					v-else-if="hasAppliedFilters() || filtersModel.search !== ''"
					color="text-base"
					size="medium"
					data-test-id="resources-list-empty"
				>
					{{ getResourceText('noResults', 'noResults') }}
				</N8nText>

				<slot name="postamble" />
			</PageViewLayoutList>
		</template>
	</PageViewLayout>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

// Column breakpoints follow the list width, not the window, because the sidebar takes space.
.columnContainer {
	container: resource-list / inline-size;
}

@container resource-list (width < 960px) {
	:global([data-column-priority='3']) {
		display: none;
	}
}

@container resource-list (width < 768px) {
	:global([data-column-priority='2']) {
		display: none;
	}
}

@container resource-list (width < 576px) {
	:global([data-column-priority='1']) {
		display: none;
	}
}

// Line the header cells up with the row cells below.
.columnHeader {
	margin-inline: var(--spacing--4xs);
}

.columnContainer:has(
		.listItem:first-child :global(.card:hover),
		:global(.recycle-scroller-item:first-child .card:hover)
	)
	.columnHeader {
	border-bottom-color: transparent;
}

.breadcrumbsRow {
	display: flex;
	align-items: center;
	min-height: var(--spacing--xl);
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--4xs);
}

.search {
	width: 196px;

	@include breakpoints.breakpoint('sm-and-down') {
		width: 140px;
	}
}

.listWrapper {
	// Render resource cards as flat rows: no frame, a hairline divider, a fill on hover.
	--card--border-color: transparent;
	--card--border-color--hover: transparent;
	--card--shadow: inset 0 -1px 0 var(--border-color--subtle);
	--card--shadow--hover: none;
	--card--color--background: transparent;
	--card--color--background--hover: var(--background--hover);
	--card--padding: var(--spacing--xs) var(--spacing--sm);
	// A rounded corner bends the divider, so only the hover fill is rounded.
	--card--radius: 0;

	width: 100%;

	:global(.card:hover) {
		--card--radius: var(--radius);
	}
	// The page has no bottom padding, so keep the last row off the panel edge.
	padding-bottom: var(--spacing--sm);

	// A hovered row has a rounded fill. Hide the dividers that touch it, so no line curves around the fill.
	.listItem:has(+ .listItem :global(.card:hover)) :global(.card),
	:global(.recycle-scroller-item:has(+ .recycle-scroller-item .card:hover) .card) {
		--card--shadow: none;
	}

	// Show a row menu only on hover, keyboard focus, or while it is open. Touch screens always show it.
	@media (hover: hover) {
		:global([data-row-menu]) {
			opacity: 0;
			transition: opacity var(--duration--snappy) var(--easing--ease-out);
		}

		:global(.card:hover [data-row-menu]),
		:global(.card:focus-within [data-row-menu]),
		:global([data-row-menu]:has([aria-expanded='true'])) {
			opacity: 1;
		}
	}
}

.paginatedListWrapper {
	display: flex;
	flex-direction: column;
}

.listItems {
	padding-inline: var(--spacing--4xs);
}

.loadMore {
	position: relative;
}

.datatable {
	padding-bottom: var(--spacing--sm);
}
</style>

<style lang="scss" scoped>
.resource-list-loading {
	position: relative;
	width: 100%;
	// The list scrolls with the page, so cap the skeleton at one screen.
	max-height: 100vh;
	overflow: hidden;
	visibility: hidden;
	/*
	Show the loading skeleton only if the loading takes longer than 300ms
	*/
	animation: 0.01s linear 0.3s forwards changeVisibility;
}
.resource-list-loading-instant {
	animation: 0.01s linear 0s forwards changeVisibility;
}

@keyframes changeVisibility {
	to {
		visibility: visible;
	}
}
</style>
