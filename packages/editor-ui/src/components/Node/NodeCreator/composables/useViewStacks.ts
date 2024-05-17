import type { INodeCreateElement, NodeFilterType, SimplifiedNodeType } from '@/Interface';
import {
	AI_CODE_NODE_TYPE,
	AI_OTHERS_NODE_CREATOR_VIEW,
	DEFAULT_SUBCATEGORY,
	TRIGGER_NODE_CREATOR_VIEW,
} from '@/constants';
import { defineStore } from 'pinia';
import { v4 as uuid } from 'uuid';
import { computed, nextTick, ref } from 'vue';

import { useNodeCreatorStore } from '@/stores/nodeCreator.store';

import {
	flattenCreateElements,
	groupItemsInSections,
	searchNodes,
	sortNodeCreateElements,
	subcategorizeItems,
	transformNodeType,
} from '../utils';

import type { NodeViewItem, NodeViewItemSection } from '@/components/Node/NodeCreator/viewsData';
import { AINodesView } from '@/components/Node/NodeCreator/viewsData';
import { useI18n } from '@/composables/useI18n';
import { useKeyboardNavigation } from './useKeyboardNavigation';

import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { INodeInputFilter, NodeConnectionType } from 'n8n-workflow';

interface ViewStack {
	uuid?: string;
	title?: string;
	subtitle?: string;
	search?: string;
	subcategory?: string;
	info?: string;
	nodeIcon?: {
		iconType?: string;
		icon?: string;
		color?: string;
	};
	iconUrl?: string;
	rootView?: NodeFilterType;
	activeIndex?: number;
	transitionDirection?: 'in' | 'out';
	hasSearch?: boolean;
	preventBack?: boolean;
	items?: INodeCreateElement[];
	baselineItems?: INodeCreateElement[];
	searchItems?: SimplifiedNodeType[];
	forceIncludeNodes?: string[];
	mode?: 'actions' | 'nodes';
	baseFilter?: (item: INodeCreateElement) => boolean;
	itemsMapper?: (item: INodeCreateElement) => INodeCreateElement;
	panelClass?: string;
	sections?: string[] | NodeViewItemSection[];
}

export const useViewStacks = defineStore('nodeCreatorViewStacks', () => {
	const nodeCreatorStore = useNodeCreatorStore();
	const { getActiveItemIndex } = useKeyboardNavigation();

	const viewStacks = ref<ViewStack[]>([]);

	const activeStackItems = computed<INodeCreateElement[]>(() => {
		const stack = viewStacks.value[viewStacks.value.length - 1];

		if (!stack?.baselineItems) {
			return stack.items ? extendItemsWithUUID(stack.items) : [];
		}

		if (stack.search && searchBaseItems.value) {
			const searchBase =
				searchBaseItems.value.length > 0
					? searchBaseItems.value
					: flattenCreateElements(stack.baselineItems ?? []);

			return extendItemsWithUUID(searchNodes(stack.search || '', searchBase));
		}
		return extendItemsWithUUID(stack.baselineItems);
	});

	const activeViewStack = computed<ViewStack>(() => {
		const stack = viewStacks.value[viewStacks.value.length - 1];
		if (!stack) return {};

		const flatBaselineItems = flattenCreateElements(stack.baselineItems ?? []);

		return {
			...stack,
			items: activeStackItems.value,
			hasSearch: flatBaselineItems.length > 8 || stack?.hasSearch,
		};
	});

	const activeViewStackMode = computed(
		() => activeViewStack.value.mode || TRIGGER_NODE_CREATOR_VIEW,
	);

	const searchBaseItems = computed<INodeCreateElement[]>(() => {
		const stack = viewStacks.value[viewStacks.value.length - 1];
		if (!stack?.searchItems) return [];

		return stack.searchItems.map((item) => transformNodeType(item, stack.subcategory));
	});

	// Generate a delta between the global search results(all nodes) and the stack search results
	const globalSearchItemsDiff = computed<INodeCreateElement[]>(() => {
		const stack = viewStacks.value[viewStacks.value.length - 1];
		if (!stack?.search) return [];

		const allNodes = nodeCreatorStore.mergedNodes.map((item) => transformNodeType(item));
		const globalSearchResult = extendItemsWithUUID(searchNodes(stack.search || '', allNodes));

		return globalSearchResult.filter((item) => {
			return !activeStackItems.value.find((activeItem) => activeItem.key === item.key);
		});
	});

	const itemsBySubcategory = computed(() => subcategorizeItems(nodeCreatorStore.mergedNodes));

	async function gotoCompatibleConnectionView(
		connectionType: NodeConnectionType,
		isOutput?: boolean,
		filter?: INodeInputFilter,
	) {
		const i18n = useI18n();

		let nodesByConnectionType: { [key: string]: string[] };
		let relatedAIView: { properties: NodeViewItem['properties'] } | undefined;

		if (isOutput === true) {
			nodesByConnectionType = useNodeTypesStore().visibleNodeTypesByInputConnectionTypeNames;
			relatedAIView = {
				properties: {
					title: i18n.baseText('nodeCreator.aiPanel.aiNodes'),
					icon: 'robot',
				},
			};
		} else {
			nodesByConnectionType = useNodeTypesStore().visibleNodeTypesByOutputConnectionTypeNames;

			relatedAIView = AINodesView([]).items.find(
				(item) => item.properties.connectionType === connectionType,
			);
		}

		await nextTick();
		pushViewStack({
			title: relatedAIView?.properties.title,
			rootView: AI_OTHERS_NODE_CREATOR_VIEW,
			mode: 'nodes',
			items: nodeCreatorStore.allNodeCreatorNodes,
			nodeIcon: {
				iconType: 'icon',
				icon: relatedAIView?.properties.icon,
				color: relatedAIView?.properties.iconProps?.color,
			},
			panelClass: relatedAIView?.properties.panelClass,
			baseFilter: (i: INodeCreateElement) => {
				// AI Code node could have any connection type so we don't want to display it
				// in the compatible connection view as it would be displayed in all of them
				if (i.key === AI_CODE_NODE_TYPE) return false;
				const displayNode = nodesByConnectionType[connectionType].includes(i.key);

				// TODO: Filtering works currently fine for displaying compatible node when dropping
				//       input connections. However, it does not work for output connections.
				//       For that reason does it currently display nodes that are maybe not compatible
				//       but then errors once it got selected by the user.
				if (displayNode && filter?.nodes?.length) {
					return filter.nodes.includes(i.key);
				}

				return displayNode;
			},
			itemsMapper(item) {
				return {
					...item,
					subcategory: connectionType,
				};
			},
			preventBack: true,
		});
	}

	function setStackBaselineItems() {
		const stack = viewStacks.value[viewStacks.value.length - 1];
		if (!stack || !activeViewStack.value.uuid) return;

		let stackItems = stack?.items ?? [];

		if (!stack?.items) {
			const subcategory = stack?.subcategory ?? DEFAULT_SUBCATEGORY;
			const itemsInSubcategory = itemsBySubcategory.value[subcategory];
			const sections = stack.sections;

			if (sections) {
				stackItems = groupItemsInSections(itemsInSubcategory, sections);
			} else {
				stackItems = itemsInSubcategory;
			}
		}

		// Ensure that the nodes specified in `stack.forceIncludeNodes` are always included,
		// regardless of whether the subcategory is matched
		if ((stack.forceIncludeNodes ?? []).length > 0) {
			const matchedNodes = nodeCreatorStore.mergedNodes
				.filter((item) => stack.forceIncludeNodes?.includes(item.name))
				.map((item) => transformNodeType(item, stack.subcategory));

			stackItems.push(...matchedNodes);
		}

		if (stack.baseFilter) {
			stackItems = stackItems.filter(stack.baseFilter);
		}

		if (stack.itemsMapper) {
			stackItems = stackItems.map(stack.itemsMapper);
		}

		// Sort only if non-root view
		if (!stack.items) {
			stackItems = sortNodeCreateElements(stackItems);
		}

		updateCurrentViewStack({ baselineItems: stackItems });
	}

	function extendItemsWithUUID(items: INodeCreateElement[]) {
		return items.map((item) => ({
			...item,
			uuid: `${item.key}-${uuid()}`,
		}));
	}

	function pushViewStack(stack: ViewStack) {
		if (activeViewStack.value.uuid) {
			updateCurrentViewStack({ activeIndex: getActiveItemIndex() });
		}

		const newStackUuid = uuid();
		viewStacks.value.push({
			...stack,
			uuid: newStackUuid,
			transitionDirection: 'in',
			activeIndex: 0,
		});
		setStackBaselineItems();
	}

	function popViewStack() {
		if (activeViewStack.value.uuid) {
			viewStacks.value.pop();
			updateCurrentViewStack({ transitionDirection: 'out' });
		}
	}

	function updateCurrentViewStack(stack: Partial<ViewStack>) {
		const currentStack = viewStacks.value[viewStacks.value.length - 1];
		const matchedIndex = viewStacks.value.findIndex((s) => s.uuid === currentStack.uuid);
		if (!currentStack) return;

		// For each key in the stack, update the matched stack
		Object.keys(stack).forEach((key) => {
			const typedKey = key as keyof ViewStack;
			viewStacks.value[matchedIndex] = {
				...viewStacks.value[matchedIndex],
				[key]: stack[typedKey],
			};
		});
	}

	function resetViewStacks() {
		viewStacks.value = [];
	}

	return {
		viewStacks,
		activeViewStack,
		activeViewStackMode,
		globalSearchItemsDiff,
		gotoCompatibleConnectionView,
		resetViewStacks,
		updateCurrentViewStack,
		pushViewStack,
		popViewStack,
	};
});
