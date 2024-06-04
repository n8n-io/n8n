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
						type="secondary"
						element="a"
						:href="creatorHubUrl"
						:label="$locale.baseText('templates.shareWorkflow')"
						target="_blank"
					/>
				</div>
			</div>
		</template>
		<template #content>
			<div :class="$style.contentWrapper">
				<div :class="$style.filters">
					<TemplateFilters
						:categories="templatesStore.allCategories"
						:sort-on-populate="areCategoriesPrepopulated"
						:selected="categories"
						:loading="loadingCategories"
						@clear="onCategoryUnselected"
						@clear-all="onCategoriesCleared"
						@select="onCategorySelected"
					/>
				</div>
				<div :class="$style.search">
					<n8n-input
						:model-value="search"
						:placeholder="$locale.baseText('templates.searchPlaceholder')"
						clearable
						data-test-id="template-search-input"
						@update:model-value="onSearchInput"
						@blur="trackSearch"
					>
						<template #prefix>
							<font-awesome-icon icon="search" />
						</template>
					</n8n-input>
					<div v-show="collections.length || loadingCollections" :class="$style.carouselContainer">
						<div :class="$style.header">
							<n8n-heading :bold="true" size="medium" color="text-light">
								{{ $locale.baseText('templates.collections') }}
								<span
									v-if="!loadingCollections"
									data-test-id="collection-count-label"
									v-text="`(${collections.length})`"
								/>
							</n8n-heading>
						</div>
						<TemplatesInfoCarousel
							:collections="collections"
							:loading="loadingCollections"
							@open-collection="onOpenCollection"
						/>
					</div>
					<TemplateList
						:infinite-scroll-enabled="true"
						:loading="loadingWorkflows"
						:workflows="workflows"
						:total-count="totalWorkflows"
						@load-more="onLoadMore"
						@open-template="onOpenTemplate"
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
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import TemplatesInfoCarousel from '@/components/TemplatesInfoCarousel.vue';
import TemplateFilters from '@/components/TemplateFilters.vue';
import TemplateList from '@/components/TemplateList.vue';
import TemplatesView from '@/views/TemplatesView.vue';

import type {
	ITemplatesCollection,
	ITemplatesWorkflow,
	ITemplatesQuery,
	ITemplatesCategory,
} from '@/Interface';
import type { IDataObject } from 'n8n-workflow';
import { setPageTitle } from '@/utils/htmlUtils';
import { CREATOR_HUB_URL, VIEWS } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useTemplatesStore } from '@/stores/templates.store';
import { useUIStore } from '@/stores/ui.store';
import { useToast } from '@/composables/useToast';
import { usePostHog } from '@/stores/posthog.store';
import { useDebounce } from '@/composables/useDebounce';

interface ISearchEvent {
	search_string: string;
	workflow_results_count: number;
	collection_results_count: number;
	categories_applied: ITemplatesCategory[];
	wf_template_repo_session_id: string;
}

export default defineComponent({
	name: 'TemplatesSearchView',
	components: {
		TemplatesInfoCarousel,
		TemplateFilters,
		TemplateList,
		TemplatesView,
	},
	setup() {
		const { callDebounced } = useDebounce();

		return {
			callDebounced,
			...useToast(),
		};
	},
	data() {
		return {
			areCategoriesPrepopulated: false,
			categories: [] as ITemplatesCategory[],
			loading: true,
			loadingCategories: true,
			loadingCollections: true,
			loadingWorkflows: true,
			search: '',
			searchEventToTrack: null as null | ISearchEvent,
			errorLoadingWorkflows: false,
			creatorHubUrl: CREATOR_HUB_URL as string,
		};
	},
	computed: {
		...mapStores(useSettingsStore, useTemplatesStore, useUIStore, useUsersStore, usePostHog),
		totalWorkflows(): number {
			return this.templatesStore.getSearchedWorkflowsTotal(this.createQueryObject('name'));
		},
		workflows(): ITemplatesWorkflow[] {
			return this.templatesStore.getSearchedWorkflows(this.createQueryObject('name')) ?? [];
		},
		collections(): ITemplatesCollection[] {
			return this.templatesStore.getSearchedCollections(this.createQueryObject('id')) ?? [];
		},
		endOfSearchMessage(): string | null {
			if (this.loadingWorkflows) {
				return null;
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
		nothingFound(): boolean {
			return (
				!this.loadingWorkflows &&
				!this.loadingCollections &&
				this.workflows.length === 0 &&
				this.collections.length === 0
			);
		},
	},
	watch: {
		workflows(newWorkflows) {
			if (newWorkflows.length === 0) {
				this.scrollTo(0);
			}
		},
	},
	async mounted() {
		setPageTitle('n8n - Templates');
		await this.loadCategories();
		void this.loadWorkflowsAndCollections(true);
		void this.usersStore.showPersonalizationSurvey();

		this.restoreSearchFromRoute();

		setTimeout(() => {
			// Check if there is scroll position saved in route and scroll to it
			const scrollOffset = this.$route.meta?.scrollOffset;
			if (typeof scrollOffset === 'number' && scrollOffset > 0) {
				this.scrollTo(scrollOffset, 'auto');
			}
		}, 100);
	},
	methods: {
		createQueryObject(categoryId: 'name' | 'id'): ITemplatesQuery {
			// We are using category names for template search and ids for collection search
			return {
				categories: this.categories.map((category) =>
					categoryId === 'name' ? category.name : String(category.id),
				),
				search: this.search,
			};
		},
		restoreSearchFromRoute() {
			let updateSearch = false;
			if (this.$route.query.search && typeof this.$route.query.search === 'string') {
				this.search = this.$route.query.search;
				updateSearch = true;
			}
			if (typeof this.$route.query.categories === 'string' && this.$route.query.categories.length) {
				const categoriesFromURL = this.$route.query.categories.split(',');
				this.categories = this.templatesStore.allCategories.filter((category) =>
					categoriesFromURL.includes(category.id.toString()),
				);
				updateSearch = true;
			}
			if (updateSearch) {
				this.updateSearch();
				this.trackCategories();
				this.areCategoriesPrepopulated = true;
			}
		},
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
				void this.$router.push({ name: page, params: { id } });
			}
		},
		updateSearch() {
			this.updateQueryParam(this.search, this.categories.map((category) => category.id).join(','));
			void this.loadWorkflowsAndCollections(false);
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
		onSearchInput(search: string) {
			this.loadingWorkflows = true;
			this.loadingCollections = true;
			this.search = search;
			void this.callDebounced(this.updateSearch, {
				debounceTime: 500,
				trailing: true,
			});

			if (search.length === 0) {
				this.trackSearch();
			}
		},
		onCategorySelected(selected: ITemplatesCategory) {
			this.categories = this.categories.concat(selected);
			this.updateSearch();
			this.trackCategories();
		},
		onCategoryUnselected(selected: ITemplatesCategory) {
			this.categories = this.categories.filter((category) => category.id !== selected.id);
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
					categories_applied: this.categories,
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

			void this.$router.replace({ query });
		},
		async onLoadMore() {
			if (this.workflows.length >= this.totalWorkflows) {
				return;
			}
			try {
				this.loadingWorkflows = true;
				await this.templatesStore.getMoreWorkflows({
					categories: this.categories.map((category) => category.name),
					search: this.search,
				});
			} catch (e) {
				this.showMessage({
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
					categories: this.categories.map((category) => String(category.id)),
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
					categories: this.categories.map((category) => category.name),
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
				this.updateSearchTracking(
					search,
					categories.map((category) => category.id),
				);
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
	beforeRouteLeave(to, from, next) {
		const contentArea = document.getElementById('content');
		if (contentArea) {
			// When leaving this page, store current scroll position in route data
			if (
				this.$route.meta?.setScrollPosition &&
				typeof this.$route.meta.setScrollPosition === 'function'
			) {
				this.$route.meta.setScrollPosition(contentArea.scrollTop);
			}
		}

		this.trackSearch();
		next();
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
	margin-right: var(--spacing-2xl);
}

.search {
	width: 100%;

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
