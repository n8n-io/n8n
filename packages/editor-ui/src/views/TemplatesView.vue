<template>
	<div :class="$style.template">
		<div :class="[$style.container, !isMenuCollapsed ? $style.expanded : '']">
			<div :class="$style.header">
				<div :class="$style.wrapper">
					<div :class="$style.title">
						<n8n-heading tag="h1" size="2xlarge">
							{{ $locale.baseText('templates.heading') }}
						</n8n-heading>
					</div>
					<div :class="$style.button">
						<n8n-button
							size="small"
							type="primary"
							:label="$locale.baseText('templates.newButton')"
							:transparentBackground="false"
							@click="openNewWorkflow"
						/>
					</div>
				</div>
			</div>
			<div :class="$style.content">
				<div :class="$style.filters">
					<TemplateFilters :setCategories="setCategories" :loading="loadingCategories" />
				</div>
				<div :class="$style.search">
					<div :class="$style.input">
						<n8n-input
							v-model="search"
							:placeholder="$locale.baseText('templates.searchPlaceholder')"
							@input="onSearchInput"
							clearable
						>
							<font-awesome-icon icon="search" slot="prefix" />
						</n8n-input>
					</div>
					<div :class="$style.carousel">
						<CollectionsCarousel
							:collections="collections"
							:loading="loadingCollections"
							:navigate-to="navigateTo"
						/>
						<TemplateList
							:abbreviate-number="abbreviateNumber"
							:categories="categories"
							:infinite-scroll-enabled="true"
							:loading="loadingWorkflows"
							:navigate-to="navigateTo"
							:search="search"
							:total-workflows="totalWorkflows"
							:workflows="workflows"
						/>
						<div v-if="!workflows.length && !loadingWorkflows">
							<n8n-text color="text-base">{{
								$locale.baseText('templates.noSearchResults')
							}}</n8n-text>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import CollectionsCarousel from '@/components/CollectionsCarousel.vue';
import TemplateFilters from '@/components/TemplateFilters.vue';
import TemplateList from '@/components/TemplateList.vue';

import { genericHelpers } from '@/components/mixins/genericHelpers';
import { abbreviateNumber } from '@/components/helpers';
import mixins from 'vue-typed-mixins';
import { IN8nSearchData, ITemplatesQuery } from '@/Interface';

export default mixins(genericHelpers).extend({
	name: 'TemplatesView',
	components: {
		CollectionsCarousel,
		TemplateFilters,
		TemplateList,
	},
	computed: {
		allCategories(): [] {
			return this.$store.getters['templates/allCategories'];
		},
		query(): ITemplatesQuery {
			return {
				categories: this.categories,
				search: this.search,
			};
		},
		collections(): [] {
			return this.$store.getters['templates/getSearchedCollections'](this.query);
		},
		isMenuCollapsed(): boolean {
			return this.$store.getters['ui/sidebarMenuCollapsed'];
		},
		totalWorkflows(): number {
			return this.$store.getters['templates/getSearchedWorkflowsTotal'](this.query);
		},
		workflows(): [] {
			return this.$store.getters['templates/getSearchedWorkflows'](this.query);
		},
	},
	data() {
		return {
			categories: [] as string[],
			loading: true,
			loadingCategories: true,
			loadingCollections: true,
			loadingWorkflows: true,
			search: '',
		};
	},
	methods: {
		abbreviateNumber,
		async updateSearch() {
			this.updateQueryParam(this.search, this.categories.join(','));
			await this.loadWorkflows();
			this.trackSearch();
		},
		trackSearch() {
			if (!this.search || !this.categories.length) {
				return;
			}
			const templateEvent = {
				search_string: this.search,
				results_count: this.workflows.length,
				categories_applied: this.categories.map((categoryId) => this.$store.getters['templates/getCategoryById'](categoryId)),
				wf_template_repo_session_id: 0, // todo get session id as prop
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
		async onSearchInput() {
			this.callDebounced('updateSearch', 500, true);
		},
		async setCategories(selected: string[]) {
			this.categories = selected;
			await this.updateSearch();
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
		async loadCategories() {
			try {
				await this.$store.dispatch('templates/getCategories');
			} catch (e) {
				this.$showMessage({
					title: 'Error',
					message: 'Could not load categories',
					type: 'error',
				});
			} finally {
				this.loadingCategories = false;
			}
		},
		async loadCollections() {
			try {
				await this.$store.dispatch('templates/getCollections', {categories: this.categories, search: this.search});
			} catch (e) {
				this.$showMessage({
					title: 'Error',
					message: 'Could not load collections',
					type: 'error',
				});
			} finally {
				this.loadingCollections = false;
			}
		},
		async loadWorkflows() {
			try {
				this.loadingWorkflows = true;
				await this.$store.dispatch('templates/getWorkflows', {categories: this.categories, search: this.search});
				this.trackSearch();
			} catch (e) {
				this.$showMessage({
					title: 'Error',
					message: 'Could not load workflows',
					type: 'error',
				});
			} finally {
				this.loadingWorkflows = false;
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
			this.categories = this.$route.query.categories.split(',');
		}
	},
});
</script>

<style lang="scss" module>
.template {
	width: calc(100vw - 20px);
	height: 100%;
	min-height: 100vh;
	position: relative;
	display: flex;
	justify-content: center;
	background-color: var(--color-background-light);
}

.container {
	width: 100%;
	max-width: 1024px;
	margin: 0 var(--spacing-3xl) 0 129px;
	padding: var(--spacing-3xl) 0 var(--spacing-3xl);

	@media (max-width: $--breakpoint-md) {
		width: 900px;
		margin: 0 var(--spacing-2xl) 0 113px;
		padding: var(--spacing-2xl) 0 var(--spacing-2xl);
	}
}

.expanded {
	margin-left: 248px;

	@media (max-width: $--breakpoint-2xs) {
		margin-left: 113px;
	}
}

.header {
	padding: 0px 0px var(--spacing-2xl);
	display: flex;
	flex-direction: column;
}

.wrapper {
	display: flex;
	justify-content: space-between;
}

.title {
	width: 75%;

	@media (max-width: $--breakpoint-2xs) {
		width: 45%;
	}
}

.button {
	display: block;

	@media (max-width: $--breakpoint-xs) {
		width: 55%;
	}
}

.content {
	padding-bottom: var(--spacing-3xl);
	display: flex;
	justify-content: space-between;

	@media (max-width: $--breakpoint-2xs) {
		flex-direction: column;
	}
}

.filters {
	width: 188px;

	@media (max-width: $--breakpoint-xs) {
		width: 15%;
	}

	@media (max-width: $--breakpoint-2xs) {
		width: 100%;
	}
}

.search {
	width: 100%;
	padding-left: var(--spacing-2xl);

	@media (max-width: $--breakpoint-xs) {
		width: 75%;
	}

	@media (max-width: $--breakpoint-2xs) {
		width: 100%;
		padding-left: 0;
	}
}

.input {
	width: 100%;
}

.carousel {
	width: 100%;
	padding-top: var(--spacing-s);
}
</style>
