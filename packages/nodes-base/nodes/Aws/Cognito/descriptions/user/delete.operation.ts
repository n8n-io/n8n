import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { userPoolResourceLocator, userResourceLocator } from '../../helpers/resourceLocators';

const properties: INodeProperties[] = [userPoolResourceLocator, userResourceLocator];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
