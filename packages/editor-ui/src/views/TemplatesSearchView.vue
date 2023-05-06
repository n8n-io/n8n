<template>
	<TemplatesView>
		<template #header>
			<div :class="$style.wrapper">
				<div :class="$style.title">
					<n8n-heading tag="h1" size="2xlarge">
						{{ $locale.baseText('templates.heading') }}
					</n8n-heading>
				</div>
				<div :class="$style.button">
					<n8n-button
						size="large"
						:label="$locale.baseText('templates.newButton')"
						@click="openNewWorkflow"
					/>
				</div>
			</div>
		</template>
		<template #content>
			<div :class="$style.contentWrapper">
				<div :class="$style.filters">
					<TemplateFilters
						:categories="templatesStore.allCategories"
						:sortOnPopulate="areCategoriesPrepopulated"
						:loading="loadingCategories"
						:selected="categories"
						@clear="onCategoryUnselected"
						@clearAll="onCategoriesCleared"
						@select="onCategorySelected"
					/>
				</div>
				<div :class="$style.search">
					<n8n-input
						:value="search"
						:placeholder="$locale.baseText('templates.searchPlaceholder')"
						@input="onSearchInput"
						@blur="trackSearch"
						clearable
					>
						<template #prefix>
							<font-awesome-icon icon="search" />
						</template>
					</n8n-input>
					<div :class="$style.carouselContainer" v-show="collections.length || loadingCollections">
						<div :class="$style.header">
							<n8n-heading :bold="true" size="medium" color="text-light">
								{{ $locale.baseText('templates.collections') }}
								<span v-if="!loadingCollections" v-text="`(${collections.length})`" />
							</n8n-heading>
						</div>

						<CollectionsCarousel
							:collections="collections"
							:loading="loadingCollections"
							@openCollection="onOpenCollection"
						/>
					</div>
					<TemplateList
						:infinite-scroll-enabled="true"
						:loading="loadingWorkflows"
						:total-workflows="totalWorkflows"
						:workflows="workflows"
						@loadMore="onLoadMore"
						@openTemplate="onOpenTemplate"
					/>
					<div v-if="endOfSearchMessage" :class="$style.endText">
						<n8n-text size="medium" color="text-base">
							<span v-html="endOfSearchMessage" />
						</n8n-text>
					</div>
				</div>
			</div>
		</template>
	</TemplatesView>
</template>

<script lang="ts">
import CollectionsCarousel from '@/components/CollectionsCarousel.vue';
import TemplateFilters from '@/components/TemplateFilters.vue';
import TemplateList from '@/components/TemplateList.vue';
import TemplatesView from './TemplatesView.vue';

import { genericHelpers } from '@/mixins/genericHelpers';
import type {
	ITemplatesCollection,
	ITemplatesWorkflow,
	ITemplatesQuery,
	ITemplatesCategory,
} from '@/Interface';
import mixins from 'vue-typed-mixins';
import type { IDataObject } from 'n8n-workflow';
import { setPageTitle } from '@/utils';
import { VIEWS } from '@/constants';
import { debounceHelper } from '@/mixins/debounce';
import { mapStores } from 'pinia';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useTemplatesStore } from '@/stores/templates.store';
import { useUIStore } from '@/stores/ui.store';

interface ISearchEvent {
	search_string: string;
	workflow_results_count: number;
	collection_results_count: number;
	categories_applied: ITemplatesCategory[];
	wf_template_repo_session_id: string;
}

export default mixins(genericHelpers, debounceHelper).extend({
	name: 'TemplatesSearchView',
	components: {
		CollectionsCarousel,
		TemplateFilters,
		TemplateList,
		TemplatesView,
	},
	data() {
		return {
			areCategoriesPrepopulated: false,
			categories: [] as number[],
			loading: true,
			loadingCategories: true,
			loadingCollections: true,
			loadingWorkflows: true,
			search: '',
			searchEventToTrack: null as null | ISearchEvent,
			errorLoadingWorkflows: false,
		};
	},
	computed: {
		...mapStores(useSettingsStore, useTemplatesStore, useUIStore, useUsersStore),
		totalWorkflows(): number {
			return this.templatesStore.getSearchedWorkflowsTotal(this.query);
		},
		workflows(): ITemplatesWorkflow[] {
			return this.templatesStore.getSearchedWorkflows(this.query) || [];
		},
		collections(): ITemplatesCollection[] {
			return this.templatesStore.getSearchedCollections(this.query) || [];
		},
		endOfSearchMessage(): string | null {
			if (this.loadingWorkflows) {
				return null;
			}
			if (this.workflows.length && this.workflows.length >= this.totalWorkflows) {
				return this.$locale.baseText('templates.endResult');
			}
			if (
				!this.loadingCollections &&
				this.workflows.length === 0 &&
				this.collections.length === 0
			) {
				if (!this.settingsStore.isTemplatesEndpointReachable && this.errorLoadingWorkflows) {
					return this.$locale.baseText('templates.connectionWarning');
				}
				return this.$locale.baseText('templates.noSearchResults');
			}

			return null;
		},
		query(): ITemplatesQuery {
			return {
				categories: this.categories,
				search: this.search,
			};
		},
		nothingFound(): boolean {
			return (
				!this.loadingWorkflows &&
				!this.loadingCollections &&
				this.workflows.length === 0 &&
				this.collections.length === 0
			);
		},
	},
	methods: {
		onOpenCollection({ event, id }: { event: MouseEvent; id: string }) {
			this.navigateTo(event, VIEWS.COLLECTION, id);
		},
		onOpenTemplate({ event, id }: { event: MouseEvent; id: string }) {
			this.navigateTo(event, VIEWS.TEMPLATE, id);
		},
		navigateTo(e: MouseEvent, page: string, id: string) {
			if (e.metaKey || e.ctrlKey) {
				const route = this.$router.resolve({ name: page, params: { id } });
				window.open(route.href, '_blank');
				return;
			} else {
				this.$router.push({ name: page, params: { id } });
			}
		},
		updateSearch() {
			this.updateQueryParam(this.search, this.categories.join(','));
			this.loadWorkflowsAndCollections(false);
		},
		updateSearchTracking(search: string, categories: number[]) {
			if (!search) {
				return;
			}
			if (this.searchEventToTrack && this.searchEventToTrack.search_string.length > search.length) {
				return;
			}

			this.searchEventToTrack = {
				search_string: search,
				workflow_results_count: this.workflows.length,
				collection_results_count: this.collections.length,
				categories_applied: categories.map((categoryId) =>
					this.templatesStore.getCategoryById(categoryId.toString()),
				) as ITemplatesCategory[],
				wf_template_repo_session_id: this.templatesStore.currentSessionId,
			};
		},
		trackSearch() {
			if (this.searchEventToTrack) {
				this.$telemetry.track(
					'User searched workflow templates',
					this.searchEventToTrack as unknown as IDataObject,
				);
				this.searchEventToTrack = null;
			}
		},
		openNewWorkflow() {
			this.uiStore.nodeViewInitialized = false;
			this.$router.push({ name: VIEWS.NEW_WORKFLOW });
		},
		onSearchInput(search: string) {
			this.loadingWorkflows = true;
			this.loadingCollections = true;
			this.search = search;
			this.callDebounced('updateSearch', { debounceTime: 500, trailing: true });

			if (search.length === 0) {
				this.trackSearch();
			}
		},
		onCategorySelected(selected: number) {
			this.categories = this.categories.concat(selected);
			this.updateSearch();
			this.trackCategories();
		},
		onCategoryUnselected(selected: number) {
			this.categories = this.categories.filter((id) => id !== selected);
			this.updateSearch();
			this.trackCategories();
		},
		onCategoriesCleared() {
			this.categories = [];
			this.updateSearch();
		},
		trackCategories() {
			if (this.categories.length) {
				this.$telemetry.track('User changed template filters', {
					search_string: this.search,
					categories_applied: this.categories.map((categoryId: number) =>
						this.templatesStore.getCollectionById(categoryId.toString()),
					),
					wf_template_repo_session_id: this.templatesStore.currentSessionId,
				});
			}
		},
		updateQueryParam(search: string, category: string) {
			const query = Object.assign({}, this.$route.query);

			if (category.length) {
				query.categories = category;
			} else {
				delete query.categories;
			}

			if (search.length) {
				query.search = search;
			} else {
				delete query.search;
			}

			this.$router.replace({ query });
		},
		async onLoadMore() {
			if (this.workflows.length >= this.totalWorkflows) {
				return;
			}
			try {
				this.loadingWorkflows = true;
				await this.templatesStore.getMoreWorkflows({
					categories: this.categories,
					search: this.search,
				});
			} catch (e) {
				this.$showMessage({
					title: 'Error',
					message: 'Could not load more workflows',
					type: 'error',
				});
			} finally {
				this.loadingWorkflows = false;
			}
		},
		async loadCategories() {
			try {
				await this.templatesStore.getCategories();
			} catch (e) {}
			this.loadingCategories = false;
		},
		async loadCollections() {
			try {
				this.loadingCollections = true;
				await this.templatesStore.getCollections({
					categories: this.categories,
					search: this.search,
				});
			} catch (e) {}

			this.loadingCollections = false;
		},
		async loadWorkflows() {
			try {
				this.loadingWorkflows = true;
				await this.templatesStore.getWorkflows({
					search: this.search,
					categories: this.categories,
				});
				this.errorLoadingWorkflows = false;
			} catch (e) {
				this.errorLoadingWorkflows = true;
			}

			this.loadingWorkflows = false;
		},
		async loadWorkflowsAndCollections(initialLoad: boolean) {
			const search = this.search;
			const categories = [...this.categories];
			await Promise.all([this.loadWorkflows(), this.loadCollections()]);
			if (!initialLoad) {
				this.updateSearchTracking(search, categories);
			}
		},
		scrollTo(position: number, behavior: ScrollBehavior = 'smooth') {
			setTimeout(() => {
				const contentArea = document.getElementById('content');
				if (contentArea) {
					contentArea.scrollTo({
						top: position,
						behavior,
					});
				}
			}, 0);
		},
	},
	watch: {
		workflows(newWorkflows) {
			if (newWorkflows.length === 0) {
				this.scrollTo(0);
			}
		},
	},
	beforeRouteLeave(to, from, next) {
		const contentArea = document.getElementById('content');
		if (contentArea) {
			// When leaving this page, store current scroll position in route data
			if (
				this.$route.meta &&
				this.$route.meta.setScrollPosition &&
				typeof this.$route.meta.setScrollPosition === 'function'
			) {
				this.$route.meta.setScrollPosition(contentArea.scrollTop);
			}
		}

		this.trackSearch();
		next();
	},
	async mounted() {
		setPageTitle('n8n - Templates');
		this.loadCategories();
		this.loadWorkflowsAndCollections(true);
		this.usersStore.showPersonalizationSurvey();

		setTimeout(() => {
			// Check if there is scroll position saved in route and scroll to it
			if (this.$route.meta && this.$route.meta.scrollOffset > 0) {
				this.scrollTo(this.$route.meta.scrollOffset, 'auto');
			}
		}, 100);
	},
	async created() {
		if (this.$route.query.search && typeof this.$route.query.search === 'string') {
			this.search = this.$route.query.search;
		}

		if (typeof this.$route.query.categories === 'string' && this.$route.query.categories.length) {
			this.categories = this.$route.query.categories
				.split(',')
				.map((categoryId) => parseInt(categoryId, 10));
			this.areCategoriesPrepopulated = true;
		}
	},
});
</script>

<style lang="scss" module>
.wrapper {
	display: flex;
	justify-content: space-between;
}

.contentWrapper {
	display: flex;
	justify-content: space-between;

	@media (max-width: $breakpoint-xs) {
		flex-direction: column;
	}
}

.filters {
	width: 200px;
	margin-bottom: var(--spacing-xl);
}

.search {
	width: 100%;
	padding-left: var(--spacing-2xl);

	> * {
		margin-bottom: var(--spacing-l);
	}

	@media (max-width: $breakpoint-xs) {
		padding-left: 0;
	}
}

.header {
	margin-bottom: var(--spacing-2xs);
}
</style>
