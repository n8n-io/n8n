import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { groupResourceLocator, userPoolResourceLocator } from '../../helpers/resourceLocators';

const properties: INodeProperties[] = [
	userPoolResourceLocator,
	groupResourceLocator,
	{
		displayName: 'Include User List',
		name: 'includeUsers',
		type: 'boolean',
		default: false,
		description: 'Whether to include a list of users in the group',
	},
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
