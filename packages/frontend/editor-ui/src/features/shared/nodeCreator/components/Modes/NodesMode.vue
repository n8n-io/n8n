<script setup lang="ts">
import { computed } from 'vue';
import type { INodeCreateElement, NodeTypeSelectedPayload } from '@/Interface';
import {
	HTTP_REQUEST_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	AI_MCP_TOOL_NODE_TYPE,
	MESSAGE_AN_AGENT_NODE_TYPE,
	AI_CATEGORY_MCP_NODES,
	REQUEST_NODE_FORM_URL,
} from '@/app/constants';

import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';

import {
	flattenCreateElements,
	filterAndSearchNodes,
	prepareCommunityNodeDetailsViewStack,
	transformNodeType,
	getRootSearchCallouts,
	shouldShowCommunityNodeDetails,
	isNodeItemRestricted,
	sinkRestrictedNodesLast,
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

const nodeCreatorStore = useNodeCreatorStore();
const { mergedNodes, onSubcategorySelected } = nodeCreatorStore;
const {
	pushViewStack,
	popViewStack,
	isAiSubcategoryView,
	isHitlSubcategoryView,
	getFilteredActions,
	subcategoryStack,
	viewStackByKey,
} = useViewStacks();
const { setAddedNodeActionParameters, nodeCreateElementToNodeTypeSelectedPayload } = useActions();

const { registerKeyHook } = useKeyboardNavigation();

const activeViewStack = computed(() => useViewStacks().activeViewStack);
const isMcpCategory = computed(() => activeViewStack.value.subcategory === AI_CATEGORY_MCP_NODES);
const globalSearchItemsDiff = computed(() => useViewStacks().globalSearchItemsDiff);
const workflowDocumentStore = injectWorkflowDocumentStore();

const nodeTypesStore = useNodeTypesStore();
const communityNodesAndActions = computed(() => nodeTypesStore.communityNodesAndActions);

const moreFromCommunity = computed(() => {
	const hits = filterAndSearchNodes(
		communityNodesAndActions.value.mergedNodes,
		activeViewStack.value.search ?? '',
		{
			isAiSubcategory: isAiSubcategoryView(activeViewStack.value),
			isHitlSubcategory: isHitlSubcategoryView(activeViewStack.value),
			aiConnectionType: activeViewStack.value.connectionType,
		},
	);
	return sinkRestrictedNodesLast(hits, isNodeItemRestricted);
});

const isSearchResultEmpty = computed(() => {
	// The pinned MCP client is a placeholder, not a result — unless it is restricted, in which
	// case it is an ordinary search hit.
	const hasNodeResults = (activeViewStack.value.items ?? []).some(
		(item) =>
			!isMcpCategory.value || item.key !== AI_MCP_TOOL_NODE_TYPE || isNodeItemRestricted(item.key),
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

function onSelected(item: INodeCreateElement) {
	// Insertion itself is refused in getAddedNodesAndConnections; this keeps a restricted
	// node from opening its actions view.
	if (item.type === 'node' && isNodeItemRestricted(item.key)) return;

	if (item.type === 'subcategory') {
		pushViewStack(subcategoryStack(item, activeViewStack.value.rootView));
		onSubcategorySelected({ subcategory: item.key });
	}

	if (item.type === 'node') {
		const payload = nodeCreateElementToNodeTypeSelectedPayload(item);
		let nodeActions = getFilteredActions(activeViewStack.value, item, nodeCreatorStore.actions);
		const notInstalledCommunityNode =
			isCommunityPackageName(item.key) && !nodeTypesStore.getIsNodeInstalled(item.key);
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
				nodeActions = getFilteredActions(
					activeViewStack.value,
					item,
					communityNodesAndActions.value.actions,
				);
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
		const stack = viewStackByKey(item.key);
		if (!stack) {
			console.warn(`No view found for ${item.key}`);
			return;
		}
		pushViewStack(stack);
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
					:suggest-webhook="
						!isNodeItemRestricted(WEBHOOK_NODE_TYPE) &&
						!nodeTypesStore.isNodeTypeUnavailable(WEBHOOK_NODE_TYPE)
					"
					:suggest-http-request="
						!isNodeItemRestricted(HTTP_REQUEST_NODE_TYPE) &&
						!nodeTypesStore.isNodeTypeUnavailable(HTTP_REQUEST_NODE_TYPE)
					"
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
