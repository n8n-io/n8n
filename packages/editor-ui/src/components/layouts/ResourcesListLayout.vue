<script lang="ts" setup>
import { computed, nextTick, ref, onMounted, watch } from 'vue';

import { type ProjectSharingData } from '@/types/projects.types';
import PageViewLayout from '@/components/layouts/PageViewLayout.vue';
import PageViewLayoutList from '@/components/layouts/PageViewLayoutList.vue';
import ResourceFiltersDropdown from '@/components/forms/ResourceFiltersDropdown.vue';
import { useUsersStore } from '@/stores/users.store';
import type { DatatableColumn } from 'n8n-design-system';
import { useI18n } from '@/composables/useI18n';
import { useDebounce } from '@/composables/useDebounce';
import { useTelemetry } from '@/composables/useTelemetry';
import { useRoute } from 'vue-router';

import type { BaseTextKey } from '@/plugins/i18n';
import type { Scope } from '@n8n/permissions';

export type IResource = {
	id: string;
	name?: string;
	value?: string;
	key?: string;
	updatedAt?: string;
	createdAt?: string;
	homeProject?: ProjectSharingData;
	scopes?: Scope[];
	type?: string;
	sharedWithProjects?: ProjectSharingData[];
};

export interface IFilters {
	search: string;
	homeProject: string;
	[key: string]: boolean | string | string[];
}

type IResourceKeyType = 'credentials' | 'workflows' | 'variables';

const props = withDefaults(
	defineProps<{
		resourceKey: IResourceKeyType;
		displayName?: (resource: IResource) => string;
		resources: IResource[];
		disabled: boolean;
		initialize?: () => Promise<void>;
		filters?: IFilters;
		additionalFiltersHandler?: (
			resource: IResource,
			filters: IFilters,
			matches: boolean,
		) => boolean;
		shareable?: boolean;
		showFiltersDropdown?: boolean;
		sortFns?: Record<string, (a: IResource, b: IResource) => number>;
		sortOptions?: string[];
		type?: 'datatable' | 'list';
		typeProps: { itemSize: number } | { columns: DatatableColumn[] };
		loading: boolean;
	}>(),
	{
		displayName: (resource: IResource) => resource.name || '',
		initialize: async () => {},
		filters: () => ({ search: '', homeProject: '' }),
		sortFns: () => ({}),
		sortOptions: () => ['lastUpdated', 'lastCreated', 'nameAsc', 'nameDesc'],
		type: 'list',
		typeProps: () => ({ itemSize: 80 }),
		loading: true,
		additionalFiltersHandler: undefined,
		showFiltersDropdown: true,
		shareable: true,
	},
);

const emit = defineEmits<{
	'update:filters': [value: IFilters];
	'click:add': [event: Event];
	sort: [value: string];
}>();

defineSlots<{
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	default(props: { data: any; updateItemSize: (data: any) => void }): unknown;
}>();

const route = useRoute();
const i18n = useI18n();
const { callDebounced } = useDebounce();
const usersStore = useUsersStore();
const telemetry = useTelemetry();

const sortBy = ref(props.sortOptions[0]);
const hasFilters = ref(false);
const filtersModel = ref(props.filters);
const currentPage = ref(1);
const rowsPerPage = ref<number>(25);
const resettingFilters = ref(false);
const search = ref<HTMLElement | null>(null);

//computed

const filterKeys = computed(() => {
	return Object.keys(filtersModel.value);
});

const filteredAndSortedResources = computed(() => {
	const filtered = props.resources.filter((resource) => {
		let matches = true;

		if (filtersModel.value.homeProject) {
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
		switch (sortBy.value) {
			case 'lastUpdated':
				return props.sortFns.lastUpdated
					? props.sortFns.lastUpdated(a, b)
					: new Date(b.updatedAt ?? '').valueOf() - new Date(a.updatedAt ?? '').valueOf();
			case 'lastCreated':
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

//methods

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

const setRowsPerPage = (numberOfRowsPerPage: number) => {
	rowsPerPage.value = numberOfRowsPerPage;
};

const setCurrentPage = (page: number) => {
	currentPage.value = page;
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

const onUpdateFilters = (e: IFilters) => {
	emit('update:filters', e);
};

const resetFilters = () => {
	Object.keys(filtersModel.value).forEach((key) => {
		filtersModel.value[key] = Array.isArray(filtersModel.value[key]) ? [] : '';
	});

	resettingFilters.value = true;
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
	return {};
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
	emit('update:filters', filtersModel.value);
};

//watchers

watch(
	() => props.filters,
	(value) => {
		filtersModel.value = value;
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
	() => sortBy.value,
	(newValue) => {
		emit('sort', newValue);
		sendSortingTelemetry();
	},
);

watch(
	() => route?.params?.projectId,
	() => {
		resetFilters();
	},
);

onMounted(async () => {
	await props.initialize();
	await nextTick();

	focusSearchInput();

	if (hasAppliedFilters()) {
		hasFilters.value = true;
	}
});
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
			<div v-if="resources.length === 0">
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
							<n8n-input
								ref="search"
								:model-value="filtersModel.search"
								:class="[$style['search'], 'mr-2xs']"
								:placeholder="i18n.baseText(`${resourceKey}.search.placeholder` as BaseTextKey)"
								clearable
								data-test-id="resources-list-search"
								@update:model-value="onSearch"
							>
								<template #prefix>
									<n8n-icon icon="search" />
								</template>
							</n8n-input>
							<ResourceFiltersDropdown
								v-if="showFiltersDropdown"
								:keys="filterKeys"
								:reset="resetFilters"
								:model-value="filtersModel"
								:shareable="shareable"
								@update:model-value="onUpdateFilters"
								@update:filters-length="onUpdateFiltersLength"
							>
								<template #default="resourceFiltersSlotProps">
									<slot name="filters" v-bind="resourceFiltersSlotProps" />
								</template>
							</ResourceFiltersDropdown>
							<div :class="$style['sort-and-filter']">
								<n8n-select v-model="sortBy" data-test-id="resources-list-sort">
									<n8n-option
										v-for="sortOption in sortOptions"
										:key="sortOption"
										data-test-id="resources-list-sort-item"
										:value="sortOption"
										:label="i18n.baseText(`${resourceKey}.sort.${sortOption}` as BaseTextKey)"
									/>
								</n8n-select>
							</div>
						</div>
						<slot name="add-button"></slot>
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

				<div
					v-if="filteredAndSortedResources.length > 0"
					ref="listWrapperRef"
					:class="$style.listWrapper"
				>
					<n8n-recycle-scroller
						v-if="type === 'list'"
						data-test-id="resources-list"
						:items="filteredAndSortedResources"
						:item-size="itemSize()"
						item-key="id"
					>
						<template #default="{ item, updateItemSize }">
							<slot :data="item" :update-item-size="updateItemSize" />
						</template>
					</n8n-recycle-scroller>
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

				<n8n-text v-else color="text-base" size="medium" data-test-id="resources-list-empty">
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
}

.filters {
	display: grid;
	grid-auto-flow: column;
	grid-auto-columns: max-content;
	gap: var(--spacing-2xs);
	align-items: center;
	width: 100%;

	@include mixins.breakpoint('xs-only') {
		grid-template-columns: 1fr auto;
		grid-auto-flow: row;

		> *:last-child {
			grid-column: auto;
		}
	}
}

.search {
	max-width: 240px;

	@include mixins.breakpoint('sm-and-down') {
		max-width: 100%;
	}
}

.listWrapper {
	position: absolute;
	height: 100%;
	width: 100%;
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

@keyframes changeVisibility {
	from {
		height: 0;
	}
	to {
		height: 100%;
	}
}
</style>
