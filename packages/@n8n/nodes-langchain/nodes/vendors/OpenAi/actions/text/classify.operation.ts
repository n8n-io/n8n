import type { INodeProperties, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Text Input',
		name: 'input',
		type: 'string',
		placeholder: 'e.g. Sample text goes here',
		description: 'The input text to classify if it is violates the moderation policy',
		default: '',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: false,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Use Stable Model',
				name: 'useStableModel',
				type: 'boolean',
				default: false,
				description:
					'Whether to use the stable version of the model instead of the latest version, accuracy may be slightly lower',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['classify'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const input = this.getNodeParameter('input', i) as string;
	const options = this.getNodeParameter('options', i);
	const model = options.useStableModel ? 'text-moderation-stable' : 'text-moderation-latest';

	const body = {
		input,
		model,
	};

	const { results } = await apiRequest.call(this, 'POST', '/moderations', { body });

	if (!results) return [];

	const simplify = this.getNodeParameter('simplify', i) as boolean;

	if (simplify && results) {
		return [
			{
				json: { flagged: results[0].flagged },
				pairedItem: { item: i },
			},
		];
	} else {
		return [
			{
				json: results[0],
				pairedItem: { item: i },
			},
		];
	}
}
