<template>
	<div :class="$style.filters" class="template-filters">
		<div :class="$style.title" v-text="$locale.baseText('templates.categoriesHeading')" />
		<div v-if="loading" :class="$style.list">
			<n8n-loading-blocks :blocks="1" :loading="loading" :rows="6" />
		</div>
		<ul v-if="!loading" :class="$style.categories">
			<li :class="$style.item">
				<el-checkbox
					:label="$locale.baseText('templates.allCategories')"
					:value="allSelected"
					@change="(value) => resetCategories(value)"
				/>
			</li>
			<li
				v-for="category in collapsed ? sortedCategories.slice(0, categoriesToBeSliced) : sortedCategories"
				:key="category.id"
				:class="$style.item"
			>
				<el-checkbox
					:label="category.name"
					:value="isSelected(category.id)"
					@change="(value) => handleCheckboxChanged(value, category)"
				/>
			</li>
		</ul>
		<div
			:class="$style.button"
			v-if="sortedCategories.length > categoriesToBeSliced && collapsed && !loading"
			@click="collapseAction"
		>
			<n8n-text size="small" color="primary">
				+ {{ `${sortedCategories.length - categoriesToBeSliced} more` }}
			</n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { ITemplatesCategory } from '@/Interface';
import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'TemplateFilters',
	props: {
		categories: {
			type: Array,
		},
		categoriesToBeSliced: {
			type: Number,
			default: 6,
		},
		loading: {
			type: Boolean,
		},
		selected: {
			type: Array,
		},
	},
	data() {
		return {
			collapsed: true,
		};
	},
	computed: {
		allSelected(): boolean {
			return this.selected.length === 0;
		},
		sortedCategories(): ITemplatesCategory[] {
			const categories = this.categories as ITemplatesCategory[];
			const selected = this.selected || [];
			const selectedCategories = categories.filter(({ id }) => selected.includes(id));
			const notSelectedCategories = categories.filter(({ id }) => !selected.includes(id));
			return selectedCategories.concat(notSelectedCategories);
		},
	},
	methods: {
		collapseAction() {
			this.collapsed = false;
		},
		handleCheckboxChanged(value: boolean, selectedCategory: ITemplatesCategory) {
			this.$emit(value ? 'select' : 'clear', selectedCategory.id);
		},
		isSelected(categoryId: string) {
			return this.selected.includes(categoryId);
		},
		resetCategories() {
			this.$emit('clearAll');
		},
	},
});
</script>

<style lang="scss" module>
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
	.el-checkbox {
		display: flex;
		white-space: unset;
	}

	.el-checkbox__label {
		top: -3px;
		position: relative;
		font-size: var(--font-size-2xs);
		color: var(--color-text-dark);
		padding-left: var(--spacing-2xs);
	}
}
</style>
