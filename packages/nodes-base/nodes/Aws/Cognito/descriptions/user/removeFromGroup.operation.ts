import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import {
	groupResourceLocator,
	userPoolResourceLocator,
	userResourceLocator,
} from '../../helpers/resourceLocators';

const properties: INodeProperties[] = [
	userPoolResourceLocator,
	userResourceLocator,
	groupResourceLocator,
];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['removeFromGroup'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
