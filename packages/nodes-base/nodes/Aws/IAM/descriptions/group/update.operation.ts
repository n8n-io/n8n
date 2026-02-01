import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { validatePath } from '../../helpers/utils';
import { groupLocator, groupNameParameter, pathParameter } from '../common';

const properties: INodeProperties[] = [
	{
		...groupLocator,
		description: 'Select the group you want to update',
	},
	{
		...groupNameParameter,
		description: 'The new name of the group',
		placeholder: 'e.g. GroupName',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				...pathParameter,
				placeholder: 'e.g. /division_abc/engineering/',
				description: 'The new path to the group, if it is not included, it defaults to a slash (/)',
				routing: {
					send: {
						preSend: [validatePath],
						property: 'NewPath',
						type: 'query',
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
