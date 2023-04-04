import { getCurrentInstance, computed, ref, ComputedRef, nextTick } from 'vue';
import { CORE_NODES_CATEGORY } from '@/constants';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { v4 as uuid } from 'uuid';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { INodeCreateElement, SubcategorizedNodeTypes } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';

interface ViewStack {
	title?: string;
	subtitle?: string;
	search?: string;
	subcategory?: string;
	uuid?: string;
	hasHeaderBg?: boolean;
	transitionDirection?: 'in' | 'out';
	hasSearch?: boolean;
	items?: INodeCreateElement[];
	forceIncludeNodes?: string[];
	mode?: 'regular' | 'trigger';
	baseFilter?: (item: INodeCreateElement) => boolean;
	itemsMapper?: (item: INodeCreateElement) => INodeCreateElement;
}

export const useViewStacks = () => {
	const nodeTypesStore = useNodeTypesStore();
	const nodeCreatorStore = useNodeCreatorStore();
	const stacks = ref<ViewStack[]>([]);

	const viewStacks = computed<ViewStack[]>(() => stacks.value);

	const isRootView = computed(() => stacks.value.length === 1);

	const activeStackItems = computed<INodeCreateElement[]>(() => {
		const stack = stacks.value[stacks.value.length - 1];
		let stackItems = stack?.items ?? subcategorizedItems.value[stack?.subcategory ?? '*'] ?? [];

		// Adds the nodes specified in `stack.forceIncludeNodes` to the `stackItems` array.
		// This is done to ensure that the nodes specified in `stack.forceIncludeNodes` are always included,
		// regardless of whether the subcategory is matched
		if ((stack.forceIncludeNodes ?? []).length > 0) {
			const matchedNodes = nodeCreatorStore.mergedAppNodes
				.filter((item) => stack.forceIncludeNodes?.includes(item.name))
				.map((item) => transformNode(item, stack.subcategory));

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
			stackItems.sort((a, b) => {
				if (a.type !== 'node' || b.type !== 'node') return -1;
				const displayNameA = a.properties.displayName.toLowerCase();
				const displayNameB = b.properties.displayName.toLowerCase();

				return displayNameA.localeCompare(displayNameB, undefined, { sensitivity: 'base' });
			});
		}
		return stackItems;
	});

	const activeViewStack = computed<ViewStack>(() => {
		const stack = stacks.value[stacks.value.length - 1];

		return {
			...stack,
			items: activeStackItems.value,
			hasSearch: activeStackItems.value.length > 8 || stack?.hasSearch,
		};
	});

	const subcategorizedItems = computed(() => {
		return subcategorizeItems(nodeCreatorStore.mergedAppNodes);
	});

	function transformNode(node: INodeTypeDescription, subcategory?: string): INodeCreateElement {
		return {
			key: node.name,
			properties: node,
			subcategory: subcategory ?? node.codex?.subcategories?.[CORE_NODES_CATEGORY]?.[0] ?? '*',
			category: '',
			type: 'node',
		};
	}

	function subcategorizeItems(items: INodeTypeDescription[]) {
		return items.reduce((acc: SubcategorizedNodeTypes, item) => {
			// Only Core Nodes subcategories are valid, others are uncategorized
			const isCoreNodesCategory = item.codex?.categories?.includes(CORE_NODES_CATEGORY);
			const subcategories = isCoreNodesCategory
				? item?.codex?.subcategories?.[CORE_NODES_CATEGORY] ?? []
				: ['*'];

			subcategories.forEach((subcategory: string) => {
				if (!acc[subcategory]) {
					acc[subcategory] = [];
				}
				acc[subcategory].push(transformNode(item, subcategory));
			});

			return acc;
		}, {});
	}

	function pushViewStack(stack: ViewStack) {
		stacks.value.push({
			...stack,
			uuid: uuid(),
			transitionDirection: 'in',
		});
	}

	function popViewStack() {
		if (activeViewStack.value.uuid) {
			updateViewStack(activeViewStack.value.uuid, { transitionDirection: 'out' });
			nextTick(() => stacks.value.pop());
		}
	}

	function updateViewStack(uuid: string, stack: ViewStack) {
		const matchedStack = stacks.value.find((s) => s.uuid === uuid);
		if (matchedStack) {
			Object.assign(matchedStack, stack);
		}
	}

	return {
		viewStacks,
		activeViewStack,
		pushViewStack,
		popViewStack,
		updateViewStack,
	};
};
