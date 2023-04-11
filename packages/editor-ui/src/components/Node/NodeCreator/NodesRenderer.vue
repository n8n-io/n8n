<script setup lang="ts">
import { getCurrentInstance, ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import NodesListPanel from './NodesListPanel.vue';
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
import { useKeyboardNavigation } from './composables/useKeyboardNavigation';

export interface Props {
	rootView: 'trigger' | 'action';
}

const emit = defineEmits({
	nodeTypeSelected: (nodeTypes: string[]) => true,
});

const instance = getCurrentInstance();
const { actions, getNodeTypesWithManualTrigger, setAddedNodeActionParameters } =
	useNodeCreatorStore();
const { baseUrl } = useRootStore();

const { pushViewStack, popViewStack, updateViewStack } = useViewStacks();

const { setFirstItemActive, attachKeydownEvent, detachKeydownEvent, registerKeyHook } =
	useKeyboardNavigation();

const activeViewStack = computed(() => useViewStacks().activeViewStack);
const activeViewStackMode = computed(() => useViewStacks().activeViewStackMode);
const globalSearchItemsDiff = computed(() => useViewStacks().globalSearchItemsDiff);
const viewStacks = computed(() => useViewStacks().viewStacks);

registerKeyHook('MainViewArrowRight', {
	keyboardKeys: ['ArrowRight', 'Enter'],
	condition: (type) => ['subcategory', 'node'].includes(type),
	handler: onKeySelect,
});

registerKeyHook('MainViewArrowLeft', {
	keyboardKeys: ['ArrowLeft'],
	condition: (type) => ['subcategory', 'node'].includes(type),
	handler: arrowLeft,
});

function arrowLeft() {
	popViewStack();
}
function onKeySelect(activeItemId: string) {
	const mergedItems = [
		...(activeViewStack.value.items || []),
		...(globalSearchItemsDiff.value || []),
	];

	const item = mergedItems.find((i) => i.uuid === activeItemId);
	if (!item) return;

	onSelected(item as INodeCreateElement);
}

function selectNodeType(nodeTypes: string[]) {
	emit(
		'nodeTypeSelected',
		nodeTypes.length === 1 ? getNodeTypesWithManualTrigger(nodeTypes[0]) : nodeTypes,
	);
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
		const nodeActions = actions?.[item.key] || [];
		if (nodeActions.length <= 1) {
			selectNodeType([item.key]);
			return;
		}

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
</script>

<template>
	<span>
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
	</span>
</template>
