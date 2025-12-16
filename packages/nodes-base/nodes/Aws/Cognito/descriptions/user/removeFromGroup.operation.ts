import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import {
	groupResourceLocator,
	userPoolResourceLocator,
	userResourceLocator,
} from '../common.description';

const properties: INodeProperties[] = [
	{
		...userPoolResourceLocator,
		description: 'Select the user pool to use',
	},
	{
		...userResourceLocator,
		description: 'Select the user you want to remove from the group',
	},
	{
		...groupResourceLocator,
		description: 'Select the group you want to remove the user from',
		modes: groupResourceLocator.modes?.map((mode) =>
			mode.name === 'list'
				? {
						...mode,
						typeOptions: {
							...mode.typeOptions,
							searchListMethod: 'searchGroupsForUser',
						},
					}
				: mode,
		),
	},
];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['removeFromGroup'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
