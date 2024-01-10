<template>
	<div :class="$style.filters" class="template-filters">
		<div :class="$style.title" v-text="$locale.baseText('templates.categoriesHeading')" />
		<div v-if="loading" :class="$style.list">
			<n8n-loading :loading="loading" :rows="expandLimit" />
		</div>
		<ul v-if="!loading" :class="$style.categories">
			<li :class="$style.item">
				<el-checkbox
					:label="$locale.baseText('templates.allCategories')"
					:model-value="allSelected"
					@update:modelValue="(value) => resetCategories(value)"
				/>
			</li>
			<li
				v-for="category in collapsed ? sortedCategories.slice(0, expandLimit) : sortedCategories"
				:key="category.id"
				:class="$style.item"
			>
				<el-checkbox
					:label="category.name"
					:model-value="isSelected(category.id)"
					@update:modelValue="(value) => handleCheckboxChanged(value, category)"
				/>
			</li>
		</ul>
		<div
			v-if="sortedCategories.length > expandLimit && collapsed && !loading"
			:class="$style.button"
			@click="collapseAction"
		>
			<n8n-text size="small" color="primary">
				+ {{ `${sortedCategories.length - expandLimit} more` }}
			</n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { ITemplatesCategory } from '@/Interface';

export default defineComponent({
	name: 'TemplateFilters',
	props: {
		sortOnPopulate: {
			type: Boolean,
			default: false,
		},
		categories: {
			type: Array,
		},
		expandLimit: {
			type: Number,
			default: 12,
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
			sortedCategories: [] as ITemplatesCategory[],
		};
	},
	computed: {
		allSelected(): boolean {
			return this.selected.length === 0;
		},
	},
	watch: {
		categories: {
			handler(categories: ITemplatesCategory[]) {
				if (!this.sortOnPopulate) {
					this.sortedCategories = categories;
				} else {
					const selected = this.selected || [];
					const selectedCategories = categories.filter(({ id }) => selected.includes(id));
					const notSelectedCategories = categories.filter(({ id }) => !selected.includes(id));
					this.sortedCategories = selectedCategories.concat(notSelectedCategories);
				}
			},
			immediate: true,
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

.categories {
	padding-top: var(--spacing-xs);
	list-style-type: none;
}

.item {
	margin-top: var(--spacing-xs);

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
		top: -2px;
		position: relative;
		font-size: var(--font-size-xs);
		line-height: var(--font-line-height-loose);
		color: var(--color-text-dark);
		padding-left: var(--spacing-2xs);
	}
}
</style>
