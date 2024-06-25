import type { INodeProperties } from 'n8n-workflow';

export const schemaTypeField: INodeProperties = {
	displayName: 'Schema Type',
	name: 'schemaType',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Generate From JSON Example',
			value: 'fromJson',
			description: 'Generate a schema from an example JSON object',
		},
		{
			name: 'Define Below',
			value: 'manual',
			description: 'Define the JSON schema manually',
		},
	],
	default: 'fromJson',
	description: 'How to specify the schema for the function',
};

export const jsonSchemaExampleField: INodeProperties = {
	displayName: 'JSON Example',
	name: 'jsonSchemaExample',
	type: 'json',
	default: `{
	"some_input": "some_value"
}`,
	noDataExpression: true,
	typeOptions: {
		rows: 10,
	},
	displayOptions: {
		show: {
			schemaType: ['fromJson'],
		},
	},
	description: 'Example JSON object to use to generate the schema',
};

export const inputSchemaField: INodeProperties = {
	displayName: 'Input Schema',
	name: 'inputSchema',
	type: 'json',
	default: `{
"type": "object",
"properties": {
	"some_input": {
		"type": "string",
		"description": "Some input to the function"
		}
	}
}`,
	noDataExpression: true,
	typeOptions: {
		rows: 10,
	},
	displayOptions: {
		show: {
			schemaType: ['manual'],
		},
	},
	description: 'Schema to use for the function',
};

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
