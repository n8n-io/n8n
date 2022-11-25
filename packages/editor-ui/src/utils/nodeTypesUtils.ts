import {
	CORE_NODES_CATEGORY,
	CUSTOM_NODES_CATEGORY,
	SUBCATEGORY_DESCRIPTIONS,
	UNCATEGORIZED_CATEGORY,
	UNCATEGORIZED_SUBCATEGORY,
	PERSONALIZED_CATEGORY,
	NON_ACTIVATABLE_TRIGGER_NODE_TYPES,
	TEMPLATES_NODES_FILTER,
	REGULAR_NODE_FILTER,
	TRIGGER_NODE_FILTER,
	ALL_NODE_FILTER,
	MAPPING_PARAMS,
} from '@/constants';
import { INodeCreateElement, ICategoriesWithNodes, INodeUi, ITemplatesNode, INodeItemProps } from '@/Interface';
import { IDataObject, INodeExecutionData, INodeProperties, INodeTypeDescription, NodeParameterValueType } from 'n8n-workflow';
import { isResourceLocatorValue, isJsonKeyObject } from '@/utils';

/*
	Constants and utility functions mainly used to get information about
	or manipulate node types and nodes.
*/

const CRED_KEYWORDS_TO_FILTER = ['API', 'OAuth1', 'OAuth2'];
const NODE_KEYWORDS_TO_FILTER = ['Trigger'];
const COMMUNITY_PACKAGE_NAME_REGEX = /(@\w+\/)?n8n-nodes-(?!base\b)\b\w+/g;

const addNodeToCategory = (accu: ICategoriesWithNodes, nodeType: INodeTypeDescription, category: string, subcategory: string) => {
	if (!accu[category]) {
		accu[category] = {};
	}
	if (!accu[category][subcategory]) {
		accu[category][subcategory] = {
			triggerCount: 0,
			regularCount: 0,
			nodes: [],
		};
	}
	const isTrigger = nodeType.group.includes('trigger');
	if (isTrigger) {
		accu[category][subcategory].triggerCount++;
	}
	if (!isTrigger) {
		accu[category][subcategory].regularCount++;
	}
	accu[category][subcategory].nodes.push({
		type: 'node',
		key: `${category}_${nodeType.name}`,
		category,
		properties: {
			nodeType,
			subcategory,
		},
		includedByTrigger: isTrigger,
		includedByRegular: !isTrigger,
	});
};

export const getCategoriesWithNodes = (nodeTypes: INodeTypeDescription[], personalizedNodeTypes: string[]): ICategoriesWithNodes => {
	const sorted = [...nodeTypes].sort((a: INodeTypeDescription, b: INodeTypeDescription) => a.displayName > b.displayName? 1 : -1);
	return sorted.reduce(
		(accu: ICategoriesWithNodes, nodeType: INodeTypeDescription) => {
			if (personalizedNodeTypes.includes(nodeType.name)) {
				addNodeToCategory(accu, nodeType, PERSONALIZED_CATEGORY, UNCATEGORIZED_SUBCATEGORY);
			}

			if (!nodeType.codex || !nodeType.codex.categories) {
				addNodeToCategory(accu, nodeType, UNCATEGORIZED_CATEGORY, UNCATEGORIZED_SUBCATEGORY);
				return accu;
			}

			nodeType.codex.categories.forEach((_category: string) => {
				const category = _category.trim();
				const subcategories =
					nodeType.codex &&
					nodeType.codex.subcategories &&
					nodeType.codex.subcategories[category]
					? nodeType.codex.subcategories[category]
					: null;

				if(subcategories === null || subcategories.length === 0) {
					addNodeToCategory(accu, nodeType, category, UNCATEGORIZED_SUBCATEGORY);
					return;
				}

				subcategories.forEach(subcategory => {
					addNodeToCategory(accu, nodeType, category, subcategory);
				});

			});
			return accu;
		},
		{},
	);
};

const getCategories = (categoriesWithNodes: ICategoriesWithNodes): string[] => {
	const excludeFromSort = [CORE_NODES_CATEGORY, CUSTOM_NODES_CATEGORY, UNCATEGORIZED_CATEGORY, PERSONALIZED_CATEGORY];
	const categories = Object.keys(categoriesWithNodes);
	const sorted = categories.filter(
		(category: string) =>
			!excludeFromSort.includes(category),
	);
	sorted.sort();

	return [CORE_NODES_CATEGORY, CUSTOM_NODES_CATEGORY, PERSONALIZED_CATEGORY, ...sorted, UNCATEGORIZED_CATEGORY];
};

export const getCategorizedList = (categoriesWithNodes: ICategoriesWithNodes): INodeCreateElement[] => {
	const categories = getCategories(categoriesWithNodes);

	return categories.reduce(
		(accu: INodeCreateElement[], category: string) => {
			if (!categoriesWithNodes[category]) {
				return accu;
			}

			const categoryEl: INodeCreateElement = {
				type: 'category',
				key: category,
				category,
				properties: {
					expanded: false,
				},
			};

			const subcategories = Object.keys(categoriesWithNodes[category]);
			if (subcategories.length === 1) {
				const subcategory = categoriesWithNodes[category][
					subcategories[0]
				];
				if (subcategory.triggerCount > 0) {
					categoryEl.includedByTrigger = subcategory.triggerCount > 0;
				}
				if (subcategory.regularCount > 0) {
					categoryEl.includedByRegular = subcategory.regularCount > 0;
				}
				return [...accu, categoryEl, ...subcategory.nodes];
			}

			subcategories.sort();
			const subcategorized = subcategories.reduce(
				(accu: INodeCreateElement[], subcategory: string) => {
					const subcategoryEl: INodeCreateElement = {
						type: 'subcategory',
						key: `${category}_${subcategory}`,
						category,
						properties: {
							subcategory,
							description: SUBCATEGORY_DESCRIPTIONS[category][subcategory],
						},
						includedByTrigger: categoriesWithNodes[category][subcategory].triggerCount > 0,
						includedByRegular: categoriesWithNodes[category][subcategory].regularCount > 0,
					};

					if (subcategoryEl.includedByTrigger) {
						categoryEl.includedByTrigger = true;
					}
					if (subcategoryEl.includedByRegular) {
						categoryEl.includedByRegular = true;
					}

					accu.push(subcategoryEl);
					return accu;
				},
				[],
			);

			return [...accu, categoryEl, ...subcategorized];
		},
		[],
	);
};

export function getAppNameFromCredType(name: string) {
	return name.split(' ').filter((word) => !CRED_KEYWORDS_TO_FILTER.includes(word)).join(' ');
}

export function getAppNameFromNodeName(name: string) {
	return name.split(' ').filter((word) => !NODE_KEYWORDS_TO_FILTER.includes(word)).join(' ');
}


export function getTriggerNodeServiceName(nodeType: INodeTypeDescription): string {
	return nodeType.displayName.replace(/ trigger/i, '');
}

export function getActivatableTriggerNodes(nodes: INodeUi[]) {
	return nodes.filter((node: INodeUi) => !node.disabled && !NON_ACTIVATABLE_TRIGGER_NODE_TYPES.includes(node.type));
}

export function filterTemplateNodes(nodes: ITemplatesNode[]) {
	const notCoreNodes = nodes.filter((node: ITemplatesNode) => {
		return !(node.categories || []).some(
			(category) => category.name === CORE_NODES_CATEGORY,
		);
	});

	const results = notCoreNodes.length > 0 ? notCoreNodes : nodes;
	return results.filter((elem) => !TEMPLATES_NODES_FILTER.includes(elem.name));
}

export function isCommunityPackageName(packageName: string): boolean {
	COMMUNITY_PACKAGE_NAME_REGEX.lastIndex = 0;
	// Community packages names start with <@username/>n8n-nodes- not followed by word 'base'
	const nameMatch = COMMUNITY_PACKAGE_NAME_REGEX.exec(packageName);

	return !!nameMatch;
}

export function hasExpressionMapping(value: unknown) {
	return typeof value === 'string' && !!MAPPING_PARAMS.find((param) => value.includes(param));
}

export function isValueExpression (parameter: INodeProperties, paramValue: NodeParameterValueType): boolean {
	if (parameter.noDataExpression === true) {
		return false;
	}
	if (typeof paramValue === 'string' && paramValue.charAt(0) === '=') {
		return true;
	}
	if (isResourceLocatorValue(paramValue) && paramValue.value && paramValue.value.toString().charAt(0) === '=') {
		return true;
	}
	return false;
}

export const executionDataToJson = (inputData: INodeExecutionData[]): IDataObject[] => inputData.reduce<IDataObject[]>(
	(acc, item) => isJsonKeyObject(item) ? acc.concat(item.json) : acc,
	[],
);

export const matchesSelectType = (el: INodeCreateElement, selectedType: string) => {
	if (selectedType === REGULAR_NODE_FILTER && el.includedByRegular) {
		return true;
	}
	if (selectedType === TRIGGER_NODE_FILTER && el.includedByTrigger) {
		return true;
	}

	return selectedType === ALL_NODE_FILTER;
};

const matchesAlias = (nodeType: INodeTypeDescription, filter: string): boolean => {
	if (!nodeType.codex || !nodeType.codex.alias) {
		return false;
	}

	return nodeType.codex.alias.reduce((accu: boolean, alias: string) => {
		return accu || alias.toLowerCase().indexOf(filter) > -1;
	}, false);
};

export const matchesNodeType = (el: INodeCreateElement, filter: string) => {
	const nodeType = (el.properties as INodeItemProps).nodeType;

	return nodeType.displayName.toLowerCase().indexOf(filter) !== -1 || matchesAlias(nodeType, filter);
};

export const hasOnlyListMode = (parameter: INodeProperties) : boolean => {
	return parameter.modes !== undefined && parameter.modes.length === 1 && parameter.modes[0].name === 'list';
};
