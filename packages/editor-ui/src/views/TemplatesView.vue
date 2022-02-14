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
							type="outline"
							:label="$locale.baseText('templates.newButton')"
							:transparentBackground="true"
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
							:loading="loading"
							:navigate-to="navigateTo"
						/>
						<TemplateList
							:abbreviate-number="abbreviateNumber"
							:categories="categories"
							:infinity-scroll="true"
							:loading="loading"
							:navigate-to="navigateTo"
							:search="search"
							:total-workflows="totalWorkflows"
							:workflows="workflows"
						/>
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
import { IDataObject } from 'n8n-workflow';

export default mixins(genericHelpers).extend({
	name: 'TemplatesView',
	components: {
		CollectionsCarousel,
		TemplateFilters,
		TemplateList,
	},
	computed: {
		allCategories(): [] {
			return this.$store.getters['templates/getCategories'];
		},
		collections(): [] {
			return this.$store.getters['templates/getCollections'];
		},
		isMenuCollapsed(): boolean {
			return this.$store.getters['ui/sidebarMenuCollapsed'];
		},
		templateSessionId(): number {
			return this.$store.getters['templates/getTemplateSessionId'];
		},
		totalWorkflows(): number {
			return this.$store.getters['templates/getTotalWorkflows'];
		},
		workflows(): [] {
			return this.$store.getters['templates/getTemplates'];
		},
	},
	data() {
		return {
			categories: [] as number[],
			loading: true,
			loadingCategories: true,
			numberOfResults: 10,
			search: '',
		};
	},
	methods: {
		abbreviateNumber,
		async doSearch() {
			this.loading = true;
			const category = this.categories;
			const search = this.search;

			this.updateQueryParam(search, category.join(','));

			const response = await this.$store.dispatch('templates/getSearchResults', {
				search,
				category,
			});

			const templateEvent = await this.generateTemplateEvent();
			this.$telemetry.track('User searched workflow templates', templateEvent);

			if (response) {
				this.loading = false;
			}
		},
		async generateTemplateEvent() {
			if (!this.templateSessionId) {
				await this.$store.dispatch('templates/setTemplateSessionId', new Date().valueOf());
			}

			return {
				search_string: this.search,
				results_counts: this.numberOfResults,
				categories_applied: this.categories,
				wf_template_repo_session_id: this.templateSessionId,
			};
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
			this.callDebounced('doSearch', 500, true);
		},
		async setCategories(selected: number[]) {
			this.categories = selected;
			await this.doSearch();
		},
		scrollToTop() {
			setTimeout(() => {
				window.scrollTo({
					top: 0,
					behavior: 'smooth',
				});
			}, 100);
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
	},
	async created() {
		this.scrollToTop();

		if (this.$route.query.search && typeof this.$route.query.search === 'string') {
			this.search = this.$route.query.search;
		}

		if (typeof this.$route.query.categories === 'string' && this.$route.query.categories.length) {
			this.categories = this.$route.query.categories.split(',').map((id) => Number(id));
		}

		const category = this.categories.length ? this.categories : null;

		await this.$store.dispatch('templates/getSearchResults', {
			numberOfResults: this.numberOfResults,
			search: this.search,
			category,
			fetchCategories: true,
		});

		const templateEvent = await this.generateTemplateEvent();
		this.$telemetry.track('User searched workflow templates', templateEvent);

		this.loadingCategories = false;
		this.loading = false;
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
