<script setup lang="ts">
import { getCurrentInstance, ref, computed, watch } from 'vue';
import NodesListPanel from './NodesListPanel.vue';
import { TriggerView } from './RootViews';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import ItemsRenderer from './ItemsRenderer.vue';
import { CORE_NODES_CATEGORY } from '@/constants';
import { SubcategorizedNodeTypes } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { SubcategoryCreateElement } from '@/Interface';
import { INodeCreateElement } from '@/Interface';
import { useViewStacks } from './composables/useViewStacks';
import CategorizedItemsRenderer from './CategorizedItemsRenderer.vue';

const instance = getCurrentInstance();
const nodeTypesStore = useNodeTypesStore();
const nodeCreatorStore = useNodeCreatorStore();
const {
	pushViewStack,
	activeViewStack,
	viewStacks,
	globalSearchItemsDiff,
	popViewStack,
	updateViewStack,
} = useViewStacks();

// const search = ref('');

function onSearchInput(value: string) {
	// search.value = value;
	if (activeViewStack.value.uuid) {
		updateViewStack(activeViewStack.value.uuid, { search: value });
	}
}

function isTriggerNode(nodeType: INodeTypeDescription) {
	return nodeType.group.includes('trigger');
}

function onSelected(item: INodeCreateElement) {
	console.log('🚀 ~ file: TriggerMode.vue:42 ~ onSelected ~ item:', item);
	if (item.type === 'subcategory') {
		console.log('🚀 ~ file: TriggerMode.vue:70 ~ onSelected ~ item:', item);
		pushViewStack({
			subcategory: item.key,
			title: item.properties.title,
			hasHeaderBg: true,
			forceIncludeNodes: item.properties.forceIncludeNodes,
			baseFilter: baseSubcategoriesFilter,
			itemsMapper: subcategoriesMapper,
		});
	}
}
function subcategoriesMapper(item: INodeCreateElement) {
	if (item.type !== 'node') return item;

	const hasTriggerGroup = item.properties.group.includes('trigger');
	const hasActions = (item.properties.actions ?? []).length > 0;

	if (hasTriggerGroup && hasActions) {
		item.properties.displayName = item.properties.displayName.replace(' Trigger', '');
	}
	return item;
}

function baseSubcategoriesFilter(item: INodeCreateElement) {
	if (item.type !== 'node') return false;

	const hasTriggerGroup = isTriggerNode(item.properties);
	const hasActions = (item.properties.actions ?? []).length > 0;

	return hasActions || hasTriggerGroup;
}
// Mode displays list of subcategories or nodes or categories. It aggregates only from regular nodes.
const view = TriggerView();

pushViewStack({
	title: view.title,
	subtitle: view.subtitle,
	items: view.items as INodeCreateElement[],
	hasHeaderBg: false,
	hasSearch: true,
	mode: 'trigger',
	// Root search should include all nodes
	searchItems: nodeCreatorStore.mergedAppNodes,
});
</script>

<template>
	<NodesListPanel
		:hasBackButton="viewStacks.length > 1"
		v-bind="activeViewStack"
		:key="activeViewStack.uuid"
		@back="popViewStack"
		@searchInput="onSearchInput"
	>
		<div :class="$style.items">
			<ItemsRenderer
				:elements="activeViewStack.items"
				@selected="onSelected"
				:class="$style.stackItems"
			/>
			<CategorizedItemsRenderer
				v-if="globalSearchItemsDiff.length > 0"
				:elements="globalSearchItemsDiff"
				:category="'Results in other categories'"
				@selected="onSelected"
				:class="$style.stackItems"
			/>
		</div>
	</NodesListPanel>
</template>

<style lang="scss" module>
// .stackItems {
// 	height: 100%;
// 	flex: 1;
// }
// .searchDiff {
// 	height: 100%;
// 	flex: 1;
// }
</style>
