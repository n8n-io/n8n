<script setup lang="ts">
import { camelCase } from 'lodash-es';
import { computed } from 'vue';
import type {
	ActionTypeDescription,
	INodeCreateElement,
	NodeCreateElement,
	NodeFilterType,
} from '@/Interface';
import {
	TRIGGER_NODE_CREATOR_VIEW,
	HTTP_REQUEST_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	REGULAR_NODE_CREATOR_VIEW,
	AI_NODE_CREATOR_VIEW,
	AI_OTHERS_NODE_CREATOR_VIEW,
	HITL_SUBCATEGORY,
} from '@/constants';

import type { BaseTextKey } from '@/plugins/i18n';
import { useRootStore } from '@/stores/root.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';

import { TriggerView, RegularView, AIView, AINodesView } from '../viewsData';
import { flattenCreateElements, transformNodeType } from '../utils';
import { useViewStacks } from '../composables/useViewStacks';
import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import ItemsRenderer from '../Renderers/ItemsRenderer.vue';
import CategorizedItemsRenderer from '../Renderers/CategorizedItemsRenderer.vue';
import NoResults from '../Panel/NoResults.vue';
import { useI18n } from '@/composables/useI18n';
import { getNodeIcon, getNodeIconColor, getNodeIconUrl } from '@/utils/nodeTypesUtils';
import { useUIStore } from '@/stores/ui.store';
import { useActions } from '../composables/useActions';
import { SEND_AND_WAIT_OPERATION, type INodeParameters } from 'n8n-workflow';

export interface Props {
	rootView: 'trigger' | 'action';
}

const emit = defineEmits<{
	nodeTypeSelected: [nodeTypes: string[]];
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const rootStore = useRootStore();

const { mergedNodes, actions, onSubcategorySelected } = useNodeCreatorStore();
const { pushViewStack, popViewStack } = useViewStacks();
const { setAddedNodeActionParameters } = useActions();

const { registerKeyHook } = useKeyboardNavigation();

const activeViewStack = computed(() => useViewStacks().activeViewStack);
const globalSearchItemsDiff = computed(() => useViewStacks().globalSearchItemsDiff);

function getFilteredActions(node: NodeCreateElement) {
	const nodeActions = actions?.[node.key] || [];
	if (activeViewStack.value.subcategory === HITL_SUBCATEGORY) {
		return getHumanInTheLoopActions(nodeActions);
	}
	if (activeViewStack.value.actionsFilter) {
		return activeViewStack.value.actionsFilter(nodeActions);
	}
	return nodeActions;
}

function getHumanInTheLoopActions(nodeActions: ActionTypeDescription[]) {
	return nodeActions.filter((action) => action.actionKey === SEND_AND_WAIT_OPERATION);
}

function selectNodeType(nodeTypes: string[]) {
	emit('nodeTypeSelected', nodeTypes);
}

function onSelected(item: INodeCreateElement) {
	if (item.type === 'subcategory') {
		const subcategoryKey = camelCase(item.properties.title);
		const title = i18n.baseText(`nodeCreator.subcategoryNames.${subcategoryKey}` as BaseTextKey);

		// If the info message exists in locale, add it to the info field of the view
		const infoKey = `nodeCreator.subcategoryInfos.${subcategoryKey}` as BaseTextKey;
		const info = i18n.baseText(infoKey);
		const extendedInfo = info !== infoKey ? { info } : {};

		pushViewStack({
			subcategory: item.key,
			mode: 'nodes',
			title,
			...extendedInfo,
			...(item.properties.icon
				? {
						nodeIcon: {
							icon: item.properties.icon,
							iconType: 'icon',
						},
					}
				: {}),
			...(item.properties.panelClass ? { panelClass: item.properties.panelClass } : {}),
			rootView: activeViewStack.value.rootView,
			forceIncludeNodes: item.properties.forceIncludeNodes,
			baseFilter: baseSubcategoriesFilter,
			itemsMapper: subcategoriesMapper,
			sections: item.properties.sections,
		});

		onSubcategorySelected({
			subcategory: item.key,
		});
	}

	if (item.type === 'node') {
		const nodeActions = getFilteredActions(item);

		// If there is only one action, use it
		if (nodeActions.length === 1) {
			selectNodeType([item.key]);
			setAddedNodeActionParameters({
				name: nodeActions[0].defaults.name ?? item.properties.displayName,
				key: item.key,
				value: nodeActions[0].values as INodeParameters,
			});
			return;
		}

		// Only show actions if there are more than one or if the view is not an AI subcategory
		if (nodeActions.length === 0 || activeViewStack.value.hideActions) {
			selectNodeType([item.key]);
			return;
		}

		const iconUrl = getNodeIconUrl(item.properties, uiStore.appliedTheme);
		const icon = iconUrl
			? rootStore.baseUrl + iconUrl
			: getNodeIcon(item.properties, uiStore.appliedTheme)?.split(':')[1];

		const transformedActions = nodeActions?.map((a) =>
			transformNodeType(a, item.properties.displayName, 'action'),
		);

		pushViewStack({
			subcategory: item.properties.displayName,
			title: item.properties.displayName,
			nodeIcon: {
				color: getNodeIconColor(item.properties),
				icon,
				iconType: iconUrl ? 'file' : 'icon',
			},

			rootView: activeViewStack.value.rootView,
			hasSearch: true,
			mode: 'actions',
			items: transformedActions,
		});
	}

	if (item.type === 'view') {
		const views = {
			[TRIGGER_NODE_CREATOR_VIEW]: TriggerView,
			[REGULAR_NODE_CREATOR_VIEW]: RegularView,
			[AI_NODE_CREATOR_VIEW]: AIView,
			[AI_OTHERS_NODE_CREATOR_VIEW]: AINodesView,
		};

		const itemKey = item.key as keyof typeof views;
		const matchedView = views[itemKey];

		if (!matchedView) {
			console.warn(`No view found for ${itemKey}`);
			return;
		}
		const view = matchedView(mergedNodes);

		pushViewStack({
			title: view.title,
			subtitle: view?.subtitle ?? '',
			info: view?.info ?? '',
			items: view.items as INodeCreateElement[],
			hasSearch: true,
			rootView: view.value as NodeFilterType,
			mode: 'nodes',
			// Root search should include all nodes
			searchItems: mergedNodes,
		});
	}

	if (item.type === 'link') {
		window.open(item.properties.url, '_blank');
	}
}

function subcategoriesMapper(item: INodeCreateElement) {
	if (item.type !== 'node') return item;

	const hasTriggerGroup = item.properties.group.includes('trigger');
	const nodeActions = getFilteredActions(item);
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

function baseSubcategoriesFilter(item: INodeCreateElement): boolean {
	if (item.type === 'section') return true;
	if (item.type !== 'node') return false;

	const hasTriggerGroup = item.properties.group.includes('trigger');
	const nodeActions = getFilteredActions(item);
	const hasActions = nodeActions.length > 0;

	const isTriggerRootView = activeViewStack.value.rootView === TRIGGER_NODE_CREATOR_VIEW;
	if (isTriggerRootView) {
		return hasActions || hasTriggerGroup;
	}

	return hasActions || !hasTriggerGroup;
}

function arrowLeft() {
	popViewStack();
}

function onKeySelect(activeItemId: string) {
	const mergedItems = flattenCreateElements([
		...(activeViewStack.value.items ?? []),
		...(globalSearchItemsDiff.value ?? []),
	]);

	const item = mergedItems.find((i) => i.uuid === activeItemId);
	if (!item) return;

	onSelected(item);
}

registerKeyHook('MainViewArrowRight', {
	keyboardKeys: ['ArrowRight', 'Enter'],
	condition: (type) => ['subcategory', 'node', 'link', 'view'].includes(type),
	handler: onKeySelect,
});

registerKeyHook('MainViewArrowLeft', {
	keyboardKeys: ['ArrowLeft'],
	condition: (type) => ['subcategory', 'node', 'link', 'view'].includes(type),
	handler: arrowLeft,
});
</script>

<template>
	<span>
		<!-- Main Node Items -->
		<ItemsRenderer
			v-memo="[activeViewStack.search]"
			:elements="activeViewStack.items"
			:class="$style.items"
			@selected="onSelected"
		>
			<template
				v-if="(activeViewStack.items || []).length === 0 && globalSearchItemsDiff.length === 0"
				#empty
			>
				<NoResults
					:root-view="activeViewStack.rootView"
					show-icon
					show-request
					@add-webhook-node="selectNodeType([WEBHOOK_NODE_TYPE])"
					@add-http-node="selectNodeType([HTTP_REQUEST_NODE_TYPE])"
				/>
			</template>
		</ItemsRenderer>
		<!-- Results in other categories -->
		<CategorizedItemsRenderer
			v-if="globalSearchItemsDiff.length > 0"
			:elements="globalSearchItemsDiff"
			:category="i18n.baseText('nodeCreator.categoryNames.otherCategories')"
			@selected="onSelected"
		>
		</CategorizedItemsRenderer>
	</span>
</template>

<style lang="scss" module>
.items {
	margin-bottom: var(--spacing-s);
}
</style>
