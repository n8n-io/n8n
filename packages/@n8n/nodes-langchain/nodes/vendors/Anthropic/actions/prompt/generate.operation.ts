import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import type { PromptResponse } from '../../helpers/interfaces';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Task',
		name: 'task',
		type: 'string',
		description: "Description of the prompt's purpose",
		placeholder: 'e.g. A chef for a meal prep planning service',
		default: '',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

const displayOptions = {
	show: {
		operation: ['generate'],
		resource: ['prompt'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const task = this.getNodeParameter('task', i, '') as string;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;

	const body = {
		task,
	};
	const response = (await apiRequest.call(this, 'POST', '/v1/experimental/generate_prompt', {
		body,
		enableAnthropicBetas: { promptTools: true },
	})) as PromptResponse;

	if (simplify) {
		return [
			{
				json: {
					messages: response.messages,
					system: response.system,
				},
				pairedItem: { item: i },
			},
		];
	}

	return [
		{
			json: { ...response },
			pairedItem: { item: i },
		},
	];
}
