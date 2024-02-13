<template>
	<div :class="$style.filters" class="template-filters" data-test-id="templates-filter-container">
		<div :class="$style.title" v-text="$locale.baseText('templates.categoriesHeading')" />
		<div v-if="loading" :class="$style.list">
			<n8n-loading :loading="loading" :rows="expandLimit" />
		</div>
		<ul v-if="!loading" :class="$style.categories">
			<li :class="$style.item" data-test-id="template-filter-all-categories">
				<el-checkbox :model-value="allSelected" @update:model-value="() => resetCategories()">
					{{ $locale.baseText('templates.allCategories') }}
				</el-checkbox>
			</li>
			<li
				v-for="(category, index) in collapsed
					? sortedCategories.slice(0, expandLimit)
					: sortedCategories"
				:key="index"
				:class="$style.item"
				:data-test-id="`template-filter-${category.name.toLowerCase().replaceAll(' ', '-')}`"
			>
				<el-checkbox
					:model-value="isSelected(category)"
					@update:model-value="(value: boolean) => handleCheckboxChanged(value, category)"
				>
					{{ category.name }}
				</el-checkbox>
			</li>
		</ul>
		<div
			v-if="sortedCategories.length > expandLimit && collapsed && !loading"
			:class="$style.button"
			data-test-id="expand-categories-button"
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
import type { PropType } from 'vue';
import { useTemplatesStore } from '@/stores/templates.store';
import { mapStores } from 'pinia';

export default defineComponent({
	name: 'TemplateFilters',
	props: {
		categories: {
			type: Array as PropType<ITemplatesCategory[]>,
			default: () => [],
		},
		sortOnPopulate: {
			type: Boolean,
			default: false,
		},
		expandLimit: {
			type: Number,
			default: 12,
		},
		loading: {
			type: Boolean,
		},
		selected: {
			type: Array as PropType<ITemplatesCategory[]>,
			default: () => [],
		},
	},
	emits: ['clearAll', 'select', 'clear'],
	data() {
		return {
			collapsed: true,
			sortedCategories: [] as ITemplatesCategory[],
		};
	},
	computed: {
		...mapStores(useTemplatesStore),
		allSelected(): boolean {
			return this.selected.length === 0;
		},
	},
	watch: {
		sortOnPopulate: {
			handler(value: boolean) {
				if (value) {
					this.sortCategories();
				}
			},
			immediate: true,
		},
		categories: {
			handler(categories: ITemplatesCategory[]) {
				if (categories.length > 0) {
					this.sortCategories();
				}
			},
			immediate: true,
		},
	},
	methods: {
		sortCategories() {
			if (!this.sortOnPopulate) {
				this.sortedCategories = this.categories;
			} else {
				const selected = this.selected || [];
				const selectedCategories = this.categories.filter((cat) => selected.includes(cat));
				const notSelectedCategories = this.categories.filter((cat) => !selected.includes(cat));
				this.sortedCategories = selectedCategories.concat(notSelectedCategories);
			}
		},
		collapseAction() {
			this.collapsed = false;
		},
		handleCheckboxChanged(value: boolean, selectedCategory: ITemplatesCategory) {
			this.$emit(value ? 'select' : 'clear', selectedCategory);
		},
		isSelected(category: ITemplatesCategory) {
			return this.selected.includes(category);
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
