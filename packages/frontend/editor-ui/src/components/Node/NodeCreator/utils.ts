import type {
	NodeCreateElement,
	ActionCreateElement,
	SubcategorizedNodeTypes,
	SimplifiedNodeType,
	INodeCreateElement,
	SectionCreateElement,
	ActionTypeDescription,
	NodeFilterType,
	OpenTemplateElement,
	LinkCreateElement,
	ViewCreateElement,
} from '@/Interface';
import {
	AI_CATEGORY_AGENTS,
	AI_CATEGORY_OTHER_TOOLS,
	AI_CATEGORY_TOOLS,
	AI_SUBCATEGORY,
	AI_TRANSFORM_NODE_TYPE,
	AI_CATEGORY_LANGUAGE_MODELS,
	AI_CATEGORY_MEMORY,
	CORE_NODES_CATEGORY,
	DEFAULT_SUBCATEGORY,
	DISCORD_NODE_TYPE,
	HUMAN_IN_THE_LOOP_CATEGORY,
	MICROSOFT_TEAMS_NODE_TYPE,
	PRE_BUILT_AGENTS_COLLECTION,
} from '@/constants';
import { v4 as uuidv4 } from 'uuid';

import { sublimeSearch } from '@n8n/utils/search/sublimeSearch';
import type { NodeViewItemSection } from './viewsData';
import { i18n } from '@n8n/i18n';
import sortBy from 'lodash/sortBy';
import * as changeCase from 'change-case';

import { useSettingsStore } from '@/stores/settings.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { SEND_AND_WAIT_OPERATION } from 'n8n-workflow';
import type { NodeIconSource } from '../../../utils/nodeIcon';
import type { CommunityNodeDetails, ViewStack } from './composables/useViewStacks';
import { PrebuiltAgentTemplates, SampleTemplates } from '@/utils/templates/workflowSamples';

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

export function searchNodes(searchFilter: string, items: INodeCreateElement[]) {
	const askAiEnabled = useSettingsStore().isAskAiEnabled;
	if (!askAiEnabled) {
		items = items.filter((item) => item.key !== AI_TRANSFORM_NODE_TYPE);
	}

	const trimmedFilter = removeTrailingTrigger(searchFilter).toLowerCase();

	// We have a snapshot of this call in sublimeSearch.test.ts to assert practical order for some cases
	// Please update the snapshots per the README next to the the snapshots if you modify items significantly.
	const result = (sublimeSearch<INodeCreateElement>(trimmedFilter, items) || []).map(
		({ item }) => item,
	);

	return result;
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

export function extendItemsWithUUID(items: INodeCreateElement[]) {
	return items.map((item) => ({
		...item,
		uuid: `${item.key}-${uuidv4()}`,
	}));
}

export const filterAndSearchNodes = (
	mergedNodes: SimplifiedNodeType[],
	search: string,
	isAgentSubcategory: boolean,
) => {
	if (!search || isAgentSubcategory) return [];

	const vettedNodes = mergedNodes.map((item) => transformNodeType(item)) as NodeCreateElement[];

	const searchResult: INodeCreateElement[] = extendItemsWithUUID(
		searchNodes(search || '', vettedNodes),
	);

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
				text: i18n.baseText('nodeCreator.triggerHelperPanel.manualTriggerTag'),
			},
		},
	};
}

// Callout without a divider
export function getPreBuiltAgentsCallout(): ViewCreateElement {
	return {
		key: PRE_BUILT_AGENTS_COLLECTION,
		type: 'view',
		properties: {
			title: i18n.baseText('nodeCreator.preBuiltAgents.title'),
			icon: 'box',
			description: i18n.baseText('nodeCreator.preBuiltAgents.description'),
			borderless: true,
			tag: {
				type: 'info',
				text: i18n.baseText('nodeCreator.triggerHelperPanel.manualTriggerTag'),
			},
		},
	};
}

// Callout with divider after it
export function getPreBuiltAgentsCalloutWithDivider(): LinkCreateElement {
	return {
		key: PRE_BUILT_AGENTS_COLLECTION,
		type: 'link',
		properties: {
			key: PRE_BUILT_AGENTS_COLLECTION,
			url: '',
			title: i18n.baseText('nodeCreator.preBuiltAgents.title'),
			icon: 'box',
			description: i18n.baseText('nodeCreator.preBuiltAgents.description'),
			tag: {
				type: 'info',
				text: i18n.baseText('nodeCreator.triggerHelperPanel.manualTriggerTag'),
			},
		},
	};
}

export function getAiTemplatesCallout(aiTemplatesURL: string): LinkCreateElement {
	return {
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
				text: i18n.baseText('nodeCreator.triggerHelperPanel.manualTriggerTag'),
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

const getTemplateLink = (
	templateId: string,
	availableTemplates: OpenTemplateElement[],
): OpenTemplateElement | undefined => {
	const templateLink = availableTemplates.find((template) => template.key === templateId);

	if (templateLink?.properties) {
		templateLink.properties.compact = true;
	}

	return templateLink;
};

export function getActiveViewCallouts(
	title: string | undefined,
	isPreBuiltAgentsCalloutVisible: boolean,
	templates: OpenTemplateElement[],
) {
	const results: INodeCreateElement[] = [];

	if (isPreBuiltAgentsCalloutVisible && title) {
		if (title === AI_CATEGORY_LANGUAGE_MODELS) {
			results.push(getPreBuiltAgentsCalloutWithDivider());
		} else if ([AI_CATEGORY_MEMORY, AI_CATEGORY_TOOLS].includes(title)) {
			results.push(getPreBuiltAgentsCallout());
		} else if (title === 'Google Calendar' || title === 'Telegram') {
			const templateLink = getTemplateLink(PrebuiltAgentTemplates.VoiceAssistantAgent, templates);
			if (templateLink) {
				results.push(templateLink);
			}
		} else if (title === 'Google Drive') {
			const templateLink = getTemplateLink(PrebuiltAgentTemplates.KnowledgeStoreAgent, templates);
			if (templateLink) {
				results.push(templateLink);
			}
		} else if (title === 'Google Sheets') {
			const templateLink = getTemplateLink(PrebuiltAgentTemplates.TaskManagementAgent, templates);
			if (templateLink) {
				results.push(templateLink);
			}
		} else if (title === 'Gmail') {
			const templateLink = getTemplateLink(PrebuiltAgentTemplates.EmailTriageAgent, templates);
			if (templateLink) {
				results.push(templateLink);
			}
		}
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
