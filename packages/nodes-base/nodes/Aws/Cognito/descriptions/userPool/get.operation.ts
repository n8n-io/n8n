import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { userPoolResourceLocator } from '../../helpers/resourceLocators';

const properties: INodeProperties[] = [
	userPoolResourceLocator,
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

const displayOptions = {
	show: {
		resource: ['userPool'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
