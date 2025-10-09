import type {
	ActionTypeDescription,
	INodeCreateElement,
	NodeCreateElement,
	NodeFilterType,
	SimplifiedNodeType,
} from '@/Interface';
import {
	AI_CATEGORY_MCP_NODES,
	AI_CATEGORY_ROOT_NODES,
	AI_CATEGORY_TOOLS,
	AI_CATEGORY_VECTOR_STORES,
	AI_CODE_NODE_TYPE,
	AI_NODE_CREATOR_VIEW,
	AI_OTHERS_NODE_CREATOR_VIEW,
	AI_SUBCATEGORY,
	DEFAULT_SUBCATEGORY,
	TRIGGER_NODE_CREATOR_VIEW,
} from '@/constants';
import { defineStore } from 'pinia';
import { v4 as uuid } from 'uuid';
import { computed, nextTick, ref } from 'vue';
import difference from 'lodash/difference';

import { useNodeCreatorStore } from '@/stores/nodeCreator.store';

import {
	extendItemsWithUUID,
	flattenCreateElements,
	groupItemsInSections,
	isAINode,
	searchNodes,
	sortNodeCreateElements,
	subcategorizeItems,
	transformNodeType,
} from '../utils';

import type { NodeViewItem, NodeViewItemSection } from '@/components/Node/NodeCreator/viewsData';
import { AINodesView } from '@/components/Node/NodeCreator/viewsData';
import { useI18n } from '@n8n/i18n';
import { useKeyboardNavigation } from './useKeyboardNavigation';

import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { AI_TRANSFORM_NODE_TYPE } from 'n8n-workflow';
import type { NodeConnectionType, INodeInputFilter } from 'n8n-workflow';
import { useCanvasStore } from '@/stores/canvas.store';
import { useSettingsStore } from '@/stores/settings.store';

export type CommunityNodeDetails = {
	key: string;
	title: string;
	description: string;
	packageName: string;
	installed: boolean;
	official: boolean;
	companyName?: string;
	nodeIcon?: NodeIconSource;
};

import { useUIStore } from '@/stores/ui.store';
import { type NodeIconSource } from '@/utils/nodeIcon';
import { getThemedValue } from '@/utils/nodeTypesUtils';

import nodePopularity from 'virtual:node-popularity-data';

export interface ViewStack {
	uuid?: string;
	title?: string;
	subtitle?: string;
	search?: string;
	subcategory?: string;
	info?: string;
	nodeIcon?: NodeIconSource;
	rootView?: NodeFilterType;
	activeIndex?: number;
	transitionDirection?: 'in' | 'out' | 'none';
	hasSearch?: boolean;
	preventBack?: boolean;
	items?: INodeCreateElement[];
	baselineItems?: INodeCreateElement[];
	searchItems?: SimplifiedNodeType[];
	forceIncludeNodes?: string[];
	mode?: 'actions' | 'nodes' | 'community-node';
	hideActions?: boolean;
	baseFilter?: (item: INodeCreateElement) => boolean;
	itemsMapper?: (item: INodeCreateElement) => INodeCreateElement;
	actionsFilter?: (items: ActionTypeDescription[]) => ActionTypeDescription[];
	panelClass?: string;
	sections?: string[] | NodeViewItemSection[];
	communityNodeDetails?: CommunityNodeDetails;
}

const nodePopularityMap = Object.values(nodePopularity).reduce((acc, node) => {
	return {
		...acc,
		[node.id]: node.popularity * 100, // Scale the popularity score
	};
}, {});

export const useViewStacks = defineStore('nodeCreatorViewStacks', () => {
	const nodeCreatorStore = useNodeCreatorStore();
	const { getActiveItemIndex } = useKeyboardNavigation();
	const i18n = useI18n();
	const settingsStore = useSettingsStore();

	const viewStacks = ref<ViewStack[]>([]);

	const activeStackItems = computed<INodeCreateElement[]>(() => {
		const stack = getLastActiveStack();

		if (!stack?.baselineItems) {
			return stack.items ? extendItemsWithUUID(stack.items) : [];
		}

		if (stack.search && searchBaseItems.value) {
			let searchBase: INodeCreateElement[] = searchBaseItems.value;
			const canvasHasAINodes = useCanvasStore().aiNodes.length > 0;

			if (searchBaseItems.value.length === 0) {
				searchBase = flattenCreateElements(stack.baselineItems ?? []);
			}

			if (
				// Filter-out AI sub-nodes if canvas has no AI nodes and the root view is not AI
				!(isAiRootView(stack) || canvasHasAINodes) ||
				// or if the source is a plus endpoint or a node connection drop and the root view is not AI subcategory
				(['plus_endpoint', 'node_connection_drop'].includes(nodeCreatorStore.openSource) &&
					!isAiSubcategoryView(stack))
			) {
				searchBase = filterOutAiNodes(searchBase);
			}

			const searchResults = extendItemsWithUUID(
				searchNodes(stack.search || '', searchBase, {
					popularity: nodePopularityMap,
				}),
			);

			const groupedNodes = groupIfAiNodes(searchResults, stack.title, false) ?? searchResults;
			// Set the active index to the second item if there's a section
			// as the first item is collapsable
			stack.activeIndex = groupedNodes.some((node) => node.type === 'section') ? 1 : 0;

			return groupedNodes;
		}
		return extendItemsWithUUID(groupIfAiNodes(stack.baselineItems, stack.title, true));
	});

	const activeViewStack = computed<ViewStack>(() => {
		const stack = getLastActiveStack();
		if (!stack) return {};

		const flatBaselineItems = flattenCreateElements(stack.baselineItems ?? []);

		return {
			...stack,
			items: activeStackItems.value,
			hasSearch: flatBaselineItems.length > 8 || stack?.hasSearch,
		};
	});

	const activeViewStackMode = computed(
		() => activeViewStack.value.mode ?? TRIGGER_NODE_CREATOR_VIEW,
	);

	const searchBaseItems = computed<INodeCreateElement[]>(() => {
		const stack = getLastActiveStack();
		if (!stack?.searchItems) return [];

		return stack.searchItems.map((item) => transformNodeType(item, stack.subcategory));
	});

	function isAiSubcategoryView(stack: ViewStack) {
		return stack.rootView === AI_OTHERS_NODE_CREATOR_VIEW;
	}

	function getLastActiveStack() {
		return viewStacks.value[viewStacks.value.length - 1];
	}

	function getAllNodeCreateElements() {
		return nodeCreatorStore.mergedNodes.map((item) =>
			transformNodeType(item),
		) as NodeCreateElement[];
	}

	// Generate a delta between the global search results(all nodes) and the stack search results
	const globalSearchItemsDiff = computed<INodeCreateElement[]>(() => {
		const stack = getLastActiveStack();
		if (!stack?.search || isAiSubcategoryView(stack)) return [];

		const allNodes = getAllNodeCreateElements();
		// Apply filtering for AI nodes if the current view is not the AI root view
		const filteredNodes = isAiRootView(stack) ? allNodes : filterOutAiNodes(allNodes);

		let globalSearchResult: INodeCreateElement[] = extendItemsWithUUID(
			searchNodes(stack.search || '', filteredNodes, {
				popularity: nodePopularityMap,
			}),
		);

		if (isAiRootView(stack)) {
			globalSearchResult = groupIfAiNodes(globalSearchResult, stack.title, false);
		}

		const filteredItems = globalSearchResult.filter((item) => {
			return !activeStackItems.value.find((activeItem) => {
				if (activeItem.type === 'section') {
					const matchingSectionItem = activeItem.children.some(
						(sectionItem) => sectionItem.key === item.key,
					);
					return matchingSectionItem;
				}

				return activeItem.key === item.key;
			});
		});

		// Filter out empty sections if all of their children are filtered out
		const filteredSections = filteredItems.filter((item) => {
			if (item.type === 'section') {
				const hasVisibleChildren = item.children.some((child) =>
					activeStackItems.value.some((filteredItem) => filteredItem.key === child.key),
				);

				return hasVisibleChildren;
			}

			return true;
		});

		return filteredSections;
	});

	const itemsBySubcategory = computed(() => subcategorizeItems(nodeCreatorStore.mergedNodes));

	function isAiRootView(stack: ViewStack) {
		return stack.rootView === AI_NODE_CREATOR_VIEW;
	}

	function filterAiRootNodes(items: NodeCreateElement[]) {
		return items.filter((node) => {
			if (node.type !== 'node') return false;

			const subcategories = node.properties.codex?.subcategories?.[AI_SUBCATEGORY] ?? [];
			return (
				subcategories.includes(AI_CATEGORY_ROOT_NODES) &&
				!subcategories?.includes(AI_CATEGORY_TOOLS)
			);
		});
	}

	function groupIfAiNodes(
		items: INodeCreateElement[],
		stackCategory: string | undefined,
		sortAlphabetically: boolean,
	) {
		const aiNodes = items.filter((node): node is NodeCreateElement => isAINode(node));
		const canvasHasAINodes = useCanvasStore().aiNodes.length > 0;
		const isVectorStoresCategory = stackCategory === AI_CATEGORY_VECTOR_STORES;

		if (
			aiNodes.length > 0 &&
			(canvasHasAINodes || isAiRootView(getLastActiveStack()) || isVectorStoresCategory)
		) {
			const sectionsMap = new Map<string, NodeViewItemSection>();
			const aiRootNodes = filterAiRootNodes(aiNodes);
			const aiSubNodes = difference(aiNodes, aiRootNodes);

			aiSubNodes.forEach((node) => {
				const subcategories = node.properties.codex?.subcategories ?? {};
				const section = subcategories[AI_SUBCATEGORY]?.[0];

				if (section) {
					// Don't show sub sections for Vector Stores if we're currently viewing a 'Tools' stack
					const subSection =
						section === AI_CATEGORY_VECTOR_STORES && stackCategory === AI_CATEGORY_TOOLS
							? undefined
							: subcategories[section]?.[0];

					const sectionKey = subSection ?? section;
					const currentItems = sectionsMap.get(sectionKey)?.items ?? [];
					const isSubnodesSection = !(
						subcategories[AI_SUBCATEGORY].includes(AI_CATEGORY_ROOT_NODES) ||
						subcategories[AI_SUBCATEGORY].includes(AI_CATEGORY_MCP_NODES)
					);

					let title = section;
					if (isSubnodesSection) {
						title = `${section} (${i18n.baseText('nodeCreator.subnodes')})`;
					}
					if (subSection) {
						title = subSection;
					}

					sectionsMap.set(sectionKey, {
						key: sectionKey,
						title,
						items: [...currentItems, node.key],
					});
				}
			});

			const nonAiNodes = difference(items, aiNodes);
			// Convert sectionsMap to array of sections
			const sections = Array.from(sectionsMap.values());

			return [
				...nonAiNodes,
				...aiRootNodes,
				...groupItemsInSections(aiSubNodes, sections, sortAlphabetically),
			];
		}

		return items;
	}

	function filterOutAiNodes(items: INodeCreateElement[]) {
		const filteredSearchBase = items.filter((item) => {
			if (item.type === 'node') {
				const isAICategory = item.properties.codex?.categories?.includes(AI_SUBCATEGORY) === true;

				if (!isAICategory) return true;

				const isRootNodeSubcategory =
					item.properties.codex?.subcategories?.[AI_SUBCATEGORY]?.includes(AI_CATEGORY_ROOT_NODES);

				return isRootNodeSubcategory;
			}
			return true;
		});
		return filteredSearchBase;
	}

	async function gotoCompatibleConnectionView(
		connectionType: NodeConnectionType,
		isOutput?: boolean,
		filter?: INodeInputFilter,
	) {
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

		// Only add info field if the view does not have any filters (e.g.
		let extendedInfo = {};
		if (!filter?.nodes?.length && relatedAIView?.properties.info) {
			extendedInfo = { info: relatedAIView?.properties.info };
		}

		await nextTick();

		const iconName = getThemedValue(relatedAIView?.properties.icon, useUIStore().appliedTheme);
		pushViewStack(
			{
				title: relatedAIView?.properties.title,
				...extendedInfo,
				rootView: AI_OTHERS_NODE_CREATOR_VIEW,
				mode: 'nodes',
				items: nodeCreatorStore.allNodeCreatorNodes,
				nodeIcon: iconName
					? {
							type: 'icon',
							name: iconName,
							color: relatedAIView?.properties.iconProps?.color,
						}
					: undefined,
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
					if (displayNode && filter?.excludedNodes?.length) {
						return !filter.excludedNodes.includes(i.key);
					}

					return displayNode;
				},
				itemsMapper(item) {
					return {
						...item,
						subcategory: connectionType,
					};
				},
				actionsFilter: (items: ActionTypeDescription[]) => {
					// Filter out actions that are not compatible with the connection type
					if (items.some((item) => item.outputConnectionType)) {
						return items.filter((item) => item.outputConnectionType === connectionType);
					}
					return items;
				},
				hideActions: true,
				preventBack: true,
			},
			{ resetStacks: true },
		);
	}

	function setStackBaselineItems() {
		const stack = getLastActiveStack();
		if (!stack || !activeViewStack.value.uuid) return;

		let stackItems = stack?.items ?? [];

		if (!stack?.items) {
			const subcategory = stack?.subcategory ?? DEFAULT_SUBCATEGORY;
			let itemsInSubcategory = itemsBySubcategory.value[subcategory];

			const isAskAiEnabled = settingsStore.isAskAiEnabled;
			if (!isAskAiEnabled) {
				itemsInSubcategory = itemsInSubcategory.filter(
					(item) => item.key !== AI_TRANSFORM_NODE_TYPE,
				);
			}
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

	function pushViewStack(
		stack: ViewStack,
		options: { resetStacks?: boolean; transitionDirection?: 'in' | 'out' | 'none' } = {},
	) {
		if (options.resetStacks) {
			resetViewStacks();
		}

		if (activeViewStack.value.uuid) {
			updateCurrentViewStack({ activeIndex: getActiveItemIndex() });
		}

		const newStackUuid = uuid();
		viewStacks.value.push({
			...stack,
			uuid: newStackUuid,
			transitionDirection: options.transitionDirection ?? 'in',
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
		const currentStack = getLastActiveStack();
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
		isAiSubcategoryView,
		gotoCompatibleConnectionView,
		resetViewStacks,
		updateCurrentViewStack,
		pushViewStack,
		popViewStack,
		getAllNodeCreateElements,
	};
});
