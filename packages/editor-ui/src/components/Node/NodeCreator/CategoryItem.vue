<template>
	<div :class="$style.category">
		<span :class="$style.name">
			{{ renderCategoryName(categoryName) }} ({{ nodesCount }})
		</span>
		<font-awesome-icon
			:class="$style.arrow"
			icon="chevron-down"
			v-if="isExpadned"
		/>
		<font-awesome-icon :class="$style.arrow" icon="chevron-up" v-else />
	</div>
</template>

<script lang="ts" setup>
import { computed, getCurrentInstance } from 'vue';
import camelcase from 'lodash.camelcase';
import { CategoryName } from '@/plugins/i18n';
import { INodeCreateElement, ICategoryItemProps } from '@/Interface';
import { NODE_TYPE_COUNT_MAPPER } from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useNodeCreatorStore } from '@/stores/nodeCreator';

export interface Props {
	item: INodeCreateElement;
}
const props = defineProps<Props>();
const instance = getCurrentInstance();
const { categoriesWithNodes } = useNodeTypesStore();
const nodeCreatorStore = useNodeCreatorStore();

const isExpadned = computed<boolean>(() => {
	return (props.item.properties as ICategoryItemProps).expanded;
});

const categoryName = computed<CategoryName>(() => {
	return camelcase(props.item.category) as CategoryName;
});

const nodesCount = computed<number>(() => {
	const currentCategory = categoriesWithNodes[props.item.category];
	const subcategories = Object.keys(currentCategory);

	// We need to sum subcategories count for the curent nodeType view
	// to get the total count of category
	const count = subcategories.reduce((accu: number, subcategory: string) => {
		const countKeys = NODE_TYPE_COUNT_MAPPER[nodeCreatorStore.selectedType];

		for (const countKey of countKeys) {
			accu += currentCategory[subcategory][(countKey as "triggerCount" | "regularCount")];
		}

		return accu;
	}, 0);
	return count;
});

function renderCategoryName(categoryName: CategoryName) {
	const key = `nodeCreator.categoryNames.${categoryName}` as const;

	return instance?.proxy.$locale.exists(key)
		? instance?.proxy.$locale.baseText(key)
		: categoryName;
}
</script>

<style lang="scss" module>
.category {
	font-size: 11px;
	font-weight: var(--font-weight-bold);
	letter-spacing: 1px;
	line-height: 11px;
	padding: 10px 0;
	margin: 0 var(--spacing-xs);
	border-bottom: 1px solid $node-creator-border-color;
	display: flex;
	text-transform: uppercase;
	cursor: pointer;
}

.name {
	flex-grow: 1;
}

.arrow {
	font-size: var(--font-size-2xs);
	width: 12px;
	color: $node-creator-arrow-color;
}
</style>
