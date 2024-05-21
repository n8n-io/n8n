<template>
	<PageViewLayout>
		<template #header> <slot name="header" /> </template>
		<div v-if="loading">
			<n8n-loading :class="[$style['header-loading'], 'mb-l']" variant="custom" />
			<n8n-loading :class="[$style['card-loading'], 'mb-2xs']" variant="custom" />
			<n8n-loading :class="$style['card-loading']" variant="custom" />
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
						@click:button="onAddButtonClick"
					/>
				</slot>
			</div>
			<PageViewLayoutList v-else :overflow="type !== 'list'">
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
						<slot name="add-button" :disabled="disabled">
							<n8n-button
								size="large"
								:disabled="disabled"
								data-test-id="resources-list-add"
								@click="onAddButtonClick"
							>
								{{ i18n.baseText(`${resourceKey}.add` as BaseTextKey) }}
							</n8n-button>
						</slot>
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
						<template #postListContent>
							<slot name="postListContent" />
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

<script lang="ts">
import { computed, defineComponent, nextTick, ref, onMounted, watch } from 'vue';
import type { PropType } from 'vue';

import type { ProjectSharingData } from '@/features/projects/projects.types';
import PageViewLayout from '@/components/layouts/PageViewLayout.vue';
import PageViewLayoutList from '@/components/layouts/PageViewLayoutList.vue';
import ResourceFiltersDropdown from '@/components/forms/ResourceFiltersDropdown.vue';
import { useUsersStore } from '@/stores/users.store';
import type { DatatableColumn } from 'n8n-design-system';
import { useI18n } from '@/composables/useI18n';
import { useDebounce } from '@/composables/useDebounce';
import { useTelemetry } from '@/composables/useTelemetry';
import { useRoute } from 'vue-router';

// eslint-disable-next-line unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars
import type { BaseTextKey } from '@/plugins/i18n';

export interface IResource {
	id: string;
	name: string;
	updatedAt: string;
	createdAt: string;
	homeProject?: ProjectSharingData;
}

interface IFilters {
	search: string;
	homeProject: string;
	[key: string]: boolean | string | string[];
}

type IResourceKeyType = 'credentials' | 'workflows';

export default defineComponent({
	name: 'ResourcesListLayout',
	components: {
		PageViewLayout,
		PageViewLayoutList,
		ResourceFiltersDropdown,
	},
	props: {
		resourceKey: {
			type: String,
			default: '' as IResourceKeyType,
		},
		displayName: {
			type: Function as PropType<(resource: IResource) => string>,
			default: (resource: IResource) => resource.name,
		},
		resources: {
			type: Array as PropType<IResource[]>,
			default: (): IResource[] => [],
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		initialize: {
			type: Function as PropType<() => Promise<void>>,
			default: () => async () => {},
		},
		filters: {
			type: Object,
			default: (): IFilters => ({ search: '', homeProject: '' }),
		},
		additionalFiltersHandler: {
			type: Function,
			required: false,
			default: undefined,
		},
		shareable: {
			type: Boolean,
			default: true,
		},
		showFiltersDropdown: {
			type: Boolean,
			default: true,
		},
		sortFns: {
			type: Object as PropType<Record<string, (a: IResource, b: IResource) => number>>,
			default: (): Record<string, (a: IResource, b: IResource) => number> => ({}),
		},
		sortOptions: {
			type: Array as PropType<string[]>,
			default: () => ['lastUpdated', 'lastCreated', 'nameAsc', 'nameDesc'],
		},
		type: {
			type: String as PropType<'datatable' | 'list'>,
			default: 'list',
		},
		typeProps: {
			type: Object as PropType<{ itemSize: number } | { columns: DatatableColumn[] }>,
			default: () => ({
				itemSize: 80,
			}),
		},
	},
	emits: ['update:filters', 'click:add', 'sort'],
	setup(props, { emit }) {
		const route = useRoute();
		const i18n = useI18n();
		const { callDebounced } = useDebounce();
		const usersStore = useUsersStore();
		const telemetry = useTelemetry();

		const loading = ref(true);
		const sortBy = ref(props.sortOptions[0]);
		const hasFilters = ref(false);
		const filtersModel = ref(props.filters);
		const currentPage = ref(1);
		const rowsPerPage = ref<number | '*'>(10);
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
							: new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf();
					case 'lastCreated':
						return props.sortFns.lastCreated
							? props.sortFns.lastCreated(a, b)
							: new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf();
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
			return !!filterKeys.value.find(
				(key) =>
					key !== 'search' &&
					(Array.isArray(props.filters[key])
						? props.filters[key].length > 0
						: props.filters[key] !== ''),
			);
		};

		const setRowsPerPage = (numberOfRowsPerPage: number | '*') => {
			rowsPerPage.value = numberOfRowsPerPage;
		};

		const setCurrentPage = (page: number) => {
			currentPage.value = page;
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

		const onUpdateFilters = (e: Event) => {
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
			loading.value = false;
			await nextTick();

			focusSearchInput();

			if (hasAppliedFilters()) {
				hasFilters.value = true;
			}
		});

		return {
			loading,
			i18n,
			search,
			usersStore,
			filterKeys,
			currentPage,
			rowsPerPage,
			filteredAndSortedResources,
			hasFilters,
			sortBy,
			resettingFilters,
			filtersModel,
			sendFiltersTelemetry,
			getColumns,
			itemSize,
			onAddButtonClick,
			onUpdateFiltersLength,
			onUpdateFilters,
			resetFilters,
			callDebounced,
			setCurrentPage,
			setRowsPerPage,
			onSearch,
		};
	},
});
</script>

<style lang="scss" module>
.filters-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
}

.filters {
	display: grid;
	grid-auto-flow: column;
	grid-auto-columns: max-content;
	gap: var(--spacing-2xs);
	align-items: center;
}

.search {
	max-width: 240px;
}

.listWrapper {
	position: absolute;
	height: 100%;
	width: 100%;
}

.sort-and-filter {
	white-space: nowrap;
}

.header-loading {
	height: 36px;
}

.card-loading {
	height: 69px;
}

.datatable {
	padding-bottom: var(--spacing-s);
}
</style>
