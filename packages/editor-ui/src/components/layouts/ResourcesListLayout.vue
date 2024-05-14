<template>
	<PageViewLayout>
		<template #header>
			<slot name="header" />
		</template>
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
								usersStore.currentUser.firstName
									? `${resourceKey}.empty.heading`
									: `${resourceKey}.empty.heading.userNotSetup`,
								{
									interpolate: { name: usersStore.currentUser.firstName },
								},
							)
						"
						:description="i18n.baseText(`${resourceKey}.empty.description`)"
						:button-text="i18n.baseText(`${resourceKey}.empty.button`)"
						button-type="secondary"
						@click:button="$emit('click:add', $event)"
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
								:placeholder="i18n.baseText(`${resourceKey}.search.placeholder`)"
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
								@update:model-value="$emit('update:filters', $event)"
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
										:label="i18n.baseText(`${resourceKey}.sort.${sortOption}`)"
									/>
								</n8n-select>
							</div>
						</div>
						<slot name="add-button" :disabled="disabled">
							<n8n-button
								size="large"
								:disabled="disabled"
								data-test-id="resources-list-add"
								@click="$emit('click:add', $event)"
							>
								{{ i18n.baseText(`${resourceKey}.add`) }}
							</n8n-button>
						</slot>
					</div>

					<slot name="callout"></slot>

					<div v-if="showFiltersDropdown" v-show="hasFilters" class="mt-xs">
						<n8n-info-tip :bold="false">
							{{ i18n.baseText(`${resourceKey}.filters.active`) }}
							<n8n-link data-test-id="workflows-filter-reset" size="small" @click="resetFilters">
								{{ i18n.baseText(`${resourceKey}.filters.active.reset`) }}
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
						:item-size="typeProps.itemSize"
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
						v-if="typeProps.columns"
						data-test-id="resources-table"
						:class="$style.datatable"
						:columns="typeProps.columns"
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
					{{ i18n.baseText(`${resourceKey}.noResults`) }}
				</n8n-text>

				<slot name="postamble" />
			</PageViewLayoutList>
		</template>
	</PageViewLayout>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';

import type { ProjectSharingData } from '@/features/projects/projects.types';
import PageViewLayout from '@/components/layouts/PageViewLayout.vue';
import PageViewLayoutList from '@/components/layouts/PageViewLayoutList.vue';
import { EnterpriseEditionFeature } from '@/constants';
import ResourceFiltersDropdown from '@/components/forms/ResourceFiltersDropdown.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import type { N8nInput, DatatableColumn } from 'n8n-design-system';
import { useI18n } from '@/composables/useI18n';
import { useDebounce } from '@/composables/useDebounce';

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
type SearchRef = InstanceType<typeof N8nInput>;

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
			type: Array,
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
	setup() {
		const i18n = useI18n();
		const { callDebounced } = useDebounce();

		return {
			i18n,
			callDebounced,
		};
	},
	data() {
		return {
			loading: true,
			sortBy: this.sortOptions[0],
			hasFilters: false,
			filtersModel: { ...this.filters },
			currentPage: 1,
			rowsPerPage: 10 as number | '*',
			resettingFilters: false,
			EnterpriseEditionFeature,
		};
	},
	computed: {
		...mapStores(useSettingsStore, useUsersStore),
		filterKeys(): string[] {
			return Object.keys(this.filtersModel);
		},
		filteredAndSortedResources(): IResource[] {
			const filtered: IResource[] = this.resources.filter((resource: IResource) => {
				let matches = true;

				if (this.filtersModel.homeProject) {
					matches =
						matches &&
						!!(resource.homeProject && resource.homeProject.id === this.filtersModel.homeProject);
				}

				if (this.filtersModel.search) {
					const searchString = this.filtersModel.search.toLowerCase();

					matches = matches && this.displayName(resource).toLowerCase().includes(searchString);
				}

				if (this.additionalFiltersHandler) {
					matches = this.additionalFiltersHandler(resource, this.filtersModel, matches);
				}

				return matches;
			});

			return filtered.sort((a, b) => {
				switch (this.sortBy) {
					case 'lastUpdated':
						return this.sortFns.lastUpdated
							? this.sortFns.lastUpdated(a, b)
							: new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf();
					case 'lastCreated':
						return this.sortFns.lastCreated
							? this.sortFns.lastCreated(a, b)
							: new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf();
					case 'nameAsc':
						return this.sortFns.nameAsc
							? this.sortFns.nameAsc(a, b)
							: this.displayName(a).trim().localeCompare(this.displayName(b).trim());
					case 'nameDesc':
						return this.sortFns.nameDesc
							? this.sortFns.nameDesc(a, b)
							: this.displayName(b).trim().localeCompare(this.displayName(a).trim());
					default:
						return this.sortFns[this.sortBy] ? this.sortFns[this.sortBy](a, b) : 0;
				}
			});
		},
	},
	watch: {
		filters(value) {
			this.filtersModel = value;
		},
		'filtersModel.homeProject'() {
			this.sendFiltersTelemetry('homeProject');
		},
		'filtersModel.search'() {
			void this.callDebounced(
				this.sendFiltersTelemetry,
				{ debounceTime: 1000, trailing: true },
				'search',
			);
		},
		sortBy(newValue) {
			this.$emit('sort', newValue);
			this.sendSortingTelemetry();
		},
		'$route.params.projectId'() {
			this.resetFilters();
		},
	},
	mounted() {
		void this.onMounted();
	},
	methods: {
		async onMounted() {
			await this.initialize();

			this.loading = false;
			await this.$nextTick();
			this.focusSearchInput();

			if (this.hasAppliedFilters()) {
				this.hasFilters = true;
			}
		},
		hasAppliedFilters(): boolean {
			return !!this.filterKeys.find(
				(key) =>
					key !== 'search' &&
					(Array.isArray(this.filters[key])
						? this.filters[key].length > 0
						: this.filters[key] !== ''),
			);
		},
		setCurrentPage(page: number) {
			this.currentPage = page;
		},
		setRowsPerPage(rowsPerPage: number | '*') {
			this.rowsPerPage = rowsPerPage;
		},
		resetFilters() {
			Object.keys(this.filtersModel).forEach((key) => {
				this.filtersModel[key] = Array.isArray(this.filtersModel[key]) ? [] : '';
			});

			this.resettingFilters = true;
			this.sendFiltersTelemetry('reset');
			this.$emit('update:filters', this.filtersModel);
		},
		focusSearchInput() {
			if (this.$refs.search) {
				(this.$refs.search as SearchRef).focus();
			}
		},
		sendSortingTelemetry() {
			this.$telemetry.track(`User changed sorting in ${this.resourceKey} list`, {
				sorting: this.sortBy,
			});
		},
		sendFiltersTelemetry(source: string) {
			// Prevent sending multiple telemetry events when resetting filters
			// Timeout is required to wait for search debounce to be over
			if (this.resettingFilters) {
				if (source !== 'reset') {
					return;
				}

				setTimeout(() => (this.resettingFilters = false), 1500);
			}

			const filters = this.filtersModel as Record<string, string[] | string | boolean>;
			const filtersSet: string[] = [];
			const filterValues: Array<string[] | string | boolean | null> = [];

			Object.keys(filters).forEach((key) => {
				if (filters[key]) {
					filtersSet.push(key);
					filterValues.push(key === 'search' ? null : filters[key]);
				}
			});

			this.$telemetry.track(`User set filters in ${this.resourceKey} list`, {
				filters_set: filtersSet,
				filter_values: filterValues,
				[`${this.resourceKey}_total_in_view`]: this.resources.length,
				[`${this.resourceKey}_after_filtering`]: this.filteredAndSortedResources.length,
			});
		},
		onUpdateFiltersLength(length: number) {
			this.hasFilters = length > 0;
		},
		onSearch(search: string) {
			this.filtersModel.search = search;
			this.$emit('update:filters', this.filtersModel);
		},
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
