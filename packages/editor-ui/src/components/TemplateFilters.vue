<template>
	<div :class="$style.filters" class="template-filters">
		<div :class="$style.title" v-text="$locale.baseText('templates.categoriesHeading')" />
		<div v-if="loading" :class="$style.list">
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
				v-for="category in collapsed ? sortedCategories.slice(0, 6) : sortedCategories"
				:key="category.id"
				:class="$style.item"
			>
				<el-checkbox
					:label="category.name"
					:value="category.selected"
					@change="(value) => handleCheckboxChanged(value, category)"
				/>
			</li>
		</ul>
		<div
			:class="$style.button"
			v-if="sortedCategories.length > 6 && collapsed && !loading"
			@click="collapseAction"
		>
			<n8n-text size="small" color="primary">
				+ {{ `${sortedCategories.length - 6} more` }}
			</n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { ITemplateCategory } from '@/Interface';
import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'TemplateFilters',
	props: {
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
				return 6;
			},
		},
		setCategories: { type: Function },
	},
	watch: {
		categories(newCategories) {
			this.sortedCategories = newCategories;
		},
		collapsed() {
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
.filters {
	@media (max-width: $--breakpoint-2xs) {
		padding-bottom: var(--spacing-2xl);
	}
}

.title {
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
}

.spacer {
	margin: var(--spacing-2xl);
}

.categories {
	padding-top: var(--spacing-xs);
	list-style-type: none;
}

.item {
	margin-top: var(--spacing-2xs);

	&:nth-child(1) {
		margin-top: 0;
	}
}

.button {
	padding-top: var(--spacing-2xs);
	cursor: pointer;
}
</style>

<style lang="scss">
.template-filters {
	.el-checkbox__label {
		font-size: var(--font-size-2xs);
		color: var(--color-text-dark);
		padding-left: var(--spacing-2xs);
	}
}
</style>
