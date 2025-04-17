<script lang="ts" setup>
import { computed, nextTick, ref, onMounted, watch, onBeforeUnmount } from 'vue';

import { type ProjectSharingData } from '@/types/projects.types';
import PageViewLayout from '@/components/layouts/PageViewLayout.vue';
import PageViewLayoutList from '@/components/layouts/PageViewLayoutList.vue';
import ResourceFiltersDropdown from '@/components/forms/ResourceFiltersDropdown.vue';
import { useUsersStore } from '@/stores/users.store';
import type { DatatableColumn } from '@n8n/design-system';
import { useI18n } from '@/composables/useI18n';
import { useDebounce } from '@/composables/useDebounce';
import { useTelemetry } from '@/composables/useTelemetry';
import { useRoute, useRouter } from 'vue-router';

import type { BaseTextKey } from '@/plugins/i18n';
import type { Scope } from '@n8n/permissions';
import type { BaseFolderItem, BaseResource, FolderShortInfo, ITag } from '@/Interface';
import { isSharedResource, isResourceSortableByDate } from '@/utils/typeGuards';

type ResourceKeyType = 'credentials' | 'workflows' | 'variables' | 'folders';

export type FolderResource = BaseFolderItem & {
	resourceType: 'folder';
	readOnly: boolean;
};

export type WorkflowResource = BaseResource & {
	resourceType: 'workflow';
	updatedAt: string;
	createdAt: string;
	active: boolean;
	homeProject?: ProjectSharingData;
	scopes?: Scope[];
	tags?: ITag[] | string[];
	sharedWithProjects?: ProjectSharingData[];
	readOnly: boolean;
	parentFolder?: FolderShortInfo;
};

export type VariableResource = BaseResource & {
	resourceType: 'variable';
	key?: string;
	value?: string;
};

export type CredentialsResource = BaseResource & {
	resourceType: 'credential';
	updatedAt: string;
	createdAt: string;
	type: string;
	homeProject?: ProjectSharingData;
	scopes?: Scope[];
	sharedWithProjects?: ProjectSharingData[];
	readOnly: boolean;
	needsSetup: boolean;
};

export type Resource = WorkflowResource | FolderResource | CredentialsResource | VariableResource;

export type BaseFilters = {
	search: string;
	homeProject: string;
	[key: string]: boolean | string | string[];
};

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const { callDebounced } = useDebounce();
const usersStore = useUsersStore();
const telemetry = useTelemetry();

const props = withDefaults(
	defineProps<{
		resourceKey: ResourceKeyType;
		displayName?: (resource: Resource) => string;
		resources: Resource[];
		disabled: boolean;
		initialize?: () => Promise<void>;
		filters?: BaseFilters;
		additionalFiltersHandler?: (
			resource: Resource,
			filters: BaseFilters,
			matches: boolean,
		) => boolean;
		shareable?: boolean;
		showFiltersDropdown?: boolean;
		sortFns?: Record<string, (a: Resource, b: Resource) => number>;
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
	}>(),
	{
		displayName: (resource: Resource) => resource.name || '',
		initialize: async () => {},
		filters: () => ({ search: '', homeProject: '' }),
		sortFns: () => ({}),
		sortOptions: () => ['lastUpdated', 'lastCreated', 'nameAsc', 'nameDesc'],
		type: 'list-full',
		typeProps: () => ({ itemSize: 80 }),
		loading: true,
		additionalFiltersHandler: undefined,
		showFiltersDropdown: true,
		shareable: true,
		customPageSize: 25,
		availablePageSizeOptions: () => [10, 25, 50, 100],
		totalItems: 0,
		dontPerformSortingAndFiltering: false,
		resourcesRefreshing: false,
		hasEmptyState: true,
	},
);

const sortBy = ref(props.sortOptions[0]);
const hasFilters = ref(false);
const currentPage = ref(1);
const rowsPerPage = ref<number>(props.customPageSize);
const resettingFilters = ref(false);
const search = ref<HTMLElement | null>(null);

const emit = defineEmits<{
	'update:filters': [value: BaseFilters];
	'click:add': [event: Event];
	'update:current-page': [page: number];
	'update:page-size': [pageSize: number];
	sort: [value: string];
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

const filteredAndSortedResources = computed(() => {
	if (props.dontPerformSortingAndFiltering) {
		return props.resources;
	}
	const filtered = props.resources.filter((resource) => {
		let matches = true;

		if (filtersModel.value.homeProject && isSharedResource(resource)) {
			matches =
				matches &&
				!!(resource.homeProject && resource.homeProject.id === filtersModel.value.homeProject);
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
				return props.sortFns.lastUpdated
					? props.sortFns.lastUpdated(a, b)
					: new Date(b.updatedAt ?? '').valueOf() - new Date(a.updatedAt ?? '').valueOf();
			case 'lastCreated':
				if (!sortableByDate) {
					return 0;
				}
				return props.sortFns.lastCreated
					? props.sortFns.lastCreated(a, b)
					: new Date(b.createdAt ?? '').valueOf() - new Date(a.createdAt ?? '').valueOf();
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

watch(
	() => sortBy.value,
	(newValue) => {
		emit('sort', newValue);
		sendSortingTelemetry();
	},
);

watch(
	() => route?.params?.projectId,
	async () => {
		await resetFilters();
	},
);

// Lifecycle hooks
onMounted(async () => {
	await loadPaginationFromQueryString();
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

const hasAppliedFilters = (): boolean => {
	return !!filterKeys.value.find((key) => {
		if (key === 'search') return false;

		if (typeof props.filters[key] === 'boolean') {
			return props.filters[key];
		}

		if (Array.isArray(props.filters[key])) {
			return props.filters[key].length > 0;
		}

		return props.filters[key] !== '';
	});
};

const setRowsPerPage = async (numberOfRowsPerPage: number) => {
	rowsPerPage.value = numberOfRowsPerPage;
	await savePaginationToQueryString();
	emit('update:page-size', numberOfRowsPerPage);
};

const setCurrentPage = async (page: number) => {
	currentPage.value = page;
	await savePaginationToQueryString();
	emit('update:current-page', page);
};

defineExpose({
	currentPage,
	setCurrentPage,
});

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
	await setCurrentPage(1);

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

const savePaginationToQueryString = async () => {
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

	if (rowsPerPage.value !== props.customPageSize) {
		currentQuery.pageSize = rowsPerPage.value.toString();
	} else {
		delete currentQuery.pageSize;
	}

	await router.replace({
		query: Object.keys(currentQuery).length ? currentQuery : undefined,
	});
};

const loadPaginationFromQueryString = async () => {
	// For now, only available for paginated lists
	if (props.type !== 'list-paginated') {
		return;
	}
	const query = router.currentRoute.value.query;

	if (query.page) {
		await setCurrentPage(parseInt(query.page as string, 10));
	}

	if (query.pageSize) {
		const parsedSize = parseInt(query.pageSize as string, 10);
		// Round to the nearest available page size, this will prevent users from passing arbitrary values
		await setRowsPerPage(findNearestPageSize(parsedSize));
	}

	if (query.sort) {
		sortBy.value = query.sort as string;
	}
};
</script>

<template>
	<PageViewLayout>
		<template #header>
			<slot name="header" />
		</template>
		<div v-if="loading" class="resource-list-loading">
			<n8n-loading :rows="25" :shrink-last="false" />
		</div>
		<template v-else>
			<div v-if="showEmptyState">
				<slot name="empty">
					<n8n-action-box
						data-test-id="empty-resources-list"
						emoji="👋"
						:heading="
							i18n.baseText(
								usersStore.currentUser?.firstName
									? (`${resourceKey}.empty.heading` as BaseTextKey)
									: (`${resourceKey}.empty.heading.userNotSetup` as BaseTextKey),
								{
									interpolate: { name: usersStore.currentUser?.firstName ?? '' },
								},
							)
						"
						:description="i18n.baseText(`${resourceKey}.empty.description` as BaseTextKey)"
						:button-text="i18n.baseText(`${resourceKey}.empty.button` as BaseTextKey)"
						button-type="secondary"
						:button-disabled="disabled"
						@click:button="onAddButtonClick"
					>
						<template #disabledButtonTooltip>
							{{ i18n.baseText(`${resourceKey}.empty.button.disabled.tooltip` as BaseTextKey) }}
						</template>
					</n8n-action-box>
				</slot>
			</div>
			<PageViewLayoutList v-else>
				<template #header>
					<div :class="$style['filters-row']">
						<div :class="$style.filters">
							<slot name="breadcrumbs"></slot>
							<n8n-input
								ref="search"
								:model-value="filtersModel.search"
								:class="$style.search"
								:placeholder="i18n.baseText(`${resourceKey}.search.placeholder` as BaseTextKey)"
								size="small"
								clearable
								data-test-id="resources-list-search"
								@update:model-value="onSearch"
							>
								<template #prefix>
									<n8n-icon icon="search" />
								</template>
							</n8n-input>
							<div :class="$style['sort-and-filter']">
								<n8n-select v-model="sortBy" size="small" data-test-id="resources-list-sort">
									<n8n-option
										v-for="sortOption in sortOptions"
										:key="sortOption"
										data-test-id="resources-list-sort-item"
										:value="sortOption"
										:label="i18n.baseText(`${resourceKey}.sort.${sortOption}` as BaseTextKey)"
									/>
								</n8n-select>
							</div>
							<div :class="$style['sort-and-filter']">
								<ResourceFiltersDropdown
									v-if="showFiltersDropdown"
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

					<div v-if="showFiltersDropdown" v-show="hasFilters" class="mt-xs">
						<n8n-info-tip :bold="false">
							{{ i18n.baseText(`${resourceKey}.filters.active` as BaseTextKey) }}
							<n8n-link data-test-id="workflows-filter-reset" size="small" @click="resetFilters">
								{{ i18n.baseText(`${resourceKey}.filters.active.reset` as BaseTextKey) }}
							</n8n-link>
						</n8n-info-tip>
					</div>

					<div class="pb-xs" />
				</template>

				<slot name="preamble" />

				<div v-if="resourcesRefreshing" class="resource-list-loading resource-list-loading-instant">
					<n8n-loading :rows="rowsPerPage" :shrink-last="false" />
				</div>
				<div
					v-else-if="filteredAndSortedResources.length > 0"
					ref="listWrapperRef"
					data-test-id="resources-list-wrapper"
					:class="$style.listWrapper"
				>
					<!-- FULL SCROLLING LIST (Shows all resources, filtering and sorting is done in this component) -->
					<n8n-recycle-scroller
						v-if="type === 'list-full'"
						data-test-id="resources-list"
						:items="filteredAndSortedResources"
						:item-size="itemSize()"
						item-key="id"
					>
						<template #default="{ item, updateItemSize }">
							<slot :data="item" :update-item-size="updateItemSize" />
						</template>
					</n8n-recycle-scroller>
					<!-- PAGINATED LIST -->
					<div v-else-if="type === 'list-paginated'" :class="$style.paginatedListWrapper">
						<div :class="$style.listItems">
							<div v-for="(item, index) in resources" :key="index" :class="$style.listItem">
								<slot name="item" :item="item" :index="index">
									{{ item }}
								</slot>
							</div>
						</div>
						<div :class="$style.listPagination">
							<el-pagination
								v-model:current-page="currentPage"
								v-model:page-size="rowsPerPage"
								background
								:total="totalItems"
								:page-sizes="availablePageSizeOptions"
								layout="total, prev, pager, next, sizes"
								data-test-id="resources-list-pagination"
								@update:current-page="setCurrentPage"
								@size-change="setRowsPerPage"
							></el-pagination>
						</div>
					</div>
					<!-- DATATABLE -->
					<n8n-datatable
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
					</n8n-datatable>
				</div>

				<n8n-text
					v-else-if="hasAppliedFilters() || filtersModel.search !== ''"
					color="text-base"
					size="medium"
					data-test-id="resources-list-empty"
				>
					{{ i18n.baseText(`${resourceKey}.noResults` as BaseTextKey) }}
				</n8n-text>

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
	gap: var(--spacing-2xs);
}

.filters {
	display: grid;
	grid-auto-flow: column;
	grid-auto-columns: 1fr max-content max-content max-content;
	gap: var(--spacing-4xs);
	align-items: center;
	justify-content: end;
	width: 100%;

	.sort-and-filter {
		display: flex;
		gap: var(--spacing-4xs);
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
}

.search {
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
	gap: var(--spacing-m);
}

.listPagination {
	display: flex;
	justify-content: flex-end;
	margin-bottom: var(--spacing-l);

	:global(.el-pagination__sizes) {
		height: 100%;
		position: relative;
		top: -1px;

		input {
			height: 100%;
			min-height: 28px;
		}

		:global(.el-input__suffix) {
			width: var(--spacing-m);
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
	padding-bottom: var(--spacing-s);
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
