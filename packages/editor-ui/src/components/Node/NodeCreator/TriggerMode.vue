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
const instance = getCurrentInstance();
const nodeTypesStore = useNodeTypesStore();
const nodeCreatorStore = useNodeCreatorStore();
const { pushViewStack, activeViewStack, viewStacks, popViewStack } = useViewStacks();

function onSelected(item: INodeCreateElement) {
	if (item.type === 'subcategory') {
		console.log('🚀 ~ file: TriggerMode.vue:70 ~ onSelected ~ item:', item);
		pushViewStack({
			subcategory: item.key,
			title: item.properties.title,
			search: '',
			hasHeaderBg: true,
			forceIncludeNodes: item.properties.forceIncludeNodes,
			baseFilter: filterTriggerNodes,
			itemsMapper: (i) => i,
		});
	}
}
function filterTriggerNodes(item: INodeCreateElement) {
	if (item.type !== 'node') return false;

	const hasTriggerGroup = item.properties.group.includes('trigger');
	const hasActions = (item.properties.actions ?? []).length > 0;
	console.log('🚀 ~ file: TriggerMode.vue:34 ~ filterTriggerNodes ~ item:', item);
	return hasActions || hasTriggerGroup;
}
// Mode displays list of subcategories or nodes or categories. It aggregates only from regular nodes.
const view = TriggerView();

pushViewStack({
	title: view.title,
	subtitle: view.subtitle,
	items: view.items as INodeCreateElement[],
	search: '',
	hasHeaderBg: false,
	hasSearch: true,
	mode: 'trigger',
});
</script>

<template>
	<NodesListPanel
		:title="activeViewStack.title"
		:subtitle="activeViewStack.subtitle"
		:hasBackButton="viewStacks.length > 1"
		:hasSearch="activeViewStack.hasSearch"
		:searchPlaceholder="'123'"
		:hasHeaderBg="activeViewStack.hasHeaderBg"
		:transitionDirection="activeViewStack.transitionDirection"
		:key="activeViewStack.uuid"
		@back="popViewStack"
	>
		<ItemsRenderer :elements="activeViewStack.items" @selected="onSelected" />
		Active items: {{ activeViewStack.items.length }}
	</NodesListPanel>
</template>

<style lang="scss" module></style>
