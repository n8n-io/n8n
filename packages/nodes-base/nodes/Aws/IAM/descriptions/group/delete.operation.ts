import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { groupLocator } from '../common';

const properties: INodeProperties[] = [
	{
		...groupLocator,
		description: 'Select the group you want to delete',
	},
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
