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
	AI_MCP_TOOL_NODE_TYPE,
	HITL_SUBCATEGORY,
	MESSAGE_AN_AGENT_NODE_TYPE,
	AI_CATEGORY_MCP_NODES,
	REQUEST_NODE_FORM_URL,
} from '@/app/constants';

import type { BaseTextKey } from '@n8n/i18n';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';

import { TriggerView, RegularView, AIView, AINodesView } from '../../views/viewsData';
import {
	flattenCreateElements,
	filterAndSearchNodes,
	prepareCommunityNodeDetailsViewStack,
	transformNodeType,
	getRootSearchCallouts,
	shouldShowCommunityNodeDetails,
	getHumanInTheLoopActions,
} from '../../nodeCreator.utils';
import { useViewStacks } from '../../composables/useViewStacks';
import { useKeyboardNavigation } from '../../composables/useKeyboardNavigation';
import ItemsRenderer from '../Renderers/ItemsRenderer.vue';
import CategorizedItemsRenderer from '../Renderers/CategorizedItemsRenderer.vue';
import NoResults from '../Panel/NoResults.vue';
import SuggestionFooter from '@/app/components/SuggestionFooter.vue';
import McpRegistrySuggestionFooter from '@/app/components/McpRegistrySuggestionFooter.vue';
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';

import { getNodeIconSource } from '@/app/utils/nodeIcon';

import { useActions } from '../../composables/useActions';
import { type INodeParameters, isCommunityPackageName } from 'n8n-workflow';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

export interface Props {
	rootView: 'trigger' | 'action';
}

const emit = defineEmits<{
	nodeTypeSelected: [value: NodeTypeSelectedPayload[]];
}>();

const i18n = useI18n();

const { isRagStarterCalloutVisible, openSampleWorkflowTemplate } = useCalloutHelpers();

const { mergedNodes, actions, onSubcategorySelected } = useNodeCreatorStore();
const { pushViewStack, popViewStack, isAiSubcategoryView, isHitlSubcategoryView } = useViewStacks();
const { setAddedNodeActionParameters, nodeCreateElementToNodeTypeSelectedPayload } = useActions();

const { registerKeyHook } = useKeyboardNavigation();

const activeViewStack = computed(() => useViewStacks().activeViewStack);
const isMcpCategory = computed(() => activeViewStack.value.subcategory === AI_CATEGORY_MCP_NODES);
const globalSearchItemsDiff = computed(() => useViewStacks().globalSearchItemsDiff);
const workflowDocumentStore = injectWorkflowDocumentStore();

const communityNodesAndActions = computed(() => useNodeTypesStore().communityNodesAndActions);

const moreFromCommunity = computed(() => {
	return filterAndSearchNodes(
		communityNodesAndActions.value.mergedNodes,
		activeViewStack.value.search ?? '',
		{
			isAiSubcategory: isAiSubcategoryView(activeViewStack.value),
			isHitlSubcategory: isHitlSubcategoryView(activeViewStack.value),
			aiConnectionType: activeViewStack.value.connectionType,
		},
	);
});

const isSearchResultEmpty = computed(() => {
	const hasNodeResults = (activeViewStack.value.items ?? []).some(
		(item) => !isMcpCategory.value || item.key !== AI_MCP_TOOL_NODE_TYPE,
	);
	return (
		!hasNodeResults &&
		globalCallouts.value.length +
			globalSearchItemsDiff.value.length +
			moreFromCommunity.value.length ===
			0
	);
});
const showSuggestionFooter = computed(() => isMcpCategory.value || isSearchResultEmpty.value);

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
			...(item.properties.connectionType ? { connectionType: item.properties.connectionType } : {}),
			rootView: activeViewStack.value.rootView,
			forceIncludeNodes: item.properties.forceIncludeNodes,
			baseFilter: baseSubcategoriesFilter,
			itemsMapper: subcategoriesMapper,
			sections: item.properties.sections,
			items: item.properties.items,
			hideActions: item.properties.hideActions,
			actionsFilter: item.properties.actionsFilter,
		});

		onSubcategorySelected({
			subcategory: item.key,
		});
	}

	if (item.type === 'node') {
		const payload = nodeCreateElementToNodeTypeSelectedPayload(item);
		let nodeActions = getFilteredActions(item, actions);
		const notInstalledCommunityNode =
			isCommunityPackageName(item.key) && !useNodeTypesStore().getIsNodeInstalled(item.key);
		const nodeIcon = getNodeIconSource(
			item.properties,
			null,
			workflowDocumentStore?.value?.getExpressionHandler() ?? null,
		);

		// Instead of dropping the node on the canvas, open the agent picker
		// sub-panel; it adds the node itself with the picked agent preset.
		if (item.key === MESSAGE_AN_AGENT_NODE_TYPE) {
			pushViewStack({
				title: item.properties.displayName,
				nodeIcon,
				rootView: activeViewStack.value.rootView,
				hasSearch: true,
				mode: 'agents',
				// Deliberately [] rather than undefined so the stack doesn't get
				// baseline items from the default subcategory.
				items: [],
			});
			return;
		}

		if (
			shouldShowCommunityNodeDetails(isCommunityPackageName(item.key), activeViewStack.value) ||
			notInstalledCommunityNode
		) {
			if (!nodeActions.length) {
				nodeActions = getFilteredActions(item, communityNodesAndActions.value.actions);
			}

			const viewStack = prepareCommunityNodeDetailsViewStack(
				item,
				nodeIcon,
				activeViewStack.value.rootView,
				nodeActions,
			);

			pushViewStack(viewStack);
			return;
		}

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
			nodeIcon,
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
		openSampleWorkflowTemplate(item.properties.templateId, {
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
	...getRootSearchCallouts(
		activeViewStack.value.search ?? '',
		{ isRagStarterCalloutVisible: isRagStarterCalloutVisible.value },
		mergedNodes,
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
	<span
		:class="{
			[$style.withSuggestionFooter]: showSuggestionFooter,
		}"
	>
		<!-- Global Callouts-->
		<ItemsRenderer
			v-if="globalCallouts.length > 0"
			:elements="globalCallouts"
			:class="$style.items"
			@selected="onSelected"
		/>

		<!-- Main Node Items -->
		<ItemsRenderer
			v-memo="[activeViewStack.search]"
			:elements="activeViewStack.items"
			:class="[$style.items, { [$style.emptyItems]: isSearchResultEmpty && !isMcpCategory }]"
			@selected="onSelected"
		>
			<template v-if="isSearchResultEmpty" #empty>
				<NoResults
					:query="activeViewStack.search ?? ''"
					:root-view="activeViewStack.rootView"
					@add-webhook-node="emit('nodeTypeSelected', [{ type: WEBHOOK_NODE_TYPE }])"
					@add-http-node="emit('nodeTypeSelected', [{ type: HTTP_REQUEST_NODE_TYPE }])"
				/>
			</template>
		</ItemsRenderer>

		<!-- Render empty state for MCP separately because ItemsRenderer renders
			the empty slot only when there are no elements. However, for MCP we
			always have the generic client pinned at the top -->
		<div v-if="isMcpCategory && isSearchResultEmpty" :class="$style.mcpNoResults">
			<N8nText color="text-light">
				{{
					i18n.baseText('nodeCreator.noResults.noResultsFor', {
						interpolate: { query: activeViewStack.search ?? '' },
					})
				}}
			</N8nText>
		</div>

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

		<McpRegistrySuggestionFooter
			v-if="isMcpCategory"
			:prompt="i18n.baseText('nodeCreator.noResults.needAnotherCapability')"
			:action="i18n.baseText('nodeCreator.noResults.suggestTool')"
			:class="$style.suggestionFooter"
		/>
		<SuggestionFooter
			v-else-if="showSuggestionFooter"
			:prompt="i18n.baseText('nodeCreator.noResults.needNativeIntegration')"
			:action="i18n.baseText('nodeCreator.noResults.suggestNode')"
			:url="REQUEST_NODE_FORM_URL"
			:class="[$style.suggestionFooter, $style.insetSuggestionFooter]"
		/>
	</span>
</template>

<style lang="scss" module>
.items {
	margin-bottom: var(--spacing--sm);
}

.withSuggestionFooter {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
	margin-bottom: calc(-1 * var(--spacing--xl));
}

.emptyItems {
	flex: 1;
	min-height: 0;
	margin-bottom: 0;
}

.mcpNoResults {
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: center;
}

.suggestionFooter {
	margin-top: auto;
}

.insetSuggestionFooter {
	margin-inline: var(--spacing--sm);
}
</style>
