<script setup lang="ts">
import camelCase from 'lodash/camelCase';
import { computed } from 'vue';
import type {
	ActionTypeDescription,
	INodeCreateElement,
	NodeCreateElement,
	NodeFilterType,
	NodeTypeSelectedPayload,
} from '@/Interface';
import {
	TRIGGER_NODE_CREATOR_VIEW,
	HTTP_REQUEST_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	REGULAR_NODE_CREATOR_VIEW,
	AI_NODE_CREATOR_VIEW,
	AI_OTHERS_NODE_CREATOR_VIEW,
	HITL_SUBCATEGORY,
	PRE_BUILT_AGENTS_COLLECTION,
} from '@/constants';

import type { BaseTextKey } from '@n8n/i18n';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';

import { TriggerView, RegularView, AIView, AINodesView } from '../viewsData';
import {
	flattenCreateElements,
	filterAndSearchNodes,
	prepareCommunityNodeDetailsViewStack,
	transformNodeType,
	getRootSearchCallouts,
	getActiveViewCallouts,
	shouldShowCommunityNodeDetails,
	getHumanInTheLoopActions,
} from '../utils';
import { useViewStacks } from '../composables/useViewStacks';
import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import ItemsRenderer from '../Renderers/ItemsRenderer.vue';
import CategorizedItemsRenderer from '../Renderers/CategorizedItemsRenderer.vue';
import NoResults from '../Panel/NoResults.vue';
import { useI18n } from '@n8n/i18n';

import { getNodeIconSource } from '@/utils/nodeIcon';

import { useActions } from '../composables/useActions';
import { type INodeParameters, isCommunityPackageName } from 'n8n-workflow';

import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCalloutHelpers } from '@/composables/useCalloutHelpers';

export interface Props {
	rootView: 'trigger' | 'action';
}

const emit = defineEmits<{
	nodeTypeSelected: [value: NodeTypeSelectedPayload[]];
}>();

const i18n = useI18n();

const calloutHelpers = useCalloutHelpers();

const { mergedNodes, actions, onSubcategorySelected } = useNodeCreatorStore();
const { pushViewStack, popViewStack, isAiSubcategoryView } = useViewStacks();
const { setAddedNodeActionParameters, nodeCreateElementToNodeTypeSelectedPayload } = useActions();

const { registerKeyHook } = useKeyboardNavigation();

const activeViewStack = computed(() => useViewStacks().activeViewStack);

const globalSearchItemsDiff = computed(() => useViewStacks().globalSearchItemsDiff);

const communityNodesAndActions = computed(() => useNodeTypesStore().communityNodesAndActions);

const moreFromCommunity = computed(() => {
	return filterAndSearchNodes(
		communityNodesAndActions.value.mergedNodes,
		activeViewStack.value.search ?? '',
		isAiSubcategoryView(activeViewStack.value),
	);
});

const isSearchResultEmpty = computed(() => {
	return (
		(activeViewStack.value.items || []).length === 0 &&
		globalCallouts.value.length +
			globalSearchItemsDiff.value.length +
			moreFromCommunity.value.length ===
			0
	);
});

function getFilteredActions(
	node: NodeCreateElement,
	actions: Record<string, ActionTypeDescription[]>,
) {
	const nodeActions = actions?.[node.key] || [];
	if (activeViewStack.value.subcategory === HITL_SUBCATEGORY) {
		return getHumanInTheLoopActions(nodeActions);
	}
	if (activeViewStack.value.actionsFilter) {
		return activeViewStack.value.actionsFilter(nodeActions);
	}
	return nodeActions;
}

function onSelected(item: INodeCreateElement) {
	if (item.key === PRE_BUILT_AGENTS_COLLECTION) {
		void calloutHelpers.openPreBuiltAgentsCollection({
			telemetry: {
				source: 'nodeCreator',
				section: activeViewStack.value.title,
			},
			resetStacks: false,
		});
		return;
	}

	if (item.type === 'subcategory') {
		const subcategoryKey = camelCase(item.properties.title);
		const title = i18n.baseText(`nodeCreator.subcategoryNames.${subcategoryKey}` as BaseTextKey);

		// If the info message exists in locale, add it to the info field of the view
		const infoKey = `nodeCreator.subcategoryInfos.${subcategoryKey}` as BaseTextKey;
		const info = i18n.baseText(infoKey);
		const extendedInfo = info !== infoKey ? { info } : {};
		const nodeIcon = item.properties.icon
			? ({ type: 'icon', name: item.properties.icon } as const)
			: undefined;

		pushViewStack({
			subcategory: item.key,
			mode: 'nodes',
			title,
			nodeIcon,
			...extendedInfo,
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
		let nodeActions = getFilteredActions(item, actions);

		if (shouldShowCommunityNodeDetails(isCommunityPackageName(item.key), activeViewStack.value)) {
			if (!nodeActions.length) {
				nodeActions = getFilteredActions(item, communityNodesAndActions.value.actions);
			}

			const viewStack = prepareCommunityNodeDetailsViewStack(
				item,
				getNodeIconSource(item.properties),
				activeViewStack.value.rootView,
				nodeActions,
			);

			pushViewStack(viewStack);
			return;
		}

		const payload = nodeCreateElementToNodeTypeSelectedPayload(item);

		// If there is only one action, use it
		if (nodeActions.length === 1) {
			emit('nodeTypeSelected', [payload]);
			setAddedNodeActionParameters({
				name: nodeActions[0].defaults.name ?? item.properties.displayName,
				key: item.key,
				value: nodeActions[0].values as INodeParameters,
			});
			return;
		}

		// Only show actions if there are more than one or if the view is not an AI subcategory
		if (nodeActions.length === 0 || activeViewStack.value.hideActions) {
			emit('nodeTypeSelected', [payload]);
			return;
		}

		const transformedActions = nodeActions?.map((a) =>
			transformNodeType(a, item.properties.displayName, 'action'),
		);

		pushViewStack({
			subcategory: item.properties.displayName,
			title: item.properties.displayName,
			nodeIcon: getNodeIconSource(item.properties),
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

	if (item.type === 'openTemplate') {
		calloutHelpers.openSampleWorkflowTemplate(item.properties.templateId, {
			telemetry: {
				source: 'nodeCreator',
				section: activeViewStack.value.title,
			},
		});
	}
}

function subcategoriesMapper(item: INodeCreateElement) {
	if (item.type !== 'node') return item;

	const hasTriggerGroup = item.properties.group.includes('trigger');
	const nodeActions = getFilteredActions(item, actions);
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
	const nodeActions = getFilteredActions(item, actions);
	const hasActions = nodeActions.length > 0;

	const isTriggerRootView = activeViewStack.value.rootView === TRIGGER_NODE_CREATOR_VIEW;
	if (isTriggerRootView) {
		return hasActions || hasTriggerGroup;
	}

	return hasActions || !hasTriggerGroup;
}

const globalCallouts = computed<INodeCreateElement[]>(() => [
	...getRootSearchCallouts(activeViewStack.value.search ?? '', {
		isRagStarterCalloutVisible: calloutHelpers.isRagStarterCalloutVisible.value,
	}),
	...getActiveViewCallouts(
		activeViewStack.value.title,
		calloutHelpers.isPreBuiltAgentsCalloutVisible.value,
		calloutHelpers.getPreBuiltAgentNodeCreatorItems(),
	),
]);

function arrowLeft() {
	popViewStack();
}

function onKeySelect(activeItemId: string) {
	const mergedItems = flattenCreateElements([
		...(globalCallouts.value ?? []),
		...(activeViewStack.value.items ?? []),
		...(globalSearchItemsDiff.value ?? []),
		...(moreFromCommunity.value ?? []),
	]);

	const item = mergedItems.find((i) => i.uuid === activeItemId);
	if (!item) return;

	onSelected(item);
}

registerKeyHook('MainViewArrowRight', {
	keyboardKeys: ['ArrowRight', 'Enter'],
	condition: (type) => ['subcategory', 'node', 'link', 'view', 'openTemplate'].includes(type),
	handler: onKeySelect,
});

registerKeyHook('MainViewArrowLeft', {
	keyboardKeys: ['ArrowLeft'],
	condition: (type) => ['subcategory', 'node', 'link', 'view', 'openTemplate'].includes(type),
	handler: arrowLeft,
});
</script>

<template>
	<span>
		<!-- Global Callouts-->
		<ItemsRenderer :elements="globalCallouts" :class="$style.items" @selected="onSelected" />

		<!-- Main Node Items -->
		<ItemsRenderer
			v-memo="[activeViewStack.search]"
			:elements="activeViewStack.items"
			:class="$style.items"
			@selected="onSelected"
		>
			<template v-if="isSearchResultEmpty" #empty>
				<NoResults
					:root-view="activeViewStack.rootView"
					show-icon
					show-request
					@add-webhook-node="emit('nodeTypeSelected', [{ type: WEBHOOK_NODE_TYPE }])"
					@add-http-node="emit('nodeTypeSelected', [{ type: HTTP_REQUEST_NODE_TYPE }])"
				/>
			</template>
		</ItemsRenderer>

		<!-- Results in other categories -->
		<CategorizedItemsRenderer
			v-if="globalSearchItemsDiff.length > 0"
			:elements="globalSearchItemsDiff"
			:category="i18n.baseText('nodeCreator.categoryNames.otherCategories')"
			:expanded="true"
			@selected="onSelected"
		>
		</CategorizedItemsRenderer>

		<!-- Results in community nodes -->
		<CategorizedItemsRenderer
			v-if="moreFromCommunity.length > 0"
			:elements="moreFromCommunity"
			:category="i18n.baseText('nodeCreator.categoryNames.moreFromCommunity')"
			:expanded="true"
			@selected="onSelected"
		>
		</CategorizedItemsRenderer>
	</span>
</template>

<style lang="scss" module>
.items {
	margin-bottom: var(--spacing--sm);
}
</style>
