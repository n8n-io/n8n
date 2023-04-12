<script setup lang="ts">
import { getCurrentInstance, ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import NodesListPanel from './NodesListPanel.vue';
import ItemsRenderer from './ItemsRenderer.vue';
import { INodeTypeDescription } from 'n8n-workflow';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { INodeCreateElement, LabelCreateElement, NodeFilterType } from '@/Interface';
import { useViewStacks } from './composables/useViewStacks';
import CategorizedItemsRenderer from './CategorizedItemsRenderer.vue';
import { sortNodeCreateElements, transformNodeType } from './utils';
import NoResults from './NoResults.vue';
import ActionsRenderer from './ActionsRenderer.vue';
import { useActions } from './composables/useActions';
import { useRootStore } from '@/stores/n8nRootStore';
import { useKeyboardNavigation } from './composables/useKeyboardNavigation';
import { ACTIONS_NODE_CREATOR_MODE, CUSTOM_API_CALL_KEY, TRIGGER_NODE_CREATOR_MODE } from '@/constants';
import { camelCase } from 'lodash-es';
import { BaseTextKey } from '@/plugins/i18n';
import { TriggerView, RegularView } from './RootViews';

export interface Props {
	rootView: 'trigger' | 'action';
}

const emit = defineEmits({
	nodeTypeSelected: (nodeTypes: string[]) => true,
});

const instance = getCurrentInstance();
const { mergedNodes, actions, getNodeTypesWithManualTrigger } = useNodeCreatorStore();
const { baseUrl } = useRootStore();

const { pushViewStack, popViewStack } = useViewStacks();

const { registerKeyHook } = useKeyboardNavigation();

const activeViewStack = computed(() => useViewStacks().activeViewStack);
const activeViewStackMode = computed(() => useViewStacks().activeViewStackMode);
const globalSearchItemsDiff = computed(() => useViewStacks().globalSearchItemsDiff);

registerKeyHook('MainViewArrowRight', {
	keyboardKeys: ['ArrowRight', 'Enter'],
	condition: (type) => ['subcategory', 'node', 'view'].includes(type),
	handler: onKeySelect,
});

registerKeyHook('MainViewArrowLeft', {
	keyboardKeys: ['ArrowLeft'],
	condition: (type) => ['subcategory', 'node', 'view'].includes(type),
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
		const title = instance?.proxy.$locale.baseText(
			`nodeCreator.subcategoryNames.${camelCase(item.properties.title)}` as BaseTextKey,
		);

		pushViewStack({
			subcategory: item.key,
			title,
			hasHeaderBg: true,
			mode: 'nodes',
			rootView: activeViewStack.value.rootView,
			forceIncludeNodes: item.properties.forceIncludeNodes,
			baseFilter: baseSubcategoriesFilter,
			itemsMapper: subcategoriesMapper,
		});

		instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.onSubcategorySelected', {
			subcategory: item.key,
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

			rootView: activeViewStack.value.rootView,
			hasHeaderBg: true,
			hasSearch: true,
			mode: 'actions',
			items: transformedActions,
		});
	}

	if (item.type === 'view') {
		const view =
			item.key === TRIGGER_NODE_CREATOR_MODE
				? TriggerView(instance?.proxy?.$locale)
				: RegularView(instance?.proxy?.$locale);

		pushViewStack({
			title: view.title,
			subtitle: view?.subtitle ?? '',
			items: view.items as INodeCreateElement[],
			hasHeaderBg: false,
			hasSearch: true,
			rootView: view.value as NodeFilterType,
			mode: 'nodes',
			// Root search should include all nodes
			searchItems: mergedNodes,
		});
	}
}
function subcategoriesMapper(item: INodeCreateElement) {
	if (item.type !== 'node') return item;

	const hasTriggerGroup = item.properties.group.includes('trigger');
	const nodeActions = actions?.[item.key] || [];
	const hasActions = nodeActions.length > 0;

	if (hasTriggerGroup && hasActions) {
		if (item.properties?.codex) {
			// Store the original name in the alias so we can search for it
			item.properties.codex.alias = [
				...(item.properties.codex?.alias || []),
				item.properties.displayName,
			];
		}
		item.properties.displayName = item.properties.displayName.replace(' Trigger', '');
	}
	return item;
}

function baseSubcategoriesFilter(item: INodeCreateElement) {
	if (item.type !== 'node') return false;

	const hasTriggerGroup = item.properties.group.includes('trigger');
	const nodeActions = actions?.[item.key] || [];
	const hasActions = nodeActions.length > 0;

	const isTriggerRootView = activeViewStack.value.rootView === TRIGGER_NODE_CREATOR_MODE;
	if (isTriggerRootView) {
		return hasActions || hasTriggerGroup;
	}

	return hasActions || !hasTriggerGroup;
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
				<NoResults
					:rootView="activeViewStack.rootView || TRIGGER_NODE_CREATOR_MODE"
					showIcon
					showRequest
				/>
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
