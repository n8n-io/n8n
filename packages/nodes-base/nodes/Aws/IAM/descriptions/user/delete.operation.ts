import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { userResourceLocator } from '../../helpers/resourceLocators';

const properties: INodeProperties[] = [...userResourceLocator];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
