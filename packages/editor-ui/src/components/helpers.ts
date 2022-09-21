import { CORE_NODES_CATEGORY, ERROR_TRIGGER_NODE_TYPE, MAPPING_PARAMS, TEMPLATES_NODES_FILTER } from '@/constants';
import { INodeUi, ITemplatesNode } from '@/Interface';
import { isResourceLocatorValue } from '@/typeGuards';
import dateformat from 'dateformat';
import {IDataObject, INodeProperties, INodeTypeDescription, NodeParameterValueType} from 'n8n-workflow';

const CRED_KEYWORDS_TO_FILTER = ['API', 'OAuth1', 'OAuth2'];
const NODE_KEYWORDS_TO_FILTER = ['Trigger'];
const SI_SYMBOL = ['', 'k', 'M', 'G', 'T', 'P', 'E'];

const COMMUNITY_PACKAGE_NAME_REGEX = /(@\w+\/)?n8n-nodes-(?!base\b)\b\w+/g;

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
	return nodes.filter((node: INodeUi) => {
		// Error Trigger does not behave like other triggers and workflows using it can not be activated
		return !node.disabled && node.type !== ERROR_TRIGGER_NODE_TYPE;
	});
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
