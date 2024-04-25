import type { INodeProperties } from 'n8n-workflow';

export const promptTypeOptions: INodeProperties = {
	displayName: 'Prompt',
	name: 'promptType',
	type: 'options',
	options: [
		{
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			name: 'Take from previous node automatically',
			value: 'auto',
			description: 'Looks for an input field called chatInput',
		},
		{
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			name: 'Define below',
			value: 'define',
			description: 'Use an expression to reference data in previous nodes or enter static text',
		},
	],
	default: 'auto',
};

export const textInput: INodeProperties = {
	displayName: 'Text',
	name: 'text',
	type: 'string',
	required: true,
	default: '',
	placeholder: 'e.g. Hello, how can you help me?',
	typeOptions: {
		rows: 2,
	},
};
