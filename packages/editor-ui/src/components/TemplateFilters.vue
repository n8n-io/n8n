<template>
	<div>
		<n8n-heading size="small">{{$locale.baseText('templates.categoriesHeading')}}</n8n-heading>
		<ul :class="$style.categoriesList">
			<li>
				<el-checkbox
					label="All Categories"
					:value="allSelected"
					@change="(value) => resetCategories(value)"
				/>
			</li>
			<li v-for="category in collapsed ? sortedCategories.slice(0,4) : sortedCategories" :key="category.id">
				<el-checkbox
					:label="category.name"
					:value="category.selected"
					@change="(value) => handleCheckboxChanged(value, category)"
				/>
			</li>
		</ul>

		<div v-if="sortedCategories.length > 4 && collapsed">
			<n8n-button icon="plus" type="text" float="left" :label="`${sortedCategories.length - 4} more`" @click="collapseAction"></n8n-button>
		</div>

	</div>
</template>

<script lang="ts">

import { ITemplateCategory } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { genericHelpers } from '@/components/mixins/genericHelpers';

export default mixins(
	genericHelpers,
).extend({
	name: 'TemplateFilters',
	data() {
		return {
			allSelected: true,
			collapsed: true,
			sortedCategories: [],
			selected: [] as string[],
		};
	},
	created() {
		if (typeof this.$route.query.categories === 'string' && this.$route.query.categories.length) {
			this.selected = this.$route.query.categories.split(',');
			this.allSelected = this.selected.length === 0;
		}
	},
	computed: {
		categories() {
			return this.$store.getters['templates/getCategories'];
		},
	},
	watch: {
		categories(newCategories) {
			this.sortedCategories = newCategories;
			if (this.selected.length) {
				this.sortedCategories.forEach((category: ITemplateCategory) => {
					if (this.selected.includes(category.id)) {
						category.selected = true;
					}
					return category;
				});
			}
		},
		collapsed(newState) {
			if (!this.collapsed) {
				this.sortedCategories = this.sortCategories(this.categories);
			}
		},

	},
	methods: {
		sortCategories(categories: ITemplateCategory[]) {
			const selectedCategories = this.categories.filter(({ selected }:ITemplateCategory) =>{
				return selected;
			});
			const notSelectedCategories = this.categories.filter(({ selected }:ITemplateCategory) =>{
				return !selected;
			});
			return selectedCategories.concat(notSelectedCategories);
		},
		updatQueryParam(cats: ITemplateCategory[]) {
			const query = Object.assign({}, this.$route.query);
			this.selected = cats.filter(({ selected }) => selected).map(({ id }) => id);
			if (this.selected.length) {
				const categories = this.selected.join(',');
				query.categories = categories;
			} else {
				delete query.categories;
			}
			this.$router.replace({ query });

		},
		resetCategories(value: boolean) {
			if (value) {
				this.categories.forEach((category: ITemplateCategory) => {
					category.selected = false;
					return category;
				});
				this.sortedCategories = this.categories;
			}
			this.allSelected = true;
			this.updatQueryParam([]);
		},
		handleCheckboxChanged(value: boolean, selectedCategory: ITemplateCategory) {
			if (value) {
				this.allSelected = false;
			}
			selectedCategory.selected = value;
			this.sortedCategories = this.sortCategories(this.categories);
			this.updatQueryParam(this.sortedCategories);
		},
		collapseAction() {
			this.collapsed = false;
		},
	},
});
</script>

<style lang="scss" module>

.categoriesList {
  list-style-type: none;
	padding-top: 12px;

	li {
		margin-top: 8px;
	}

	button {
		padding-left: 0px;
	}
}


</style>
