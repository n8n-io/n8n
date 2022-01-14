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
			lastQuery: {
				skip: 0,
				search: '',
				category: [] as number[] | null,
			},
			searchFinished: false,
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
		await this.$store.dispatch('templates/getSearchResults', {search: this.search, category, fetchCategories: true });
		this.lastQuery = { search: this.search, category, skip: 0};
		this.searchFinished = false;

		// Detect when scrolled to bottom.
		const templateList = document.querySelector('#infiniteList');
		if (templateList) {
			templateList.addEventListener('scroll', e => {
				if(templateList.scrollTop + templateList.clientHeight >= templateList.scrollHeight) {
					this.infiniteLoader();
				}
			});
		}
	},
	async updated() {
		const infiniteList = document.getElementById('infiniteList');
		const collections = await this.$store.getters['templates/getCollections'];
		if (infiniteList) {
			const calcHeight = collections.length ? 450 : 350;

			infiniteList.style.height =window.innerHeight - calcHeight + "px";
		}
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
				await this.$store.dispatch('templates/getSearchResults', { search, category, skip: skip + 20});
				const newLoaded = this.$store.getters['templates/getWorkflows'];
				if (newLoaded.length % 20 || preloaded.length === newLoaded.length) {
					this.searchFinished = true;
				}
			}
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
		min-width: 188px;
		margin-right: 24px;
	}

	.search {
		width: -webkit-calc(100% - 188px);
    width:    -moz-calc(100% - 188px);
    width:         calc(100% - 188px);
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
