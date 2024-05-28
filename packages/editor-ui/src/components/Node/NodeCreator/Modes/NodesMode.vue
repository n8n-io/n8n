<script setup lang="ts">
import { camelCase } from 'lodash-es';
import { computed } from 'vue';
import type { INodeCreateElement, NodeFilterType } from '@/Interface';
import {
	TRIGGER_NODE_CREATOR_VIEW,
	HTTP_REQUEST_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	REGULAR_NODE_CREATOR_VIEW,
	AI_NODE_CREATOR_VIEW,
	AI_OTHERS_NODE_CREATOR_VIEW,
} from '@/constants';

import type { BaseTextKey } from '@/plugins/i18n';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';

import { TriggerView, RegularView, AIView, AINodesView } from '../viewsData';
import { flattenCreateElements, transformNodeType } from '../utils';
import { useViewStacks } from '../composables/useViewStacks';
import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import ItemsRenderer from '../Renderers/ItemsRenderer.vue';
import CategorizedItemsRenderer from '../Renderers/CategorizedItemsRenderer.vue';
import NoResults from '../Panel/NoResults.vue';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';

export interface Props {
	rootView: 'trigger' | 'action';
}

const emit = defineEmits({
	nodeTypeSelected: (_nodeTypes: string[]) => true,
});

const i18n = useI18n();
const telemetry = useTelemetry();

const { mergedNodes, actions } = useNodeCreatorStore();
const { baseUrl } = useRootStore();
const { pushViewStack, popViewStack } = useViewStacks();

const { registerKeyHook } = useKeyboardNavigation();

const activeViewStack = computed(() => useViewStacks().activeViewStack);
const globalSearchItemsDiff = computed(() => useViewStacks().globalSearchItemsDiff);

function selectNodeType(nodeTypes: string[]) {
	emit('nodeTypeSelected', nodeTypes);
}

function onSelected(item: INodeCreateElement) {
	if (item.type === 'subcategory') {
		const subcategoryKey = camelCase(item.properties.title);
		const title = i18n.baseText(`nodeCreator.subcategoryNames.${subcategoryKey}` as BaseTextKey);

		pushViewStack({
			subcategory: item.key,
			title,
			mode: 'nodes',
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

		telemetry.trackNodesPanel('nodeCreateList.onSubcategorySelected', {
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
				color: item.properties.defaults?.color?.toString(),
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

function baseSubcategoriesFilter(item: INodeCreateElement): boolean {
	if (item.type === 'section') return true;
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
		<ItemsRenderer :elements="activeViewStack.items" :class="$style.items" @selected="onSelected">
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
