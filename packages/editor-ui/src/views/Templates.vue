<template>
	<div class="view-root">
		<div class="view-wrapper">
			<div class="filters">
				<TemplateFilters/>
			</div>
			<div class="search">

				<div class="searchInput">
					<!-- TODO maxlength -->
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
			categories: [],
 		};
	},
	async created() {
		const { categories, collections, totalWorkflows, workflows } = await this.$store.dispatch('templates/getSearchResults');
		// this.categories = categories;
		// console.log(categories);
	},
	methods: {
		onSearchInput(value: string) {
			// console.log(value);
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
