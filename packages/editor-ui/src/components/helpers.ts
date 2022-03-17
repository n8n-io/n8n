import { CORE_NODES_CATEGORY, ERROR_TRIGGER_NODE_TYPE, TEMPLATES_NODES_FILTER } from '@/constants';
import { INodeUi, ITemplatesNode } from '@/Interface';
import dateformat from 'dateformat';

const KEYWORDS_TO_FILTER = ['API', 'OAuth1', 'OAuth2'];
const SI_SYMBOL = ['', 'k', 'M', 'G', 'T', 'P', 'E'];

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
	return name.split(' ').filter((word) => !KEYWORDS_TO_FILTER.includes(word)).join(' ');
}

export function getStyleTokenValue(name: string): string {
	const style = getComputedStyle(document.body);
	return style.getPropertyValue(name);
}

export function getTriggerNodeServiceName(nodeName: string) {
	return nodeName.replace(/ trigger/i, '');
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
