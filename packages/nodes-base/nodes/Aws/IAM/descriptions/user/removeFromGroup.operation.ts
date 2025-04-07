import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { groupResourceLocator, userResourceLocator } from '../../helpers/resourceLocators';

const properties: INodeProperties[] = [...userResourceLocator, ...groupResourceLocator];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['removeFromGroup'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
