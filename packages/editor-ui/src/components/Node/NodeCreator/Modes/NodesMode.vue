<script setup lang="ts">
import { camelCase } from 'lodash-es';
import { getCurrentInstance, computed } from 'vue';
import type { INodeCreateElement, NodeFilterType } from '@/Interface';
import { TRIGGER_NODE_CREATOR_VIEW, HTTP_REQUEST_NODE_TYPE, WEBHOOK_NODE_TYPE } from '@/constants';

import type { BaseTextKey } from '@/plugins/i18n';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';

import { TriggerView, RegularView } from '../viewsData';
import { transformNodeType } from '../utils';
import { useViewStacks } from '../composables/useViewStacks';
import { useActions } from '../composables/useActions';
import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import ItemsRenderer from '../Renderers/ItemsRenderer.vue';
import CategorizedItemsRenderer from '../Renderers/CategorizedItemsRenderer.vue';
import NoResults from '../Panel/NoResults.vue';

export interface Props {
	rootView: 'trigger' | 'action';
}

const emit = defineEmits({
	nodeTypeSelected: (nodeTypes: string[]) => true,
});

const instance = getCurrentInstance();
const { mergedNodes, actions } = useNodeCreatorStore();
const { baseUrl } = useRootStore();
const { getNodeTypesWithManualTrigger } = useActions();
const { pushViewStack, popViewStack } = useViewStacks();

const { registerKeyHook } = useKeyboardNavigation();

const activeViewStack = computed(() => useViewStacks().activeViewStack);
const globalSearchItemsDiff = computed(() => useViewStacks().globalSearchItemsDiff);

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
			hasSearch: true,
			mode: 'actions',
			items: transformedActions,
		});
	}

	if (item.type === 'view') {
		const view =
			item.key === TRIGGER_NODE_CREATOR_VIEW
				? TriggerView(instance?.proxy?.$locale)
				: RegularView(instance?.proxy?.$locale);

		pushViewStack({
			title: view.title,
			subtitle: view?.subtitle ?? '',
			items: view.items as INodeCreateElement[],
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
	const mergedItems = [
		...(activeViewStack.value.items || []),
		...(globalSearchItemsDiff.value || []),
	];

	const item = mergedItems.find((i) => i.uuid === activeItemId);
	if (!item) return;

	onSelected(item as INodeCreateElement);
}

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
</script>

<template>
	<span>
		<!-- Main Node Items -->
		<ItemsRenderer :elements="activeViewStack.items" @selected="onSelected" :class="$style.items">
			<template
				#empty
				v-if="(activeViewStack.items || []).length === 0 && globalSearchItemsDiff.length === 0"
			>
				<NoResults
					:rootView="activeViewStack.rootView"
					showIcon
					showRequest
					@addWebhookNode="selectNodeType([WEBHOOK_NODE_TYPE])"
					@addHttpNode="selectNodeType([HTTP_REQUEST_NODE_TYPE])"
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

<style lang="scss" module>
.items {
	margin-bottom: var(--spacing-s);
}
</style>
