<script lang="ts" setup generic="ResourceType extends Resource = Resource">
import { computed, nextTick, ref, onMounted, watch, onBeforeUnmount } from 'vue';

import PageViewLayout from '@/components/layouts/PageViewLayout.vue';
import PageViewLayoutList from '@/components/layouts/PageViewLayoutList.vue';
import ResourceFiltersDropdown from '@/components/forms/ResourceFiltersDropdown.vue';
import { useUsersStore } from '@/stores/users.store';
import type { DatatableColumn } from '@n8n/design-system';
import { useDebounce } from '@/composables/useDebounce';
import { useTelemetry } from '@/composables/useTelemetry';
import { useRoute, useRouter } from 'vue-router';

import type { BaseFilters, Resource, SortingAndPaginationUpdates } from '@/Interface';
import { isSharedResource, isResourceSortableByDate } from '@/utils/typeGuards';
import { useN8nLocalStorage } from '@/composables/useN8nLocalStorage';
import { useResourcesListI18n } from '@/composables/useResourcesListI18n';

import { ElPagination } from 'element-plus';
import {
	N8nActionBox,
	N8nDatatable,
	N8nIcon,
	N8nInfoTip,
	N8nInput,
	N8nLink,
	N8nLoading,
	N8nOption,
	N8nRecycleScroller,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
type UIConfig = {
	searchEnabled: boolean;
	showFiltersDropdown: boolean;
	sortEnabled: boolean;
};

const route = useRoute();
const router = useRouter();
const { callDebounced } = useDebounce();
const usersStore = useUsersStore();
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
		type?: 'datatable' | 'list-full' | 'list-paginated';
		typeProps: { itemSize: number } | { columns: DatatableColumn[] };
		loading: boolean;
		customPageSize?: number;
		availablePageSizeOptions?: number[];
		totalItems?: number;
		resourcesRefreshing?: boolean;
		// Set to true if sorting and filtering is done outside of the component
		dontPerformSortingAndFiltering?: boolean;
		hasEmptyState?: boolean;
		uiConfig?: UIConfig;
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
		availablePageSizeOptions: () => [10, 25, 50, 100],
		totalItems: 0,
		dontPerformSortingAndFiltering: false,
		resourcesRefreshing: false,
		hasEmptyState: true,
		uiConfig: () => ({
			searchEnabled: true,
			showFiltersDropdown: true,
			sortEnabled: true,
		}),
	},
);

const { getResourceText } = useResourcesListI18n(props.resourceKey);

const sortBy = ref(props.sortOptions[0]);
const hasFilters = ref(false);
const currentPage = ref(1);
const rowsPerPage = ref<number>(props.customPageSize);
const resettingFilters = ref(false);
const search = ref<HTMLElement | null>(null);
const listWrapperRef = ref<HTMLElement | null>(null);
const listItemsRef = ref<HTMLElement | null>(null);

// Preferred sorting and page size
// These refs store the values that are set by the user and preserved in local storage
const preferredPageSize = ref<number>(props.customPageSize);
const preferredSort = ref<string>(props.sortOptions[0]);

const emit = defineEmits<{
	'update:filters': [value: BaseFilters];
	'click:add': [event: Event];
	'update:pagination-and-sort': [value: SortingAndPaginationUpdates];
	'update:search': [value: string];
}>();

const slots = defineSlots<{
	header(): unknown;
	empty(): unknown;
	preamble(): unknown;
	postamble(): unknown;
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
		await savePaginationPreferences();
		sendSortingTelemetry();
	}
	emit('update:pagination-and-sort', {
		sort,
	});
};

const setCurrentPage = async (page: number, persistUpdate = true) => {
	currentPage.value = page;
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
	filtersModel.value.search = s;
	emit('update:search', s);
};

const findNearestPageSize = (size: number): number => {
	return props.availablePageSizeOptions.reduce((prev, curr) =>
		Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev,
	);
};

/**
 * Saves the current pagination preferences to local storage and updates the URL query parameters.
 */
const savePaginationPreferences = async () => {
	// For now, only available for paginated lists
	if (props.type !== 'list-paginated') {
		return;
	}
	const currentQuery = { ...route.query };

	// Update pagination parameters
	if (currentPage.value !== 1) {
		currentQuery.page = currentPage.value.toString();
	} else {
		delete currentQuery.page;
	}

	// Only update sort & page size if they are different from the default values
	// otherwise, remove them from the query
	if (rowsPerPage.value !== preferredPageSize.value) {
		currentQuery.pageSize = rowsPerPage.value.toString();
		preferredPageSize.value = rowsPerPage.value;
	} else {
		delete currentQuery.pageSize;
	}

	if (sortBy.value !== preferredSort.value) {
		currentQuery.sort = sortBy.value;
		preferredSort.value = sortBy.value;
	} else {
		delete currentQuery.sort;
	}

	n8nLocalStorage.saveProjectPreferencesToLocalStorage(
		(route.params.projectId as string) ?? '',
		'workflows',
		{
			sort: sortBy.value,
			pageSize: rowsPerPage.value,
		},
	);

	await router.replace({
		query: Object.keys(currentQuery).length ? currentQuery : undefined,
	});
};

/**
 * Loads the pagination preferences from local storage or URL query parameter
 * Current page is only saved in the URL query parameters
 * Page size and sort are saved both in local storage and URL query parameters, with query parameters taking precedence
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
		'workflows',
	);

	const emitPayload: SortingAndPaginationUpdates = {};

	if (query.page) {
		const newPage = parseInt(query.page as string, 10);
		if (newPage > 1) {
			currentPage.value = newPage;
			emitPayload.page = newPage;
		}
	}

	if (query.pageSize ?? localStorageValues.pageSize) {
		const parsedSize = parseInt(
			(query.pageSize as string) || String(localStorageValues.pageSize),
			10,
		);
		// Round to the nearest available page size, this will prevent users from passing arbitrary values
		const newPageSize = findNearestPageSize(parsedSize);
		rowsPerPage.value = newPageSize;
		emitPayload.pageSize = newPageSize;
		preferredPageSize.value = newPageSize;
	} else {
		rowsPerPage.value = props.customPageSize;
		emitPayload.pageSize = props.customPageSize;
	}

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

const getScrollContainer = () => {
	if (props.type === 'list-paginated') {
		return listItemsRef.value ?? null;
	}
	return listWrapperRef.value ?? null;
};

defineExpose({
	currentPage,
	setCurrentPage,
	getScrollContainer,
});
</script>

<template>
	<PageViewLayout>
		<template #header>
			<slot name="header" />
		</template>
		<div v-if="loading" class="resource-list-loading">
			<N8nLoading :rows="25" :shrink-last="false" />
		</div>
		<template v-else>
			<div v-if="showEmptyState">
				<slot name="empty">
					<N8nActionBox
						data-test-id="empty-resources-list"
						emoji="👋"
						:heading="
							getResourceText(
								usersStore.currentUser?.firstName ? 'empty.heading' : 'empty.heading.userNotSetup',
								usersStore.currentUser?.firstName ? 'empty.heading' : 'empty.heading.userNotSetup',
								{ name: usersStore.currentUser?.firstName ?? '' },
							)
						"
						:description="getResourceText('empty.description')"
						:button-text="getResourceText('empty.button')"
						button-type="secondary"
						:button-disabled="disabled"
						@click:button="onAddButtonClick"
					>
						<template #disabledButtonTooltip>
							{{ getResourceText('empty.button.disabled.tooltip') }}
						</template>
					</N8nActionBox>
				</slot>
			</div>
			<PageViewLayoutList v-else>
				<template #header>
					<div :class="$style['filters-row']">
						<div :class="$style.filters">
							<slot name="breadcrumbs"></slot>
							<N8nInput
								v-if="props.uiConfig.searchEnabled"
								ref="search"
								:model-value="filtersModel.search"
								:class="$style.search"
								:placeholder="getResourceText('search.placeholder', 'search.placeholder')"
								size="small"
								clearable
								data-test-id="resources-list-search"
								@update:model-value="onSearch"
							>
								<template #prefix>
									<N8nIcon icon="search" />
								</template>
							</N8nInput>
							<div v-if="props.uiConfig.sortEnabled" :class="$style['sort-and-filter']">
								<N8nSelect
									v-model="sortBy"
									size="small"
									data-test-id="resources-list-sort"
									@change="setSorting(sortBy)"
								>
									<N8nOption
										v-for="sortOption in sortOptions"
										:key="sortOption"
										data-test-id="resources-list-sort-item"
										:value="sortOption"
										:label="getResourceText(`sort.${sortOption}`, `sort.${sortOption}`)"
									/>
								</N8nSelect>
							</div>
							<div v-if="props.uiConfig.showFiltersDropdown" :class="$style['sort-and-filter']">
								<ResourceFiltersDropdown
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
						</div>
					</div>

					<slot name="callout"></slot>

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

					<div class="pb-xs" />
				</template>

				<slot name="preamble" />

				<div v-if="resourcesRefreshing" class="resource-list-loading resource-list-loading-instant">
					<N8nLoading :rows="rowsPerPage" :shrink-last="false" />
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
						<div ref="listItemsRef" :class="$style.listItems">
							<div v-for="(item, index) in resources" :key="index" :class="$style.listItem">
								<slot name="item" :item="item" :index="index">
									{{ item }}
								</slot>
							</div>
						</div>
						<div :class="$style.listPagination">
							<ElPagination
								v-model:current-page="currentPage"
								v-model:page-size="rowsPerPage"
								background
								:total="totalItems"
								:page-sizes="availablePageSizeOptions"
								layout="total, prev, pager, next, sizes"
								data-test-id="resources-list-pagination"
								@update:current-page="setCurrentPage"
								@size-change="setRowsPerPage"
							></ElPagination>
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
.filters-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	gap: var(--spacing--2xs);
}

.filters {
	display: grid;
	grid-auto-flow: column;
	grid-auto-columns: 1fr max-content max-content max-content;
	gap: var(--spacing--4xs);
	align-items: center;
	justify-content: end;
	width: 100%;

	.sort-and-filter {
		display: flex;
		gap: var(--spacing--4xs);
		align-items: center;
	}

	@include mixins.breakpoint('xs-only') {
		grid-auto-flow: row;
		grid-auto-columns: unset;
		grid-template-columns: 1fr;
	}
}

.search {
	max-width: 196px;
	justify-self: end;

	input {
		height: 30px;
	}

	@include mixins.breakpoint('sm-and-down') {
		max-width: 100%;
	}
}

.listWrapper {
	position: absolute;
	height: 100%;
	width: 100%;
}

.paginatedListWrapper {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: auto;
	gap: var(--spacing--md);
}

.listItems {
	overflow-y: auto;
}

.listPagination {
	display: flex;
	justify-content: flex-end;
	margin-bottom: var(--spacing--lg);

	:global(.el-pagination__sizes) {
		height: 100%;
		position: relative;
		top: -1px;

		input {
			height: 100%;
			min-height: 28px;
		}

		:global(.el-input__suffix) {
			width: var(--spacing--md);
		}
	}
}

.sort-and-filter {
	white-space: nowrap;

	@include mixins.breakpoint('sm-and-down') {
		width: 100%;
	}
}

.datatable {
	padding-bottom: var(--spacing--sm);
}
</style>

<style lang="scss" scoped>
.resource-list-loading {
	position: relative;
	height: 0;
	width: 100%;
	overflow: hidden;
	/*
	Show the loading skeleton only if the loading takes longer than 300ms
	*/
	animation: 0.01s linear 0.3s forwards changeVisibility;
	:deep(.el-skeleton) {
		position: absolute;
		height: 100%;
		width: 100%;
		overflow: hidden;

		> div {
			> div:first-child {
				.el-skeleton__item {
					height: 42px;
					margin: 0;
				}
			}
		}

		.el-skeleton__item {
			height: 69px;
		}
	}
}
.resource-list-loading-instant {
	animation: 0.01s linear 0s forwards changeVisibility;
}

@keyframes changeVisibility {
	from {
		height: 0;
	}
	to {
		height: 100%;
	}
}
</style>
