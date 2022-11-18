import xss, { friendlyAttrValue } from 'xss';

import { CORE_NODES_CATEGORY, MAIN_HEADER_TABS, MAPPING_PARAMS, TEMPLATES_NODES_FILTER, VIEWS, NON_ACTIVATABLE_TRIGGER_NODE_TYPES } from '@/constants';
import { INodeUi, ITemplatesNode } from '@/Interface';
import { isResourceLocatorValue } from '@/utils';
import dateformat from 'dateformat';
import {IDataObject, INodeProperties, INodeTypeDescription, NodeParameterValueType,INodeExecutionData, jsonParse} from 'n8n-workflow';
import { Route } from 'vue-router';

import { REGULAR_NODE_FILTER, TRIGGER_NODE_FILTER, ALL_NODE_FILTER  } from '@/constants';
import { INodeCreateElement, INodeItemProps } from '@/Interface';

const CRED_KEYWORDS_TO_FILTER = ['API', 'OAuth1', 'OAuth2'];
const NODE_KEYWORDS_TO_FILTER = ['Trigger'];
const SI_SYMBOL = ['', 'k', 'M', 'G', 'T', 'P', 'E'];

const COMMUNITY_PACKAGE_NAME_REGEX = /(@\w+\/)?n8n-nodes-(?!base\b)\b\w+/g;

export const omit = (keyToOmit: string, { [keyToOmit]: _, ...remainder }) => remainder;

export function isObjectLiteral(maybeObject: unknown): maybeObject is { [key: string]: string } {
	return typeof maybeObject === 'object' && maybeObject !== null && !Array.isArray(maybeObject);
}

export function isJsonKeyObject(item: unknown): item is {
	json: unknown;
	[otherKeys: string]: unknown;
} {
	if (!isObjectLiteral(item)) return false;

	return Object.keys(item).includes('json');
}

export function sanitizeHtml(dirtyHtml: string) {
	const allowedAttributes = ['href','name', 'target', 'title', 'class', 'id'];
	const allowedTags = ['p', 'strong', 'b', 'code', 'a', 'br', 'i', 'em', 'small' ];

	const sanitizedHtml = xss(dirtyHtml, {
		onTagAttr: (tag, name, value) => {
			if (tag === 'img' && name === 'src') {
				// Only allow http requests to supported image files from the `static` directory
				const isImageFile = value.split('#')[0].match(/\.(jpeg|jpg|gif|png|webp)$/) !== null;
				const isStaticImageFile = isImageFile && value.startsWith('/static/');
				if (!value.startsWith('https://') && !isStaticImageFile) {
					return '';
				}
			}

			// Allow `allowedAttributes` and all `data-*` attributes
			if(allowedAttributes.includes(name) || name.startsWith('data-')) return `${name}="${friendlyAttrValue(value)}"`;

			return;
			// Return nothing, means keep the default handling measure
		},
		onTag: (tag) => {
			if(!allowedTags.includes(tag)) return '';
			return;
		},
	});

	return sanitizedHtml;
}

export const isEmpty = (value?: unknown): boolean => {
	if (!value && value !== 0) return true;
	if(Array.isArray(value)){
		if(!value.length) return true;
		return value.every(isEmpty);
	}
	if (typeof value === 'object') {
		return Object.values(value).every(isEmpty);
	}
	return false;
};

export const intersection = <T>(...arrays: T[][]): T[] => {
	const [a, b, ...rest] = arrays;
	const ab = a.filter(v => b.includes(v));
	return [...new Set(rest.length ? intersection(ab, ...rest) : ab)];
};


// helpers.ts ---------------------------------------------------------------------------------------------------
export function abbreviateNumber(num: number) {
	const tier = (Math.log10(Math.abs(num)) / 3) | 0;

	if (tier === 0) return num;

	const suffix = SI_SYMBOL[tier];
	const scale = Math.pow(10, tier * 3);
	const scaled = num / scale;

	return Number(scaled.toFixed(1)) + suffix;
}

export function convertToDisplayDate (epochTime: number) {
	return dateformat(epochTime, 'yyyy-mm-dd HH:MM:ss');
}

export function convertToHumanReadableDate (epochTime: number) {
	return dateformat(epochTime, 'd mmmm, yyyy @ HH:MM Z');
}

export function getAppNameFromCredType(name: string) {
	return name.split(' ').filter((word) => !CRED_KEYWORDS_TO_FILTER.includes(word)).join(' ');
}

export function getAppNameFromNodeName(name: string) {
	return name.split(' ').filter((word) => !NODE_KEYWORDS_TO_FILTER.includes(word)).join(' ');
}

export function getStyleTokenValue(name: string): string {
	const style = getComputedStyle(document.body);
	return style.getPropertyValue(name);
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

export function setPageTitle(title: string) {
	window.document.title = title;
}

export function isString(value: unknown): value is string {
	return typeof value === 'string';
}

export function isStringNumber(value: unknown): value is string {
	return !isNaN(Number(value));
}

export function isNumber(value: unknown): value is number {
	return typeof value === 'number';
}

export function stringSizeInBytes(input: string | IDataObject | IDataObject[] | undefined): number {
	if (input === undefined) return 0;

	return new Blob([typeof input === 'string' ? input : JSON.stringify(input)]).size;
}

export function isCommunityPackageName(packageName: string): boolean {
	COMMUNITY_PACKAGE_NAME_REGEX.lastIndex = 0;
	// Community packages names start with <@username/>n8n-nodes- not followed by word 'base'
	const nameMatch = COMMUNITY_PACKAGE_NAME_REGEX.exec(packageName);

	return !!nameMatch;
}

export function shorten(s: string, limit: number, keep: number) {
	if (s.length <= limit) {
		return s;
	}

	const first = s.slice(0, limit - keep);
	const last = s.slice(s.length - keep, s.length);

	return `${first}...${last}`;
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

export function convertRemToPixels(rem: string) {
	return parseInt(rem, 10) * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

export const executionDataToJson = (inputData: INodeExecutionData[]): IDataObject[] => inputData.reduce<IDataObject[]>(
	(acc, item) => isJsonKeyObject(item) ? acc.concat(item.json) : acc,
	[],
);

export const convertPath = (path: string): string => {
	// TODO: That can for sure be done fancier but for now it works
	const placeholder = '*___~#^#~___*';
	let inBrackets = path.match(/\[(.*?)]/g);

	if (inBrackets === null) {
		inBrackets = [];
	} else {
		inBrackets = inBrackets.map(item => item.slice(1, -1)).map(item => {
			if (item.startsWith('"') && item.endsWith('"')) {
				return item.slice(1, -1);
			}
			return item;
		});
	}
	const withoutBrackets = path.replace(/\[(.*?)]/g, placeholder);
	const pathParts = withoutBrackets.split('.');
	const allParts = [] as string[];
	pathParts.forEach(part => {
		let index = part.indexOf(placeholder);
		while(index !== -1) {
			if (index === 0) {
				allParts.push(inBrackets!.shift() as string);
				part = part.substr(placeholder.length);
			} else {
				allParts.push(part.substr(0, index));
				part = part.substr(index);
			}
			index = part.indexOf(placeholder);
		}
		if (part !== '') {
			allParts.push(part);
		}
	});

	return '["' + allParts.join('"]["') + '"]';
};

export const clearJsonKey = (userInput: string | object) => {
	const parsedUserInput = typeof userInput === 'string' ? jsonParse(userInput) : userInput;

	if (!Array.isArray(parsedUserInput)) return parsedUserInput;

	return parsedUserInput.map(item => isJsonKeyObject(item) ? item.json : item);
};

export const getNodeViewTab = (route: Route): string|null => {
		const routeMeta = route.meta;
		if (routeMeta && routeMeta.nodeView === true) {
			return MAIN_HEADER_TABS.WORKFLOW;
		} else {
			const executionTabRoutes = [
				VIEWS.EXECUTION.toString(),
				VIEWS.EXECUTION_PREVIEW.toString(),
				VIEWS.EXECUTION_HOME.toString(),
			];

			if (executionTabRoutes.includes(route.name || '')) {
				return MAIN_HEADER_TABS.EXECUTIONS;
			}
		}
		return null;
};

// nodeCreator/helpers.ts --------------------------------------------------------------------------------------------------------
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

// mixins/helpers.ts -----------------------------------------------------------------------------------------------------------
export function isChildOf(parent: Element, child: Element): boolean {
	if (child.parentElement === null) {
		return false;
	}
	if (child.parentElement === parent) {
		return true;
	}

	return isChildOf(parent, child.parentElement);
}

// resourceLocator/helpers.ts ------------------------------------------------------------------------------------
export const hasOnlyListMode = (parameter: INodeProperties) : boolean => {
	return parameter.modes !== undefined && parameter.modes.length === 1 && parameter.modes[0].name === 'list';
};
