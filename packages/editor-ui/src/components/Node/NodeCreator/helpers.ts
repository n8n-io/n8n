import { REGULAR_NODE_FILTER, TRIGGER_NODE_FILTER, ALL_NODE_FILTER  } from '@/constants';
import { INodeCreateElement, INodeItemProps } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';


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
