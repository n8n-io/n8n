<template>
	<div :class="$style.category">
		<span :class="$style.name">
			{{ renderCategoryName(item.category) }}{{ count !== undefined ? ` (${count})` : ''}}
		</span>
		<font-awesome-icon
			v-if="isExpanded"
			icon="chevron-down"
			:class="$style.arrow"
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
	count?: number;
}
const props = defineProps<Props>();
const instance = getCurrentInstance();
const { categoriesWithNodes } = useNodeTypesStore();
const nodeCreatorStore = useNodeCreatorStore();

const isExpanded = computed<boolean>(() => {
	return (props.item.properties as ICategoryItemProps).expanded;
});

function renderCategoryName(categoryName: CategoryName) {
	const camelCasedCategoryName = camelcase(categoryName) as CategoryName;
	const key = `nodeCreator.categoryNames.${camelCasedCategoryName}` as const;

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
