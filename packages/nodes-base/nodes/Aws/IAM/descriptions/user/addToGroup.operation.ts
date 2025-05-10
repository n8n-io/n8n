import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { groupLocator, userLocator } from '../common';

const properties: INodeProperties[] = [
	{
		...userLocator,
		description: 'Select the user you want to add to the group',
	},
	{
		...groupLocator,
		description: 'Select the group you want to add the user to',
	},
];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['addToGroup'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
