import { ERROR_TRIGGER_NODE_TYPE } from '@/constants';
import { INodeUi } from '@/Interface';
import dateformat from 'dateformat';

const KEYWORDS_TO_FILTER = ['API', 'OAuth1', 'OAuth2'];

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
