/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	inputSchemaField,
	jsonSchemaExampleField,
	schemaTypeField,
} from '../../../../utils/descriptions';
import { getConnectionHintNoticeField } from '../../../../utils/sharedFields';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Call n8n Workflow Tool',
	name: 'toolWorkflow',
	group: ['transform'],
	version: [1, 1.1, 1.2, 1.3],
	description: 'Uses another n8n workflow as a tool. Allows packaging any n8n node(s) as a tool.',
	defaults: {
		name: 'Call n8n Workflow Tool',
	},
	codex: {
		categories: ['AI'],
		subcategories: {
			AI: ['Tools'],
			Tools: ['Recommended Tools'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolworkflow/',
				},
			],
		},
	},
	// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
	inputs: [],
	// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
	outputs: [NodeConnectionTypes.AiTool],
	outputNames: ['Tool'],
	properties: [
		getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
		{
			displayName:
				'See an example of a workflow to suggest meeting slots using AI <a href="/templates/1953" target="_blank">here</a>.',
			name: 'noticeTemplateExample',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			placeholder: 'My_Color_Tool',
			displayOptions: {
				show: {
					'@version': [1],
				},
			},
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			placeholder: 'e.g. My_Color_Tool',
			validateType: 'string-alphanumeric',
			description:
				'The name of the function to be called, could contain letters, numbers, and underscores only',
			displayOptions: {
				show: {
					'@version': [{ _cnd: { gte: 1.1 } }],
				},
			},
		},
		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
			placeholder:
				'Call this tool to get a random color. The input should be a string with comma separted names of colors to exclude.',
			typeOptions: {
				rows: 3,
			},
		},

		{
			displayName:
				'This tool will call the workflow you define below, and look in the last node for the response. The workflow needs to start with an Execute Workflow trigger',
			name: 'executeNotice',
			type: 'notice',
			default: '',
		},

		{
			displayName: 'Source',
			name: 'source',
			type: 'options',
			options: [
				{
					name: 'Database',
					value: 'database',
					description: 'Load the workflow from the database by ID',
				},
				{
					name: 'Define Below',
					value: 'parameter',
					description: 'Pass the JSON code of a workflow',
				},
			],
			default: 'database',
			description: 'Where to get the workflow to execute from',
		},

		// ----------------------------------
		//         source:database
		// ----------------------------------
		{
			displayName: 'Workflow ID',
			name: 'workflowId',
			type: 'string',
			displayOptions: {
				show: {
					source: ['database'],
					'@version': [{ _cnd: { lte: 1.1 } }],
				},
			},
			default: '',
			required: true,
			description: 'The workflow to execute',
			hint: 'Can be found in the URL of the workflow',
		},

		{
			displayName: 'Workflow',
			name: 'workflowId',
			type: 'workflowSelector',
			displayOptions: {
				show: {
					source: ['database'],
					'@version': [{ _cnd: { gte: 1.2 } }],
				},
			},
			default: '',
			required: true,
		},

		// ----------------------------------
		//         source:parameter
		// ----------------------------------
		{
			displayName: 'Workflow JSON',
			name: 'workflowJson',
			type: 'json',
			typeOptions: {
				rows: 10,
			},
			displayOptions: {
				show: {
					source: ['parameter'],
				},
			},
			default: '\n\n\n\n\n\n\n\n\n',
			required: true,
			description: 'The workflow JSON code to execute',
		},
		// ----------------------------------
		//         For all
		// ----------------------------------
		{
			displayName: 'Field to Return',
			name: 'responsePropertyName',
			type: 'string',
			default: 'response',
			required: true,
			hint: 'The field in the last-executed node of the workflow that contains the response',
			description:
				'Where to find the data that this tool should return. n8n will look in the output of the last-executed node of the workflow for a field with this name, and return its value.',
			displayOptions: {
				show: {
					'@version': [{ _cnd: { lt: 1.3 } }],
				},
			},
		},
		{
			displayName: 'Extra Workflow Inputs',
			name: 'fields',
			placeholder: 'Add Value',
			type: 'fixedCollection',
			description:
				"These will be output by the 'execute workflow' trigger of the workflow being called",
			typeOptions: {
				multipleValues: true,
				sortable: true,
			},
			default: {},
			options: [
				{
					name: 'values',
					displayName: 'Values',
					values: [
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
							placeholder: 'e.g. fieldName',
							description:
								'Name of the field to set the value of. Supports dot-notation. Example: data.person[0].name.',
							requiresDataPath: 'single',
						},
						{
							displayName: 'Type',
							name: 'type',
							type: 'options',
							description: 'The field value type',
							// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
							options: [
								{
									name: 'String',
									value: 'stringValue',
								},
								{
									name: 'Number',
									value: 'numberValue',
								},
								{
									name: 'Boolean',
									value: 'booleanValue',
								},
								{
									name: 'Array',
									value: 'arrayValue',
								},
								{
									name: 'Object',
									value: 'objectValue',
								},
							],
							default: 'stringValue',
						},
						{
							displayName: 'Value',
							name: 'stringValue',
							type: 'string',
							default: '',
							displayOptions: {
								show: {
									type: ['stringValue'],
								},
							},
							validateType: 'string',
							ignoreValidationDuringExecution: true,
						},
						{
							displayName: 'Value',
							name: 'numberValue',
							type: 'string',
							default: '',
							displayOptions: {
								show: {
									type: ['numberValue'],
								},
							},
							validateType: 'number',
							ignoreValidationDuringExecution: true,
						},
						{
							displayName: 'Value',
							name: 'booleanValue',
							type: 'options',
							default: 'true',
							options: [
								{
									name: 'True',
									value: 'true',
								},
								{
									name: 'False',
									value: 'false',
								},
							],
							displayOptions: {
								show: {
									type: ['booleanValue'],
								},
							},
							validateType: 'boolean',
							ignoreValidationDuringExecution: true,
						},
						{
							displayName: 'Value',
							name: 'arrayValue',
							type: 'string',
							default: '',
							placeholder: 'e.g. [ arrayItem1, arrayItem2, arrayItem3 ]',
							displayOptions: {
								show: {
									type: ['arrayValue'],
								},
							},
							validateType: 'array',
							ignoreValidationDuringExecution: true,
						},
						{
							displayName: 'Value',
							name: 'objectValue',
							type: 'json',
							default: '={}',
							typeOptions: {
								rows: 2,
							},
							displayOptions: {
								show: {
									type: ['objectValue'],
								},
							},
							validateType: 'object',
							ignoreValidationDuringExecution: true,
						},
					],
				},
			],
		},
		// ----------------------------------
		//         Output Parsing
		// ----------------------------------
		{
			displayName: 'Specify Input Schema',
			name: 'specifyInputSchema',
			type: 'boolean',
			description:
				'Whether to specify the schema for the function. This would require the LLM to provide the input in the correct format and would validate it against the schema.',
			noDataExpression: true,
			default: false,
		},
		{ ...schemaTypeField, displayOptions: { show: { specifyInputSchema: [true] } } },
		jsonSchemaExampleField,
		inputSchemaField,
	],
};
