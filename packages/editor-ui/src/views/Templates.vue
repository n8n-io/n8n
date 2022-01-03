<template>
	<div class="view-root">
		<div class="view-wrapper">
			<div class="filters">
				<TemplateFilters/>
			</div>
			<div class="search">
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


		</div>

	</div>
</template>

<script lang="ts">
import TemplateFilters from '@/components/TemplateFilters.vue';
import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(
	genericHelpers,
).extend({
	name: 'Templates',
	components: {
		TemplateFilters,
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
	display: flex;
	width: 100%;
	height: 100%;

	.filters {
		width: 188px;
	}

	.search {
		width: 100%;
		margin-left: 24px;
	}
}

</style>
