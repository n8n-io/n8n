import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	// TODO: different models?
	modelRLC('modelSearch'),
	// TODO: add properties
];

const displayOptions = {
	show: {
		operation: ['analyze'],
		resource: ['audio'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	return [];
}
