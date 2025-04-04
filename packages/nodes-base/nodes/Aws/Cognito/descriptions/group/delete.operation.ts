import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { groupResourceLocator, userPoolResourceLocator } from '../../helpers/resourceLocators';

const properties: INodeProperties[] = [userPoolResourceLocator, groupResourceLocator];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
