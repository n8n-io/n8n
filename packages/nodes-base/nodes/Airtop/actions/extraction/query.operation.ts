import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { outputSchemaField, parseJsonOutputField } from '../common/fields';
import { parseJsonIfPresent } from '../common/output.utils';
import { executeRequestWithSessionManagement } from '../common/session.utils';

export const description: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		placeholder: 'e.g. Is there a login form in this page?',
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['query'],
			},
		},
		description: 'The prompt to query the page content',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['query'],
			},
		},
		options: [
			{
				...outputSchemaField,
			},
			{
				...parseJsonOutputField,
			},
			{
				displayName: 'Include Visual Analysis',
				name: 'includeVisualAnalysis',
				type: 'boolean',
				default: false,
				description: 'Whether to analyze the web page visually when fulfilling the request',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const prompt = this.getNodeParameter('prompt', index, '') as string;
	const additionalFields = this.getNodeParameter('additionalFields', index, {});
	const outputSchema = additionalFields.outputSchema;
	const includeVisualAnalysis = additionalFields.includeVisualAnalysis;

	const result = await executeRequestWithSessionManagement.call(this, index, {
		method: 'POST',
		path: '/sessions/{sessionId}/windows/{windowId}/page-query',
		body: {
			prompt,
			configuration: {
				experimental: {
					includeVisualAnalysis: includeVisualAnalysis ? 'enabled' : 'disabled',
				},
				...(outputSchema ? { outputSchema } : {}),
			},
		},
	});

	const nodeOutput = parseJsonIfPresent.call(this, index, result);
	return this.helpers.returnJsonArray(nodeOutput);
}
