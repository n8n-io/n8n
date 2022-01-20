<template>
	<div :class="$style.templates">
		<div :class="[$style.container, !isMenuCollapsed ? $style.expanded : '']">
			<div :class="$style.header">
				<div :class="$style.wrapper">
					<div :class="$style.title">
						<n8n-heading v-if="!loading" tag="h1" size="2xlarge">
							{{ $locale.baseText('templates.heading') }}
						</n8n-heading>
						<n8n-loading :animated="true" :loading="loading" :rows="1" variant="h1" />
					</div>
					<div :class="$style.button">
						<n8n-button
							v-if="!loading"
							size="large"
							type="outline"
							:label="$locale.baseText('templates.newButton')"
							@click="openNewWorkflow"
						/>
						<n8n-loading :animated="true" :loading="loading" :rows="1" variant="button" />
					</div>
				</div>
			</div>
			<div :class="$style.content">
				<div :class="$style.filters">
					<TemplateFilters :setCategories="setCategories" :loading="loading" />
				</div>
				<div :class="$style.search">
					<div :class="$style.input">
						<n8n-input
							v-if="!loading"
							v-model="search"
							@input="onSearchInput"
							clearable
							:placeholder="$locale.baseText('templates.searchPlaceholder')"
						>
							<font-awesome-icon icon="search" slot="prefix" />
						</n8n-input>
						<n8n-loading :animated="true" :loading="loading" :rows="1" variant="h1" />
					</div>
					<div :class="$style.carousel">
						<CollectionsCarousel :loading="loading" />
						<TemplateList :loading="loading" />
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

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'Templates',
	components: {
		CollectionsCarousel,
		TemplateFilters,
		TemplateList,
	},
	computed: {
		isMenuCollapsed() {
			return this.$store.getters['ui/sidebarMenuCollapsed'];
		},
	},
	data() {
		return {
			categories: [] as number[],
			lastQuery: {
				skip: 0,
				search: '',
				category: [] as number[] | null,
			},
			loading: true,
			search: '',
			searchFinished: false,
		};
	},
	methods: {
		async doSearch() {
			this.searchFinished = false;
			const category = this.categories;
			const search = this.search;
			this.updatQueryParam(search, category.join(','));
			await this.$store.dispatch('templates/getSearchResults', { search, category });
			this.lastQuery = { search, category, skip: 0 };
		},
		async infiniteLoader() {
			if (!this.searchFinished) {
				const { search, category, skip } = this.lastQuery;
				const preloaded = this.$store.getters['templates/getWorkflows'];
				await this.$store.dispatch('templates/getSearchResults', {
					search,
					category,
					skip: skip + 20,
				});
				const newLoaded = this.$store.getters['templates/getWorkflows'];
				if (newLoaded.length % 20 || preloaded.length === newLoaded.length) {
					this.searchFinished = true;
				}
			}
		},
		async onSearchInput() {
			await this.doSearch();
		},
		openNewWorkflow() {
			this.$router.push({ name: 'NodeViewNew' });
		},
		async setCategories(selected: number[]) {
			this.categories = selected;
			await this.doSearch();
		},
		updatQueryParam(search: string, category: string) {
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
		if (this.$route.query.search && typeof this.$route.query.search === 'string') {
			this.search = this.$route.query.search;
		}

		if (typeof this.$route.query.categories === 'string' && this.$route.query.categories.length) {
			this.categories = this.$route.query.categories.split(',').map((id) => Number(id));
		}

		const category = this.categories.length ? this.categories : null;

		await this.$store.dispatch('templates/getSearchResults', {
			search: this.search,
			category,
			fetchCategories: true,
		});

		this.lastQuery = { search: this.search, category, skip: 0 };
		this.searchFinished = false;

		// Detect when scrolled to bottom.
		const templateList = document.querySelector('#infiniteList');
		if (templateList) {
			templateList.addEventListener('scroll', (e) => {
				if (templateList.scrollTop + templateList.clientHeight >= templateList.scrollHeight) {
					this.infiniteLoader();
				}
			});
		}

		this.loading = false;
	},
	async updated() {
		const infiniteList = document.getElementById('infiniteList');
		const collections = await this.$store.getters['templates/getCollections'];
		if (infiniteList) {
			const calcHeight = collections.length ? 450 : 350;

			infiniteList.style.height = window.innerHeight - calcHeight + 'px';
		}
	},
});
</script>

<style lang="scss" module>
.templates {
	width: 100%;
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
}

.button {
	display: block;
}

.content {
	display: flex;
	justify-content: space-between;
}

.filters {
	width: 188px;

	@media (max-width: $--breakpoint-xs) {
		width: auto;
	}
}

.search {
	width: 100%;
	padding-left: var(--spacing-2xl);
}

.input {
	width: 100%;
}

.carousel {
	width: 100%;
	padding-top: var(--spacing-s);
}
</style>
