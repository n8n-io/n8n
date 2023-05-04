import { computed, ref, set } from 'vue';
import { defineStore } from 'pinia';
import { v4 as uuid } from 'uuid';
import type { INodeCreateElement, NodeFilterType, SimplifiedNodeType } from '@/Interface';
import { DEFAULT_SUBCATEGORY, TRIGGER_NODE_CREATOR_VIEW } from '@/constants';

import { useNodeCreatorStore } from '@/stores/nodeCreator';

import { useKeyboardNavigation } from './useKeyboardNavigation';
import {
	transformNodeType,
	subcategorizeItems,
	sortNodeCreateElements,
	searchNodes,
} from '../utils';

interface ViewStack {
	uuid?: string;
	title?: string;
	subtitle?: string;
	search?: string;
	subcategory?: string;
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
	items?: INodeCreateElement[];
	baselineItems?: INodeCreateElement[];
	searchItems?: SimplifiedNodeType[];
	forceIncludeNodes?: string[];
	mode?: 'actions' | 'nodes';
	baseFilter?: (item: INodeCreateElement) => boolean;
	itemsMapper?: (item: INodeCreateElement) => INodeCreateElement;
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
				searchBaseItems.value.length > 0 ? searchBaseItems.value : stack.baselineItems;

			return extendItemsWithUUID(searchNodes(stack.search || '', searchBase));
		}
		return extendItemsWithUUID(stack.baselineItems);
	});

	const activeViewStack = computed<ViewStack>(() => {
		const stack = viewStacks.value[viewStacks.value.length - 1];
		if (!stack) return {};

		return {
			...stack,
			items: activeStackItems.value,
			hasSearch: (stack.baselineItems || []).length > 8 || stack?.hasSearch,
		};
	});

	const activeViewStackMode = computed(
		() => activeViewStack.value.mode || TRIGGER_NODE_CREATOR_VIEW,
	);

	const searchBaseItems = computed<INodeCreateElement[]>(() => {
		const stack = viewStacks.value[viewStacks.value.length - 1];
		if (!stack || !stack.searchItems) return [];

		return stack.searchItems.map((item) => transformNodeType(item, stack.subcategory));
	});

	// Generate a delta between the global search results(all nodes) and the stack search results
	const globalSearchItemsDiff = computed<INodeCreateElement[]>(() => {
		const stack = viewStacks.value[viewStacks.value.length - 1];
		if (!stack || !stack.search) return [];

		const allNodes = nodeCreatorStore.mergedNodes.map((item) => transformNodeType(item));
		const globalSearchResult = extendItemsWithUUID(searchNodes(stack.search || '', allNodes));

		return globalSearchResult.filter((item) => {
			return !activeStackItems.value.find((activeItem) => activeItem.key === item.key);
		});
	});

	function setStackBaselineItems() {
		const stack = viewStacks.value[viewStacks.value.length - 1];
		if (!stack || !activeViewStack.value.uuid) return;

		const subcategorizedItems = subcategorizeItems(nodeCreatorStore.mergedNodes);
		let stackItems =
			stack?.items ?? subcategorizedItems[stack?.subcategory ?? DEFAULT_SUBCATEGORY] ?? [];

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
			sortNodeCreateElements(stackItems);
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
			set(viewStacks.value[matchedIndex], key, stack[typedKey]);
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
		resetViewStacks,
		updateCurrentViewStack,
		pushViewStack,
		popViewStack,
	};
});
