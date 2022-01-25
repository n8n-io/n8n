<template>
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
				<TemplateList :loading="loading" :search="lastQuery.search" />
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import CollectionsCarousel from '@/components/Templates/SearchPage/CollectionsCarousel.vue';
import TemplateFilters from '@/components/Templates/SearchPage/TemplateFilters.vue';
import TemplateList from '@/components/Templates/SearchPage/TemplateList.vue';

import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';
export default mixins(genericHelpers).extend({
	components: {
		CollectionsCarousel,
		TemplateFilters,
		TemplateList,
	},
	data() {
		return {
			categories: [] as number[],
			lastQuery: {
				numberOfResults: 7,
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
		},
		async onSearchInput() {
			await this.doSearch();
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
			numberOfResults: this.lastQuery.numberOfResults,
			search: this.search,
			category,
			fetchCategories: true,
		});

		this.loading = false;
	},
});
</script>
<style lang="scss" module>
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
