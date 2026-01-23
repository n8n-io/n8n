import type {
	ActionCreateElement,
	ActionTypeDescription,
	INodeCreateElement,
	LinkCreateElement,
	NodeCreateElement,
	NodeFilterType,
	OpenTemplateElement,
	SectionCreateElement,
	SimplifiedNodeType,
	SubcategorizedNodeTypes,
} from '@/Interface';
import {
	AI_CATEGORY_AGENTS,
	AI_CATEGORY_HUMAN_IN_THE_LOOP,
	AI_CATEGORY_OTHER_TOOLS,
	AI_CATEGORY_VECTOR_STORES,
	AI_SUBCATEGORY,
	AI_TRANSFORM_NODE_TYPE,
	BETA_NODES,
	CORE_NODES_CATEGORY,
	DEFAULT_SUBCATEGORY,
	DISCORD_NODE_TYPE,
	HUMAN_IN_THE_LOOP_CATEGORY,
	MICROSOFT_TEAMS_NODE_TYPE,
	RECOMMENDED_NODES,
} from '@/app/constants';
import { v4 as uuidv4 } from 'uuid';

import { i18n } from '@n8n/i18n';
import { reRankSearchResults } from '@n8n/utils/search/reRankSearchResults';
import { sublimeSearch } from '@n8n/utils/search/sublimeSearch';
import * as changeCase from 'change-case';
import sortBy from 'lodash/sortBy';
import type { NodeViewItemSection } from './views/viewsData';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { NodeIconSource } from '@/app/utils/nodeIcon';
import { SampleTemplates } from '@/features/workflows/templates/utils/workflowSamples';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { SEND_AND_WAIT_OPERATION } from 'n8n-workflow';
import type { CommunityNodeDetails, ViewStack } from './composables/useViewStacks';

const COMMUNITY_NODE_TYPE_PREVIEW_TOKEN = '-preview';

export function transformNodeType(
	node: SimplifiedNodeType,
	subcategory?: string,
	type: 'node' | 'action' = 'node',
): NodeCreateElement | ActionCreateElement {
	const createElement = {
		uuid: uuidv4(),
		key: node.name,
		subcategory:
			subcategory ?? node.codex?.subcategories?.[CORE_NODES_CATEGORY]?.[0] ?? DEFAULT_SUBCATEGORY,
		properties: {
			...node,
		},
		type,
	};

	return type === 'action'
		? (createElement as ActionCreateElement)
		: (createElement as NodeCreateElement);
}

export function subcategorizeItems(items: SimplifiedNodeType[]) {
	const WHITE_LISTED_SUBCATEGORIES = [
		CORE_NODES_CATEGORY,
		AI_SUBCATEGORY,
		HUMAN_IN_THE_LOOP_CATEGORY,
	];
	return items.reduce((acc: SubcategorizedNodeTypes, item) => {
		// Only some subcategories are allowed
		let subcategories: string[] = [DEFAULT_SUBCATEGORY];

		const matchedSubcategories = WHITE_LISTED_SUBCATEGORIES.flatMap((category) => {
			if (item.codex?.categories?.includes(category)) {
				return item.codex?.subcategories?.[category] ?? [];
			}

			return [];
		});

		if (matchedSubcategories.length > 0) {
			subcategories = matchedSubcategories;
		}

		subcategories.forEach((subcategory: string) => {
			if (!acc[subcategory]) {
				acc[subcategory] = [];
			}
			acc[subcategory].push(transformNodeType(item, subcategory));
		});

		return acc;
	}, {});
}

export function sortNodeCreateElements(nodes: INodeCreateElement[]) {
	return nodes.sort((a, b) => {
		if (a.type !== 'node' || b.type !== 'node') return 0;
		const displayNameA = a.properties?.displayName?.toLowerCase() || a.key;
		const displayNameB = b.properties?.displayName?.toLowerCase() || b.key;

		return displayNameA.localeCompare(displayNameB, undefined, { sensitivity: 'base' });
	});
}

// We remove `Trigger` from e.g. `Telegram Trigger` to show it as part of the `Telegram` group,
// but still want to show matching results when the user types `Telegram Tri` or `Telegram Trigger`
// Ideally this would be handled via metadata, but that is a larger refactor.
export function removeTrailingTrigger(searchFilter: string) {
	const parts = searchFilter.split(' ');
	if (parts.length > 1 && 'trigger'.startsWith(parts.slice(-1)[0].toLowerCase())) {
		return parts
			.slice(0, -1)
			.filter((x) => x)
			.join(' ')
			.trimEnd();
	}
	return searchFilter;
}

export function searchNodes(
	searchFilter: string,
	items: INodeCreateElement[],
	additionalFactors = {},
) {
	const askAiEnabled = useSettingsStore().isAskAiEnabled;
	if (!askAiEnabled) {
		items = items.filter((item) => item.key !== AI_TRANSFORM_NODE_TYPE);
	}

	const trimmedFilter = removeTrailingTrigger(searchFilter).toLowerCase();

	// We have a snapshot of this call in sublimeSearch.test.ts to assert practical order for some cases
	// Please update the snapshots per the README next to the snapshots if you modify items significantly.
	const searchResults = sublimeSearch<INodeCreateElement>(trimmedFilter, items) || [];

	const reRankedResults = reRankSearchResults(searchResults, additionalFactors);

	return reRankedResults.map(({ item }) => item);
}

export function flattenCreateElements(items: INodeCreateElement[]): INodeCreateElement[] {
	return items.map((item) => (item.type === 'section' ? item.children : item)).flat();
}
export function isAINode(node: INodeCreateElement) {
	const isNode = node.type === 'node';
	if (!isNode) return false;

	if (node.properties.codex?.categories?.includes(AI_SUBCATEGORY)) {
		const isAgentSubcategory =
			node.properties.codex?.subcategories?.[AI_SUBCATEGORY]?.includes(AI_CATEGORY_AGENTS);

		return !isAgentSubcategory;
	}

	return false;
}

export function nodeTypesToCreateElements(
	nodeTypes: string[],
	createElements: INodeCreateElement[],
	sortAlphabetically = true,
) {
	const map = createElements.reduce((acc: Record<string, INodeCreateElement>, element) => {
		acc[element.key] = element;
		return acc;
	}, {});
	const foundElements: INodeCreateElement[] = [];
	for (const nodeType of nodeTypes) {
		const createElement = map[nodeType];
		if (createElement) {
			foundElements.push(createElement);
		}
	}
	return sortAlphabetically ? sortNodeCreateElements(foundElements) : foundElements;
}

export function mapToolSubcategoryIcon(sectionKey: string): IconName {
	switch (sectionKey) {
		case AI_CATEGORY_OTHER_TOOLS:
			return 'globe';
		case AI_CATEGORY_VECTOR_STORES:
			return 'database';
		case AI_CATEGORY_HUMAN_IN_THE_LOOP:
			return 'badge-check';
		default:
			return 'globe';
	}
}

export function groupItemsInSections(
	items: INodeCreateElement[],
	sections: string[] | NodeViewItemSection[],
	sortAlphabetically = true,
): INodeCreateElement[] {
	const filteredSections = sections.filter(
		(section): section is NodeViewItemSection => typeof section === 'object',
	);

	const itemsBySection = (items2: INodeCreateElement[]) =>
		items2.reduce((acc: Record<string, INodeCreateElement[]>, item) => {
			const section = filteredSections.find((s) => s.items.includes(item.key));

			const key = section?.key ?? 'other';
			if (key) {
				acc[key] = [...(acc[key] ?? []), item];
			}
			return acc;
		}, {});

	const mapNewSections = (
		newSections: NodeViewItemSection[],
		children: Record<string, INodeCreateElement[]>,
	) =>
		newSections.map(
			(section): SectionCreateElement => ({
				type: 'section',
				key: section.key,
				title: section.title,
				children: sortAlphabetically
					? sortNodeCreateElements(children[section.key] ?? [])
					: (children[section.key] ?? []),
			}),
		);

	const nonAINodes = items.filter((item) => !isAINode(item));
	const AINodes = items.filter((item) => isAINode(item));

	const nonAINodesBySection = itemsBySection(nonAINodes);
	const nonAINodesSections = mapNewSections(filteredSections, nonAINodesBySection);

	const AINodesBySection = itemsBySection(AINodes);

	const AINodesSections = mapNewSections(sortBy(filteredSections, ['title']), AINodesBySection);

	const result = [...nonAINodesSections, ...AINodesSections]
		.concat({
			type: 'section',
			key: 'other',
			title: i18n.baseText('nodeCreator.sectionNames.other'),
			children: sortNodeCreateElements(nonAINodesBySection.other ?? []),
		})
		.filter((section) => section.type !== 'section' || section.children.length > 0);

	result.sort((a, b) => {
		if (a.key.toLowerCase().includes('recommended')) return -1;
		if (b.key.toLowerCase().includes('recommended')) return 1;
		if (b.key === AI_CATEGORY_OTHER_TOOLS) return -1;

		return 0;
	});
	if (!shouldRenderSectionSubtitle(result)) {
		return items;
	}

	return result;
}

const shouldRenderSectionSubtitle = (sections: SectionCreateElement[]) => {
	if (!sections.length) return false;
	if (sections.length > 1) return true;
	if (sections[0].key === SEND_AND_WAIT_OPERATION) return true;

	return false;
};

export const formatTriggerActionName = (actionPropertyName: string) => {
	let name = actionPropertyName;
	if (actionPropertyName.includes('.')) {
		name = actionPropertyName.split('.').join(' ');
	}
	return changeCase.noCase(name);
};

export const removePreviewToken = (key: string) =>
	key.replace(COMMUNITY_NODE_TYPE_PREVIEW_TOKEN, '');

export const isNodePreviewKey = (key = '') => key.includes(COMMUNITY_NODE_TYPE_PREVIEW_TOKEN);

function applyNodeTags(element: INodeCreateElement): INodeCreateElement {
	if (element.type !== 'node' || element.properties.tag) return element;

	if (RECOMMENDED_NODES.includes(element.properties.name)) {
		element.properties.tag = {
			type: 'info',
			text: i18n.baseText('generic.recommended'),
		};
	} else if (BETA_NODES.includes(element.properties.name)) {
		element.properties.tag = {
			type: 'info',
			text: i18n.baseText('generic.betaProper'),
		};
	}

	return element;
}

export function finalizeItems(items: INodeCreateElement[]): INodeCreateElement[] {
	return items
		.map((item) => ({
			...item,
			uuid: `${item.key}-${uuidv4()}`,
		}))
		.map(applyNodeTags);
}

export const filterAndSearchNodes = (
	mergedNodes: SimplifiedNodeType[],
	search: string,
	isAgentSubcategory: boolean,
) => {
	if (!search || isAgentSubcategory) return [];

	const vettedNodes = mergedNodes.map((item) => transformNodeType(item)) as NodeCreateElement[];

	const searchResult: INodeCreateElement[] = finalizeItems(searchNodes(search || '', vettedNodes));

	return searchResult;
};

export function prepareCommunityNodeDetailsViewStack(
	item: NodeCreateElement,
	nodeIcon: NodeIconSource | undefined,
	rootView: NodeFilterType | undefined,
	nodeActions: ActionTypeDescription[] = [],
): ViewStack {
	const installed = !isNodePreviewKey(item.key);
	const packageName = removePreviewToken(item.key.split('.')[0]);
	const nodeTypesStore = useNodeTypesStore();
	const nodeType = nodeTypesStore.communityNodeType(removePreviewToken(item.key));

	const communityNodeDetails: CommunityNodeDetails = {
		title: item.properties.displayName,
		description: item.properties.description,
		key: item.key,
		nodeIcon,
		installed,
		official: nodeType?.isOfficialNode ?? false,
		packageName,
		companyName: nodeType?.companyName,
	};

	if (nodeActions.length) {
		const transformedActions = nodeActions?.map((a) =>
			transformNodeType(a, item.properties.displayName, 'action'),
		);

		return {
			subcategory: item.properties.displayName,
			title: i18n.baseText('nodeSettings.communityNodeDetails.title'),
			rootView,
			hasSearch: false,
			mode: 'actions',
			items: transformedActions,
			communityNodeDetails,
		};
	}

	return {
		subcategory: item.properties.displayName,
		title: i18n.baseText('nodeSettings.communityNodeDetails.title'),
		rootView,
		hasSearch: false,
		items: [item],
		mode: 'community-node',
		communityNodeDetails,
	};
}

export function getRagStarterCallout(): OpenTemplateElement {
	return {
		uuid: SampleTemplates.RagStarterTemplate,
		key: SampleTemplates.RagStarterTemplate,
		type: 'openTemplate',
		properties: {
			templateId: SampleTemplates.RagStarterTemplate,
			title: i18n.baseText('nodeCreator.ragStarterTemplate.openTemplateItem.title'),
			icon: 'database',
			description: i18n.baseText('nodeCreator.ragStarterTemplate.openTemplateItem.description'),
			tag: {
				type: 'info',
				text: i18n.baseText('generic.recommended'),
			},
		},
	};
}

export function getAiTemplatesCallout(aiTemplatesURL: string): LinkCreateElement {
	return {
		uuid: 'ai_templates_root',
		key: 'ai_templates_root',
		type: 'link',
		properties: {
			title: i18n.baseText('nodeCreator.aiPanel.linkItem.title'),
			icon: 'box-open',
			description: i18n.baseText('nodeCreator.aiPanel.linkItem.description'),
			key: 'ai_templates_root',
			url: aiTemplatesURL,
			tag: {
				type: 'info',
				text: i18n.baseText('generic.recommended'),
			},
		},
	};
}

export function getRootSearchCallouts(search: string, { isRagStarterCalloutVisible = false } = {}) {
	const results: INodeCreateElement[] = [];

	const ragKeywords = ['rag', 'vec', 'know'];
	if (isRagStarterCalloutVisible && ragKeywords.some((x) => search.toLowerCase().startsWith(x))) {
		results.push(getRagStarterCallout());
	}
	return results;
}

export const shouldShowCommunityNodeDetails = (communityNode: boolean, viewStack: ViewStack) => {
	if (viewStack.rootView === 'AI Other' && viewStack.title === 'Tools') {
		return false;
	}

	return communityNode && !viewStack.communityNodeDetails;
};

export function getHumanInTheLoopActions(nodeActions: ActionTypeDescription[]) {
	const actions = nodeActions.filter((action) => action.actionKey === SEND_AND_WAIT_OPERATION);

	if (actions.length) {
		const name = actions[0].name;
		if (name === DISCORD_NODE_TYPE) {
			actions[0].values = {
				...actions[0].values,
				resource: 'message',
				operation: SEND_AND_WAIT_OPERATION,
			};
		}
		if (name === MICROSOFT_TEAMS_NODE_TYPE) {
			actions[0].values = {
				...actions[0].values,
				resource: 'chatMessage',
				operation: SEND_AND_WAIT_OPERATION,
			};
		}
	}

	return actions;
}
