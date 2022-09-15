import {
	INodeProperties,
} from 'n8n-workflow';

export const hasOnlyListMode = (parameter: INodeProperties) : boolean => {
	return parameter.modes !== undefined && parameter.modes.length === 1 && parameter.modes[0].name === 'list';
};
