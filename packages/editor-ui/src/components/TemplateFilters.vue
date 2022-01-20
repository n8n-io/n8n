<template>
	<div>
		<n8n-heading v-if="!loading" size="small">{{ $locale.baseText('templates.categoriesHeading') }}</n8n-heading>
		<n8n-loading :animated="loadingAnimated" :loading="loading" :rows="1" variant="h1" />
		<div :class="$style.list">
			<n8n-loading :animated="true" :loading="loading" :rows="1" variant="h1" />
			<div v-for="(block, index) in loadingBlocks" :key="'block-' + index">
				<n8n-loading
					:animated="loadingAnimated"
					:loading="loading"
					:rows="loadingRows"
					variant="p"
				/>
				<div :class="$style.spacer" />
			</div>
		</div>
		<ul v-if="!loading" :class="$style.categories">
			<li :class="$style.item">
				<el-checkbox
					label="All Categories"
					:value="allSelected"
					@change="(value) => resetCategories(value)"
				/>
			</li>
			<li
				v-for="category in collapsed ? sortedCategories.slice(0, 4) : sortedCategories"
				:key="category.id"
			>
				<el-checkbox
					:label="category.name"
					:value="category.selected"
					@change="(value) => handleCheckboxChanged(value, category)"
				/>
			</li>
		</ul>
		<div :class="$style.button" v-if="sortedCategories.length > 4 && collapsed && !loading">
			<n8n-button
				icon="plus"
				type="text"
				float="left"
				:label="`${sortedCategories.length - 4} more`"
				@click="collapseAction"
			></n8n-button>
		</div>
	</div>
</template>

<script lang="ts">
import { ITemplateCategory } from '@/Interface';
import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'TemplateFilters',
	props: {
		setCategories: { type: Function },
		loading: {
			type: Boolean,
		},
		loadingAnimated: {
			type: Boolean,
			default: true,
		},
		loadingBlocks: {
			type: Number,
			default: 1,
		},
		loadingRows: {
			type: Number,
			default: () => {
				return 3;
			},
		},
	},
	watch: {
		categories(newCategories) {
			this.sortedCategories = newCategories;
		},
		collapsed(newState) {
			if (!this.collapsed) {
				this.sortedCategories = this.sortCategories(this.categories);
			}
		},
	},
	computed: {
		categories() {
			const fetchedCategories = this.$store.getters['templates/getCategories'];
			const copiedCategories = JSON.parse(JSON.stringify(fetchedCategories));
			if (this.selected.length) {
				return copiedCategories.map((category: ITemplateCategory) => {
					if (this.selected.includes(category.id)) {
						category.selected = true;
					}
					return category;
				});
			}
			return copiedCategories;
		},
	},
	data() {
		return {
			allSelected: true,
			collapsed: true,
			sortedCategories: [] as ITemplateCategory[],
			selected: [] as string[],
		};
	},
	methods: {
		sortCategories(categories: ITemplateCategory[]) {
			const selectedCategories = this.categories.filter(({ selected }: ITemplateCategory) => {
				return selected;
			});
			const notSelectedCategories = this.categories.filter(({ selected }: ITemplateCategory) => {
				return !selected;
			});
			return selectedCategories.concat(notSelectedCategories);
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
			this.setCategories([]);
		},
		handleCheckboxChanged(value: boolean, selectedCategory: ITemplateCategory) {
			if (value) {
				this.allSelected = false;
			}
			selectedCategory.selected = value;
			this.sortedCategories = this.sortCategories(this.categories);
			const strippedCategories = this.sortedCategories
				.filter(({ selected }) => selected)
				.map(({ id }) => id);
			if (strippedCategories.length === 0) {
				this.allSelected = true;
			}
			this.setCategories(strippedCategories);
		},
		collapseAction() {
			this.collapsed = false;
		},
	},
	created() {
		if (typeof this.$route.query.categories === 'string' && this.$route.query.categories.length) {
			this.selected = this.$route.query.categories.split(',');
			this.allSelected = this.selected.length === 0;
		}
	},
});
</script>

<style lang="scss" module>
.list {
	padding-top: var(--spacing-xs);
}

.spacer {
	margin: var(--spacing-2xl);
}

.categories {
	list-style-type: none;
}

.item {
	margin-top: var(--spacing-2xs);
}

.button {
	height: auto;
	margin-left: -12px;
}
</style>
