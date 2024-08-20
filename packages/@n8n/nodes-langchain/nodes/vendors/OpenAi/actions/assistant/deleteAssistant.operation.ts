import type { INodeProperties, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';
import { apiRequest } from '../../transport';
import { assistantRLC } from '../descriptions';

const properties: INodeProperties[] = [assistantRLC];

const displayOptions = {
	show: {
		operation: ['deleteAssistant'],
		resource: ['assistant'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const assistantId = this.getNodeParameter('assistantId', i, '', { extractValue: true }) as string;

	const response = await apiRequest.call(this, 'DELETE', `/assistants/${assistantId}`, {
		headers: {
			'OpenAI-Beta': 'assistants=v2',
		},
	});

	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
