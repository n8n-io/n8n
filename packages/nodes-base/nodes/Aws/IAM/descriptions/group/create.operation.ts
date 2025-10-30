import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { validatePath } from '../../helpers/utils';
import { groupNameParameter, pathParameter } from '../common';

const properties: INodeProperties[] = [
	{
		...groupNameParameter,
		description: 'The name of the new group to create',
		placeholder: 'e.g. GroupName',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		default: {},
		options: [
			{
				...pathParameter,
				placeholder: 'e.g. /division_abc/engineering/',
				description: 'The path to the group, if it is not included, it defaults to a slash (/)',
				routing: {
					send: {
						preSend: [validatePath],
						property: 'Path',
						type: 'query',
					},
				},
			},
		],
		placeholder: 'Add Option',
		type: 'collection',
	},
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
