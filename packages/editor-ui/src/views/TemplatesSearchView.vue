<template>
	<TemplatesView>
		<template v-slot:header>
			<div :class="$style.wrapper">
				<div :class="$style.title">
					<n8n-heading tag="h1" size="2xlarge">
						{{ $locale.baseText('templates.heading') }}
					</n8n-heading>
				</div>
				<div :class="$style.button">
					<n8n-button
						size="small"
						:label="$locale.baseText('templates.newButton')"
						@click="openNewWorkflow"
					/>
				</div>
			</div>
		</template>
		<template v-slot:content>
			<div :class="$style.contentWrapper">
				<div :class="$style.filters">
					<TemplateFilters
						:categories="allCategories"
						:loading="loadingCategories"
						:selected="categories"
						@clear="onCategoryUnselected"
						@clearAll="onCategoriesCleared"
						@select="onCategorySelected"
					/>
				</div>
				<div :class="$style.search">
					<n8n-input
						v-model="search"
						:placeholder="$locale.baseText('templates.searchPlaceholder')"
						@input="onSearchInput"
						clearable
					>
						<font-awesome-icon icon="search" slot="prefix" />
					</n8n-input>
					<CollectionsCarousel
						:collections="collections"
						:loading="loadingCollections"
						:navigate-to="navigateTo"
					/>
					<TemplateList
						:infinite-scroll-enabled="true"
						:loading="loadingWorkflows"
						:navigate-to="navigateTo"
						:total-workflows="totalWorkflows"
						:workflows="workflows"
						@loadMore="onLoadMore"
					/>
					<div v-if="endOfSearch" :class="$style.endText">
						<n8n-text size="medium" color="text-base">
							<span v-html="$locale.baseText('templates.endResult')" />
						</n8n-text>
					</div>
					<div v-else-if="nothingFound" :class="$style.endText">
						<n8n-text color="text-base">{{
							$locale.baseText('templates.noSearchResults')
						}}</n8n-text>
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

import { genericHelpers } from '@/components/mixins/genericHelpers';
import { ITemplatesCollection, ITemplatesWorkflow, ITemplatesQuery } from '@/Interface';
import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'TemplatesSearchView',
	components: {
		CollectionsCarousel,
		TemplateFilters,
		TemplateList,
		TemplatesView,
	},
	computed: {
		allCategories(): [] {
			return this.$store.getters['templates/allCategories'];
		},
		collections(): ITemplatesCollection[] {
			return this.$store.getters['templates/getSearchedCollections'](this.query) || [];
		},
		endOfSearch(): boolean {
			return !this.loadingWorkflows && !!this.workflows.length && this.workflows.length >= this.totalWorkflows;
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
		totalWorkflows(): number {
			return this.$store.getters['templates/getSearchedWorkflowsTotal'](this.query);
		},
		workflows(): ITemplatesWorkflow[] {
			return this.$store.getters['templates/getSearchedWorkflows'](this.query) || [];
		},
	},
	data() {
		return {
			categories: [] as number[],
			loading: true,
			loadingCategories: true,
			loadingCollections: true,
			loadingWorkflows: true,
			search: '',
		};
	},
	methods: {
		updateSearch() {
			this.updateQueryParam(this.search, this.categories.join(','));
			this.loadWorkflows();
			this.loadCollections();
		},
		trackSearch() {
			if (!this.search && !this.categories.length) {
				return;
			}
			const templateEvent = {
				search_string: this.search,
				workflow_results_count: this.totalWorkflows,
				collection_results_count: this.collections.length,
				categories_applied: this.categories.map((categoryId) =>
					this.$store.getters['templates/getCategoryById'](categoryId),
				),
				wf_template_repo_session_id: this.$store.getters['templates/currentSessionId'],
			};
			this.$telemetry.track('User searched workflow templates', templateEvent);
		},
		navigateTo(id: string, page: string, e: PointerEvent) {
			if (e.metaKey || e.ctrlKey) {
				const route = this.$router.resolve({ name: page, params: { id } });
				window.open(route.href, '_blank');
				return;
			} else {
				this.$router.push({ name: page, params: { id } });
			}
		},
		openNewWorkflow() {
			this.$router.push({ name: 'NodeViewNew' });
		},
		onSearchInput() {
			this.loadingWorkflows = true;
			this.loadingCollections = true;
			this.callDebounced('updateSearch', 500, true);
		},
		onCategorySelected(selected: number) {
			this.categories = this.categories.concat(selected);
			this.updateSearch();
		},
		onCategoryUnselected(selected: number) {
			this.categories = this.categories.filter((id) => id !== selected);
			this.updateSearch();
		},
		onCategoriesCleared() {
			this.categories = [];
			this.updateSearch();
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
				await this.$store.dispatch('templates/getMoreWorkflows', {
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
				await this.$store.dispatch('templates/getCategories');
			} catch (e) {
			}

			this.loadingCategories = false;
		},
		async loadCollections() {
			try {
				this.loadingCollections = true;
				await this.$store.dispatch('templates/getCollections', {
					categories: this.categories,
					search: this.search,
				});
			} catch (e) {
			}

			this.loadingCollections = false;
		},
		async loadWorkflows() {
			try {
				this.loadingWorkflows = true;
				await this.$store.dispatch('templates/getWorkflows', {
					categories: this.categories,
					search: this.search,
				});
				this.trackSearch();
			} catch (e) {
			}

			this.loadingWorkflows = false;
		},
		scrollToTop() {
			setTimeout(() => {
				window.scrollTo({
					top: 0,
					behavior: 'smooth',
				});
			}, 100);
		},
	},
	watch: {
		workflows(newWorkflows) {
			if (newWorkflows.length === 0) {
				this.scrollToTop();
			}
		},
	},
	async mounted() {
		this.loadCategories();
		this.loadCollections();
		this.loadWorkflows();
	},
	async created() {
		if (this.$route.query.search && typeof this.$route.query.search === 'string') {
			this.search = this.$route.query.search;
		}

		if (typeof this.$route.query.categories === 'string' && this.$route.query.categories.length) {
			this.categories = this.$route.query.categories.split(',').map((categoryId) => parseInt(categoryId, 10));
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

	@media (max-width: $--breakpoint-xs) {
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

	@media (max-width: $--breakpoint-xs) {
		padding-left: 0;
	}
}

</style>
