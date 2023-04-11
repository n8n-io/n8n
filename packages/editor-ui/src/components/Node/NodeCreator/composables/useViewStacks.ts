import {
	computed,
	ref,
	set,
} from 'vue';
import { defineStore } from 'pinia';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { v4 as uuid } from 'uuid';
import { INodeCreateElement, SimplifiedNodeType } from '@/Interface';
import { useNodesSearch } from './useNodesSearch';
import { transformNodeType, subcategorizeItems, sortNodeCreateElements } from '../utils';
import { useKeyboardNavigation } from './useKeyboardNavigation';
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
	activeIndex?: number;
	hasHeaderBg?: boolean;
	transitionDirection?: 'in' | 'out';
	hasSearch?: boolean;
	items?: INodeCreateElement[];
	baselineItems?: INodeCreateElement[];
	searchItems?: SimplifiedNodeType[];
	forceIncludeNodes?: string[];
	mode?: 'regular' | 'trigger' | 'action';
	baseFilter?: (item: INodeCreateElement) => boolean;
	itemsMapper?: (item: INodeCreateElement) => INodeCreateElement;
}

export const useViewStacks = defineStore('nodeCreatorViewStacks', () => {
	const nodeCreatorStore = useNodeCreatorStore();
	const { searchNodes } = useNodesSearch();
	const { getActiveItemIndex } = useKeyboardNavigation();

	const viewStacks = ref<ViewStack[]>([]);

	const isRootView = computed(() => viewStacks.value.length <= 1);

	const activeStackItems = computed<INodeCreateElement[]>(() => {
		const stack = viewStacks.value[viewStacks.value.length - 1];

		if (!stack || !stack.baselineItems) return [];

		if (stack.search && searchBaseItems.value) {
			const searchBase =
				searchBaseItems.value.length > 0 ? searchBaseItems.value : stack.baselineItems;

			return searchNodes(stack.search || '', searchBase);
		}
		return stack.baselineItems;
	});

	const activeViewStack = computed<ViewStack>(() => {
		const stack = viewStacks.value[viewStacks.value.length - 1];

		if (!stack) return {};

		return {
			...stack,
			items: extendItemsWithUUID(activeStackItems.value),
			hasSearch: (stack.baselineItems || []).length > 3 || stack?.hasSearch,
		};
	});

	const activeViewStackMode = computed(() => activeViewStack.value.mode || 'trigger');

	const searchBaseItems = computed<INodeCreateElement[]>(() => {
		const stack = viewStacks.value[viewStacks.value.length - 1];

		if (!stack || !stack.searchItems) return [];

		return stack.searchItems.map((item) => transformNodeType(item, stack.subcategory));
	});

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
		const subcategorizedItems = subcategorizeItems(nodeCreatorStore.mergedNodes);
		let stackItems = stack?.items ?? subcategorizedItems[stack?.subcategory ?? '*'] ?? [];

		if (!stack || !activeViewStack.value.uuid) return;

		// Adds the nodes specified in `stack.forceIncludeNodes` to the `stackItems` array.
		// This is done to ensure that the nodes specified in `stack.forceIncludeNodes` are always included,
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
		if (!isRootView.value) {
			sortNodeCreateElements(stackItems);
		}

		updateViewStack(activeViewStack.value.uuid, { baselineItems: stackItems });
	}
	function extendItemsWithUUID(items: INodeCreateElement[]) {
		return items.map((item) => ({
			...item,
			uuid: `${item.key}-${uuid()}`,
		}));
	}
	function pushViewStack(stack: Partial<ViewStack>) {
		if(activeViewStack.value.uuid) {
			updateViewStack(activeViewStack.value.uuid, { activeIndex: getActiveItemIndex() });
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
			updateViewStack(activeViewStack.value.uuid, { transitionDirection: 'out' });
			viewStacks.value.pop();
		}
	}

	function updateViewStack(uuid: string, stack: Partial<ViewStack>) {
		const matchedIndex = viewStacks.value.findIndex((s) => s.uuid === uuid);
		const matchedStack = viewStacks.value[matchedIndex];

		// For each key in the stack, update the matched stack
		Object.keys(stack).forEach((key) => {
			const typedKey = key as keyof ViewStack;
			set(matchedStack, typedKey, stack[typedKey]);
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
		isRootView,
		resetViewStacks,
		updateViewStack,
		pushViewStack,
		popViewStack,
	};
});
