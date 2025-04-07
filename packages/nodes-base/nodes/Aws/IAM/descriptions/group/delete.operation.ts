import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { groupResourceLocator } from '../../helpers/resourceLocators';

const properties: INodeProperties[] = [...groupResourceLocator];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
