<template>
	<div class="view-root">
		<div class="view-wrapper">
			<div class="filters">
				<TemplateFilters :setCategories="setCategories"/>
			</div>
			<div class="search">

				<div class="searchInput">
					<n8n-input
						v-model="search"
						@input="onSearchInput"
						clearable
						:placeholder="$locale.baseText('templates.searchPlaceholder')"
					>
						<font-awesome-icon icon="search" slot="prefix" />

					</n8n-input>
				</div>
				<div class="searchResults">

					<CollectionsCarousel/>

					<TemplateList/>

				</div>

			</div>
		</div>

	</div>
</template>

<script lang="ts">
import TemplateFilters from '@/components/TemplateFilters.vue';
import CollectionsCarousel from '@/components/CollectionsCarousel.vue';
import TemplateList from '@/components/TemplateList.vue';
import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(
	genericHelpers,
).extend({
	name: 'Templates',
	components: {
		TemplateFilters,
		CollectionsCarousel,
		TemplateList,
	},
	data () {
		return {
			search: '',
			categories: [] as number[],
 		};
	},
	async created() {
		if (this.$route.query.search && typeof this.$route.query.search === 'string') {
			this.search = this.$route.query.search;
		}
		if (typeof this.$route.query.categories === 'string' && this.$route.query.categories.length) {
			this.categories = this.$route.query.categories.split(',').map((id) => Number(id));
		}
		const category = this.categories.length ? this.categories : null;
		await this.$store.dispatch('templates/getSearchResults', {search: this.search, category });
	},
	methods: {
		async onSearchInput(value: string) {
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
		async doSearch() {
			const category = this.categories.join(',');
			console.log(category);
			const search = this.search;
			this.updatQueryParam(search, category);
			await this.$store.dispatch('templates/getSearchResults', { search, category });
		},
		async setCategories(selected: number[]) {
			this.categories = selected;
			await this.doSearch();
		},
	},
});

</script>

<style lang="scss">

.view-root {
	position: fixed;
	width: 100%;
	height: 100%;
	padding-left: $--sidebar-width;
	left: 0;
	top: 0;
	overflow: hidden;
}

.view-wrapper {
	margin-top: 120px;
	padding: 0 48px;
	width: 100%;
	height: 100%;
	display: flex;

	.filters {
		width: 188px;
	}

	.search {
		width: -webkit-calc(100% - 188px);
    width:    -moz-calc(100% - 188px);
    width:         calc(100% - 188px);
		margin-left: 24px;
		display: flex column;

		.searchInput {
			width: 100%;
		}

		.searchResults {
			width: 100%;
			padding-top: 16px;
		}
	}

}

</style>
