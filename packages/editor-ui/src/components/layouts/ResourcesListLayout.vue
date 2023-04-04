<template>
	<page-view-layout>
		<template #aside v-if="showAside">
			<div :class="[$style['heading-wrapper'], 'mb-xs']">
				<n8n-heading size="2xlarge">
					{{ $locale.baseText(`${resourceKey}.heading`) }}
				</n8n-heading>
			</div>

			<div class="mt-xs mb-l">
				<n8n-button
					size="large"
					block
					@click="$emit('click:add', $event)"
					data-test-id="resources-list-add"
				>
					{{ $locale.baseText(`${resourceKey}.add`) }}
				</n8n-button>
			</div>

			<enterprise-edition :features="[EnterpriseEditionFeature.Sharing]" v-if="shareable">
				<resource-ownership-select
					v-model="isOwnerSubview"
					:my-resources-label="$locale.baseText(`${resourceKey}.menu.my`)"
					:all-resources-label="$locale.baseText(`${resourceKey}.menu.all`)"
				/>
			</enterprise-edition>
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
							$locale.baseText(
								usersStore.currentUser.firstName
									? `${resourceKey}.empty.heading`
									: `${resourceKey}.empty.heading.userNotSetup`,
								{
									interpolate: { name: usersStore.currentUser.firstName },
								},
							)
						"
						:description="$locale.baseText(`${resourceKey}.empty.description`)"
						:buttonText="$locale.baseText(`${resourceKey}.empty.button`)"
						buttonType="secondary"
						@click="$emit('click:add', $event)"
					/>
				</slot>
			</div>
			<page-view-layout-list v-else>
				<template #header>
					<div class="mb-xs">
						<div :class="$style['filters-row']">
							<n8n-input
								:class="[$style['search'], 'mr-2xs']"
								:placeholder="$locale.baseText(`${resourceKey}.search.placeholder`)"
								v-model="filters.search"
								size="medium"
								clearable
								ref="search"
								data-test-id="resources-list-search"
							>
								<template #prefix>
									<n8n-icon icon="search" />
								</template>
							</n8n-input>
							<div :class="$style['sort-and-filter']">
								<n8n-select v-model="sortBy" size="medium" data-test-id="resources-list-sort">
									<n8n-option
										value="lastUpdated"
										:label="$locale.baseText(`${resourceKey}.sort.lastUpdated`)"
									/>
									<n8n-option
										value="lastCreated"
										:label="$locale.baseText(`${resourceKey}.sort.lastCreated`)"
									/>
									<n8n-option
										value="nameAsc"
										:label="$locale.baseText(`${resourceKey}.sort.nameAsc`)"
									/>
									<n8n-option
										value="nameDesc"
										:label="$locale.baseText(`${resourceKey}.sort.nameDesc`)"
									/>
								</n8n-select>
								<resource-filters-dropdown
									:keys="filterKeys"
									:reset="resetFilters"
									:value="filters"
									:shareable="shareable"
									@input="$emit('update:filters', $event)"
									@update:filtersLength="onUpdateFiltersLength"
								>
									<template #default="resourceFiltersSlotProps">
										<slot name="filters" v-bind="resourceFiltersSlotProps" />
									</template>
								</resource-filters-dropdown>
							</div>
						</div>
					</div>

					<slot name="callout"></slot>

					<div v-show="hasFilters" class="mt-xs">
						<n8n-info-tip :bold="false">
							{{ $locale.baseText(`${resourceKey}.filters.active`) }}
							<n8n-link @click="resetFilters" size="small">
								{{ $locale.baseText(`${resourceKey}.filters.active.reset`) }}
							</n8n-link>
						</n8n-info-tip>
					</div>

					<div class="pb-xs" />
				</template>

				<n8n-recycle-scroller
					v-if="filteredAndSortedSubviewResources.length > 0"
					data-test-id="resources-list"
					:class="[$style.list, 'list-style-none']"
					:items="filteredAndSortedSubviewResources"
					:item-size="itemSize"
					item-key="id"
				>
					<template #default="{ item, updateItemSize }">
						<slot :data="item" :updateItemSize="updateItemSize" />
					</template>
				</n8n-recycle-scroller>

				<n8n-text color="text-base" size="medium" data-test-id="resources-list-empty" v-else>
					{{ $locale.baseText(`${resourceKey}.noResults`) }}
					<template v-if="shouldSwitchToAllSubview">
						<span v-if="!filters.search">
							({{ $locale.baseText(`${resourceKey}.noResults.switchToShared.preamble`) }}
							<n8n-link @click="setOwnerSubview(false)">
								{{ $locale.baseText(`${resourceKey}.noResults.switchToShared.link`) }} </n8n-link
							>)
						</span>

						<span v-else>
							({{
								$locale.baseText(`${resourceKey}.noResults.withSearch.switchToShared.preamble`)
							}}
							<n8n-link @click="setOwnerSubview(false)">
								{{
									$locale.baseText(`${resourceKey}.noResults.withSearch.switchToShared.link`)
								}} </n8n-link
							>)
						</span>
					</template>
				</n8n-text>
			</page-view-layout-list>
		</template>
	</page-view-layout>
</template>

<script lang="ts">
import { showMessage } from '@/mixins/showMessage';
import { IUser } from '@/Interface';
import mixins from 'vue-typed-mixins';

import PageViewLayout from '@/components/layouts/PageViewLayout.vue';
import PageViewLayoutList from '@/components/layouts/PageViewLayoutList.vue';
import { EnterpriseEditionFeature } from '@/constants';
import TemplateCard from '@/components/TemplateCard.vue';
import Vue, { PropType } from 'vue';
import { debounceHelper } from '@/mixins/debounce';
import ResourceOwnershipSelect from '@/components/forms/ResourceOwnershipSelect.ee.vue';
import ResourceFiltersDropdown from '@/components/forms/ResourceFiltersDropdown.vue';
import { mapStores } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import { useUsersStore } from '@/stores/users';

export interface IResource {
	id: string;
	name: string;
	updatedAt: string;
	createdAt: string;
	ownedBy?: Partial<IUser>;
	sharedWith?: Array<Partial<IUser>>;
}

interface IFilters {
	search: string;
	ownedBy: string;
	sharedWith: string;

	[key: string]: boolean | string | string[];
}

type IResourceKeyType = 'credentials' | 'workflows';

const filterKeys = ['ownedBy', 'sharedWith'];

export default mixins(showMessage, debounceHelper).extend({
	name: 'resources-list-layout',
	components: {
		TemplateCard,
		PageViewLayout,
		PageViewLayoutList,
		ResourceOwnershipSelect,
		ResourceFiltersDropdown,
	},
	props: {
		resourceKey: {
			type: String,
			default: '' as IResourceKeyType,
		},
		resources: {
			type: Array,
			default: (): IResource[] => [],
		},
		itemSize: {
			type: Number,
			default: 80,
		},
		initialize: {
			type: Function as PropType<() => Promise<void>>,
			default: () => () => Promise.resolve(),
		},
		filters: {
			type: Object,
			default: (): IFilters => ({ search: '', ownedBy: '', sharedWith: '' }),
		},
		additionalFiltersHandler: {
			type: Function,
		},
		showAside: {
			type: Boolean,
			default: true,
		},
		shareable: {
			type: Boolean,
			default: true,
		},
	},
	data() {
		return {
			loading: true,
			isOwnerSubview: false,
			sortBy: 'lastUpdated',
			hasFilters: false,
			resettingFilters: false,
			EnterpriseEditionFeature,
		};
	},
	computed: {
		...mapStores(useSettingsStore, useUsersStore),
		subviewResources(): IResource[] {
			if (!this.shareable) {
				return this.resources as IResource[];
			}

			return (this.resources as IResource[]).filter((resource) => {
				if (
					this.isOwnerSubview &&
					this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)
				) {
					return !!(resource.ownedBy && resource.ownedBy.id === this.usersStore.currentUser?.id);
				}

				return true;
			});
		},
		filterKeys(): string[] {
			return Object.keys(this.filters);
		},
		filteredAndSortedSubviewResources(): IResource[] {
			const filtered: IResource[] = this.subviewResources.filter((resource: IResource) => {
				let matches = true;

				if (this.filters.ownedBy) {
					matches = matches && !!(resource.ownedBy && resource.ownedBy.id === this.filters.ownedBy);
				}

				if (this.filters.sharedWith) {
					matches =
						matches &&
						!!(
							resource.sharedWith &&
							resource.sharedWith.find((sharee) => sharee.id === this.filters.sharedWith)
						);
				}

				if (this.filters.search) {
					const searchString = this.filters.search.toLowerCase();

					matches = matches && resource.name.toLowerCase().includes(searchString);
				}

				if (this.additionalFiltersHandler) {
					matches = this.additionalFiltersHandler(resource, this.filters, matches);
				}

				return matches;
			});

			return filtered.sort((a, b) => {
				switch (this.sortBy) {
					case 'lastUpdated':
						return new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf();
					case 'lastCreated':
						return new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf();
					case 'nameAsc':
						return a.name.trim().localeCompare(b.name.trim());
					case 'nameDesc':
						return b.name.localeCompare(a.name);
					default:
						return 0;
				}
			});
		},
		resourcesNotOwned(): IResource[] {
			return (this.resources as IResource[]).filter((resource) => {
				return resource.ownedBy && resource.ownedBy.id !== this.usersStore.currentUser?.id;
			});
		},
		shouldSwitchToAllSubview(): boolean {
			return !this.hasFilters && this.isOwnerSubview && this.resourcesNotOwned.length > 0;
		},
	},
	methods: {
		async onMounted() {
			await this.initialize();

			this.loading = false;
			this.$nextTick(this.focusSearchInput);
		},
		resetFilters() {
			Object.keys(this.filters).forEach((key) => {
				this.filters[key] = Array.isArray(this.filters[key]) ? [] : '';
			});

			this.resettingFilters = true;
			this.sendFiltersTelemetry('reset');
		},
		focusSearchInput() {
			if (this.$refs.search) {
				(this.$refs.search as Vue & { focus: () => void }).focus();
			}
		},
		setOwnerSubview(active: boolean) {
			this.isOwnerSubview = active;
		},
		getTelemetrySubview(): string {
			return this.$locale.baseText(
				`${this.resourceKey as IResourceKeyType}.menu.${this.isOwnerSubview ? 'my' : 'all'}`,
			);
		},
		sendSubviewTelemetry() {
			this.$telemetry.track(`User changed ${this.resourceKey} sub view`, {
				sub_view: this.getTelemetrySubview(),
			});
		},
		sendSortingTelemetry() {
			this.$telemetry.track(`User changed sorting in ${this.resourceKey} list`, {
				sub_view: this.getTelemetrySubview(),
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

			const filters = this.filters as Record<string, string[] | string | boolean>;
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
				sub_view: this.getTelemetrySubview(),
				[`${this.resourceKey}_total_in_view`]: this.subviewResources.length,
				[`${this.resourceKey}_after_filtering`]: this.filteredAndSortedSubviewResources.length,
			});
		},
		onUpdateFiltersLength(length: number) {
			this.hasFilters = length > 0;
		},
	},
	mounted() {
		this.onMounted();
	},
	watch: {
		isOwnerSubview() {
			this.sendSubviewTelemetry();
		},
		'filters.ownedBy'(value) {
			if (value) {
				this.setOwnerSubview(false);
			}
			this.sendFiltersTelemetry('ownedBy');
		},
		'filters.sharedWith'() {
			this.sendFiltersTelemetry('sharedWith');
		},
		'filters.search'() {
			this.callDebounced('sendFiltersTelemetry', { debounceTime: 1000, trailing: true }, 'search');
		},
		sortBy() {
			this.sendSortingTelemetry();
		},
	},
});
</script>

<style lang="scss" module>
.heading-wrapper {
	padding-bottom: 1px; // Match input height
}

.filters-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
}

.search {
	max-width: 240px;
}

.list {
	//display: flex;
	//flex-direction: column;
}

.sort-and-filter {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
}

.header-loading {
	height: 36px;
}

.card-loading {
	height: 69px;
}
</style>
