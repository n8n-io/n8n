import type { INodeProperties } from 'n8n-workflow';

export const sessionIdOption: INodeProperties = {
	displayName: 'Session ID',
	name: 'sessionIdType',
	type: 'options',
	options: [
		{
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			name: 'Take from previous node automatically',
			value: 'fromInput',
			description: 'Looks for an input field called sessionId',
		},
		{
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			name: 'Define below',
			value: 'customKey',
			description: 'Use an expression to reference data in previous nodes or enter static text',
		},
	],
	default: 'fromInput',
};

export const expressionSessionKeyProperty = (fromVersion: number): INodeProperties => ({
	displayName: 'Session Key From Previous Node',
	name: 'sessionKey',
	type: 'string',
	default: '={{ $json.sessionId }}',
	disabledOptions: { show: { sessionIdType: ['fromInput'] } },
	displayOptions: {
		show: {
			sessionIdType: ['fromInput'],
			'@version': [{ _cnd: { gte: fromVersion } }],
		},
	},
});

export const sessionKeyProperty: INodeProperties = {
	displayName: 'Key',
	name: 'sessionKey',
	type: 'string',
	default: '',
	description: 'The key to use to store session ID in the memory',
	displayOptions: {
		show: {
			sessionIdType: ['customKey'],
		},
	},
};

export const contextWindowLengthProperty: INodeProperties = {
	displayName: 'Context Window Length',
	name: 'contextWindowLength',
	type: 'number',
	default: 5,
	hint: 'How many past interactions the model receives as context',
};
