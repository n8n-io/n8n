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
	SubcategoryCreateElement,
} from '@/Interface';
import {
	AI_CATEGORY_AGENTS,
	AI_CATEGORY_HUMAN_IN_THE_LOOP,
	AI_CATEGORY_MCP_NODES,
	AI_CATEGORY_OTHER_TOOLS,
	AI_CATEGORY_ROOT_NODES,
	AI_CATEGORY_VECTOR_STORES,
	AI_SUBCATEGORY,
	AI_TRANSFORM_NODE_TYPE,
	BETA_NODES,
	CORE_NODES_CATEGORY,
	DEFAULT_SUBCATEGORY,
	DISCORD_NODE_TYPE,
	HITL_SUBCATEGORY,
	HUMAN_IN_THE_LOOP_CATEGORY,
	MICROSOFT_TEAMS_NODE_TYPE,
	RECOMMENDED_NODES,
	REGULAR_NODE_CREATOR_VIEW,
} from '@/app/constants';
import { v4 as uuidv4 } from 'uuid';

import { i18n } from '@n8n/i18n';
import { reRankSearchResults } from '@n8n/utils/search/re-rank-search-results';
import { sublimeSearch } from '@n8n/utils/search/sublime-search';
import * as changeCase from 'change-case';
import sortBy from 'lodash/sortBy';
import type { NodeViewItemSection } from './views/viewsData';

import { stripToolSuffix, useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { NodeIconSource } from '@/app/utils/nodeIcon';
import { SampleTemplates } from '@/features/workflows/templates/utils/workflowSamples';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { INodeOutputConfiguration, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';
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

// Modest on purpose: high-confidence matches on other nodes should still win.
const AI_GATEWAY_SEARCH_BOOST = 75;
const AI_GATEWAY_BOOST_MIN_QUERY_LENGTH = 3;

/**
 * 1. exact alias match (any query length): `scrape` → `scrape`
 * 2. whole-alias prefix match at 3+ chars: `scra` → `scrape`
 * 3. alias-token prefix match at 3+ chars: `pdf` → `pdf parser`
 */
export function matchesAliasForConnectBoost(query: string, aliases: string[]): boolean {
	const queryLower = query.toLowerCase();

	return aliases.some((alias) => {
		const aliasLower = alias.toLowerCase();

		if (aliasLower === queryLower) return true;

		if (queryLower.length < AI_GATEWAY_BOOST_MIN_QUERY_LENGTH) return false;

		if (aliasLower.startsWith(queryLower)) return true;

		return aliasLower.split(/\s+/).some((token) => token.startsWith(queryLower));
	});
}

/**
 * Whether the node is eligible for n8n Connect (AI Gateway)
 */
function isAiGatewayEligibleNode(nodeName: string): boolean {
	if (!useSettingsStore().isAiGatewayEnabled) return false;

	const aiGatewayStore = useAiGatewayStore();
	// Tool-variant node types carry a "Tool"/"HitlTool" suffix,
	// but the gateway config lists the base name.
	const baseName = stripToolSuffix(nodeName);
	const candidates = [
		nodeName,
		baseName,
		removePreviewToken(nodeName),
		removePreviewToken(baseName),
	];
	const supportedName = candidates.find((n) => aiGatewayStore.isNodeSupported(n));
	if (!supportedName) return false;

	return aiGatewayStore.isNodeTypeVersionSupported(
		supportedName,
		getLatestKnownVersion(supportedName),
	);
}

/**
 * Latest version we know about for a node. `getNodeVersions` only covers the
 * core map (built-in + installed community nodes); preview community nodes live
 * behind `communityNodeType`, so fall back to their description version before
 * defaulting to 1.
 */
function getLatestKnownVersion(nodeName: string): number {
	const nodeTypesStore = useNodeTypesStore();
	const versions = nodeTypesStore.getNodeVersions(nodeName);
	if (versions.length > 0) return Math.max(...versions);

	const communityVersion = nodeTypesStore.communityNodeType(nodeName)?.nodeDescription?.version;
	if (Array.isArray(communityVersion)) return Math.max(...communityVersion);
	return communityVersion ?? 1;
}

function getAiGatewaySearchBoosts(
	query: string,
	items: INodeCreateElement[],
): Record<string, number> {
	if (query === '' || !useSettingsStore().isAiGatewayEnabled) return {};

	const boosts: Record<string, number> = {};
	for (const item of items) {
		if (item.type !== 'node') continue;

		const aliases = item.properties.codex?.alias ?? [];
		if (!matchesAliasForConnectBoost(query, aliases)) continue;
		if (!isAiGatewayEligibleNode(item.properties.name)) continue;

		boosts[item.key] = AI_GATEWAY_SEARCH_BOOST;
	}
	return boosts;
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

	// Any alias-prefix match is also a fuzzy match, so scanning the results
	// (instead of all items) can never miss a boostable node.
	const aiGatewayBoost = getAiGatewaySearchBoosts(
		trimmedFilter,
		searchResults.map(({ item }) => item),
	);

	const reRankedResults = reRankSearchResults(searchResults, {
		...additionalFactors,
		aiGatewayBoost,
	});

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
		case AI_CATEGORY_MCP_NODES:
			return 'mcp';
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

/**
 * Whether the given view stack should render the "n8n Connect" section at the
 * top. Never shown while searching — search results stay a flat ranked list.
 */
export function showsAiGatewaySection(stack: ViewStack | undefined): boolean {
	if (!stack || stack.search) return false;
	return (
		// Language Models list
		stack.connectionType === NodeConnectionTypes.AiLanguageModel ||
		// Nodes panel > "Action in an app"
		(stack.rootView === REGULAR_NODE_CREATOR_VIEW && stack.subcategory === DEFAULT_SUBCATEGORY) ||
		// Tools panel > "Action in an app"
		stack.subcategory === AI_CATEGORY_OTHER_TOOLS
	);
}

/**
 * Splits AI gateway-supported nodes out of `items` into a dedicated "n8n Connect"
 * section (rendered at the top with the wallet balance in its header).
 * Returns null when there is nothing to extract.
 */
export function extractAiGatewaySection(
	items: INodeCreateElement[],
): { section: SectionCreateElement; rest: INodeCreateElement[] } | null {
	const supported: INodeCreateElement[] = [];
	const rest: INodeCreateElement[] = [];
	for (const item of items) {
		const isSupported = item.type === 'node' && isAiGatewayEligibleNode(item.properties.name);
		(isSupported ? supported : rest).push(item);
	}
	if (supported.length === 0) return null;

	return {
		section: {
			type: 'section',
			key: 'n8nConnect',
			title: i18n.baseText('nodeCreator.sectionNames.n8nConnect'),
			children: finalizeItems(sortNodeCreateElements(supported)),
			showSeparator: true,
			trailing: 'creditsBalance',
		},
		rest,
	};
}

function applyNodeTags(element: INodeCreateElement): INodeCreateElement {
	if (element.type !== 'node') return element;

	const aiSubcategories = element.properties.codex?.subcategories?.[AI_SUBCATEGORY] ?? [];
	if (
		aiSubcategories.includes(AI_CATEGORY_MCP_NODES) &&
		!aiSubcategories.includes(AI_CATEGORY_ROOT_NODES)
	) {
		element.properties.isNew = true;
	}

	if (element.properties.tag) return element;

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
	} else if (isAiGatewayEligibleNode(element.properties.name)) {
		element.properties.tag = {
			text: i18n.baseText('generic.freeCredits'),
			pill: true,
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

const hasMatchingOutput = (
	node: SimplifiedNodeType,
	connectionType: NodeConnectionType,
): boolean => {
	const outputs = node.outputs;
	if (!Array.isArray(outputs)) return false;
	return outputs.some((output: NodeConnectionType | INodeOutputConfiguration) =>
		typeof output === 'string' ? output === connectionType : output?.type === connectionType,
	);
};

export const filterAndSearchNodes = (
	mergedNodes: SimplifiedNodeType[],
	search: string,
	options: {
		isAiSubcategory?: boolean;
		isHitlSubcategory?: boolean;
		aiConnectionType?: NodeConnectionType;
	} = {},
) => {
	if (!search) return [];

	const { isAiSubcategory = false, isHitlSubcategory = false, aiConnectionType } = options;

	// HITL surfacing from community nodes is not supported yet — see
	// CommunityNodeTypesService.createAiTools which only generates `...Tool`
	// variants, never `...HitlTool` variants.
	if (isHitlSubcategory) return [];

	// AI sub-pickers (Tools, Language Model, Memory, Vector Store, …) all share
	// rootView === AI_OTHERS_NODE_CREATOR_VIEW but target different connection
	// types. Only surface community results when we know which connection type
	// the picker is scoped to, and only for nodes whose outputs match it, so
	// tool nodes don't leak into the Language Model / Memory / … pickers.
	if (isAiSubcategory) {
		if (!aiConnectionType) return [];
		const candidates = mergedNodes.filter((node) => hasMatchingOutput(node, aiConnectionType));
		const vettedNodes = candidates.map((item) => transformNodeType(item)) as NodeCreateElement[];
		return finalizeItems(searchNodes(search, vettedNodes));
	}

	const vettedNodes = mergedNodes.map((item) => transformNodeType(item)) as NodeCreateElement[];

	return finalizeItems(searchNodes(search, vettedNodes));
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

// Nodes that expose a "send and wait" operation and are grouped under the
// Human-in-the-Loop ("Human review") subcategory in the node creator.
export function getSendAndWaitNodes(nodes: SimplifiedNodeType[]) {
	return (nodes ?? [])
		.filter((node) => node.codex?.categories?.includes(HUMAN_IN_THE_LOOP_CATEGORY))
		.map((node) => node.name);
}

// Synthetic search result that mirrors the "Human review" subcategory tile shown
// in the RegularView. Selecting it navigates into the existing HITL subcategory,
// because subcategory tiles themselves are not part of the searchable node base.
export function getHumanInTheLoopCallout(nodes: SimplifiedNodeType[]): SubcategoryCreateElement {
	return {
		key: HITL_SUBCATEGORY,
		type: 'subcategory',
		properties: {
			title: HITL_SUBCATEGORY,
			icon: 'badge-check',
			sections: [
				{
					key: 'sendAndWait',
					title: i18n.baseText('nodeCreator.sectionNames.sendAndWait'),
					items: getSendAndWaitNodes(nodes),
				},
			],
		},
	};
}

export function getRootSearchCallouts(
	search: string,
	{ isRagStarterCalloutVisible = false } = {},
	nodes: SimplifiedNodeType[] = [],
) {
	const results: INodeCreateElement[] = [];
	const normalizedSearch = search.toLowerCase();

	const ragKeywords = ['rag', 'vec', 'know'];
	if (isRagStarterCalloutVisible && ragKeywords.some((x) => normalizedSearch.startsWith(x))) {
		results.push(getRagStarterCallout());
	}

	// "human in the loop" is covered by the "human" prefix.
	const hitlKeywords = ['human', 'hitl', 'approval', 'review'];
	if (hitlKeywords.some((x) => normalizedSearch.startsWith(x))) {
		results.push(getHumanInTheLoopCallout(nodes));
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
