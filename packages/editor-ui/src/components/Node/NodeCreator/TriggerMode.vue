<script setup lang="ts">
import { getCurrentInstance, ref, computed, watch } from 'vue';
import NodesListPanel from './NodesListPanel.vue';
import { TriggerView } from './RootViews';
import ItemsRenderer from './ItemsRenderer.vue';
import { INodeTypeDescription } from 'n8n-workflow';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { INodeCreateElement, LabelCreateElement } from '@/Interface';
import { useViewStacks } from './composables/useViewStacks';
import CategorizedItemsRenderer from './CategorizedItemsRenderer.vue';
import { sortNodeCreateElements, transformNodeType } from './utils';
import NoResults from './NoResults.vue';
import ActionsRenderer from './ActionsRenderer.vue';
import { useActions } from './composables/useActions';
import { useRootStore } from '@/stores/n8nRootStore';

const instance = getCurrentInstance();
const { mergedNodes, actions, subscribeToEvent } = useNodeCreatorStore();
const { baseUrl } = useRootStore();

const {
	activeViewStack,
	viewStacks,
	globalSearchItemsDiff,
	activeViewStackMode,
	pushViewStack,
	popViewStack,
	updateViewStack,
} = useViewStacks();

const view = TriggerView();

function onSearchInput(value: string) {
	if (activeViewStack.value.uuid) {
		updateViewStack(activeViewStack.value.uuid, { search: value });
	}
}

function onSelected(item: INodeCreateElement) {
	if (item.type === 'subcategory') {
		pushViewStack({
			subcategory: item.key,
			title: item.properties.title,
			hasHeaderBg: true,
			mode: 'trigger',
			forceIncludeNodes: item.properties.forceIncludeNodes,
			baseFilter: baseSubcategoriesFilter,
			itemsMapper: subcategoriesMapper,
		});
	}

	if (item.type === 'node') {
		console.log('🚀 ~ file: TriggerMode.vue:51 ~ onSelected ~ item:', item);
		const nodeActions = actions?.[item.key] || [];
		if (nodeActions.length <= 1) return;

		const icon = item.properties.iconUrl
			? `${baseUrl}${item.properties.iconUrl}`
			: item.properties.icon?.split(':')[1];

		const transformedActions = nodeActions?.map((a) =>
			transformNodeType(a, item.properties.displayName, 'action'),
		);

		pushViewStack({
			subcategory: item.properties.displayName,
			title: item.properties.displayName,
			nodeIcon: {
				color: item.properties.defaults?.color || '',
				icon,
				iconType: item.properties.iconUrl ? 'file' : 'icon',
			},
			hasHeaderBg: true,
			hasSearch: true,
			mode: 'action',
			items: transformedActions,
		});
	}
}
function subcategoriesMapper(item: INodeCreateElement) {
	if (item.type !== 'node') return item;

	const hasTriggerGroup = item.properties.group.includes('trigger');
	const nodeActions = actions?.[item.key] || [];
	const hasActions = nodeActions.length > 0;

	if (hasTriggerGroup && hasActions) {
		item.properties.displayName = item.properties.displayName.replace(' Trigger', '');
	}
	return item;
}

function baseSubcategoriesFilter(item: INodeCreateElement) {
	if (item.type !== 'node') return false;

	const hasTriggerGroup = item.properties.group.includes('trigger');
	const nodeActions = actions?.[item.key] || [];
	const hasActions = nodeActions.length > 0;

	return hasActions || hasTriggerGroup;
}

// Initial view stack
pushViewStack({
	title: view.title,
	subtitle: view.subtitle,
	items: view.items as INodeCreateElement[],
	hasHeaderBg: false,
	hasSearch: true,
	mode: 'trigger',
	// Root search should include all nodes
	searchItems: mergedNodes,
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
		<!-- Actions Mode -->
		<ActionsRenderer
			v-if="
				activeViewStackMode === 'action' && activeViewStack.items && activeViewStack.subcategory
			"
			:rootView="'trigger'"
			:actions="activeViewStack.items"
			:search="activeViewStack.search"
			:subcategory="activeViewStack.subcategory"
		/>

		<!-- Nodes Mode -->
		<template v-else>
			<!-- Main Node Items -->
			<ItemsRenderer :elements="activeViewStack.items" @selected="onSelected">
				<template
					#empty
					v-if="(activeViewStack.items || []).length === 0 && globalSearchItemsDiff.length === 0"
				>
					<NoResults :mode="activeViewStackMode || 'trigger'" showIcon showRequest />
				</template>
			</ItemsRenderer>
			<!-- Results in other categories -->
			<CategorizedItemsRenderer
				v-if="globalSearchItemsDiff.length > 0"
				:elements="globalSearchItemsDiff"
				:category="$locale.baseText('nodeCreator.categoryNames.otherCategories')"
				@selected="onSelected"
			>
			</CategorizedItemsRenderer>
		</template>
	</NodesListPanel>
</template>
