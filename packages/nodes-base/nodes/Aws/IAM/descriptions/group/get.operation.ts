import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { groupResourceLocator } from '../../helpers/resourceLocators';

const properties: INodeProperties[] = [
	...groupResourceLocator,
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
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
