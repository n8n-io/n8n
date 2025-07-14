import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { paginationParameters } from '../common';

const properties: INodeProperties[] = [
	...paginationParameters,
	{
		displayName: 'Include Users',
		name: 'includeUsers',
		type: 'boolean',
		default: false,
		description: 'Whether to include a list of users in the group',
	},
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
