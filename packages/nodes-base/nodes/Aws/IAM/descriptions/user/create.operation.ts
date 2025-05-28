import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { preprocessTags, validatePath, validatePermissionsBoundary } from '../../helpers/utils';
import { pathParameter, userNameParameter } from '../common';

const properties: INodeProperties[] = [
	{
		...userNameParameter,
		description: 'The username of the new user to create',
		placeholder: 'e.g. UserName',
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
				description: 'The path for the user name',
				placeholder: 'e.g. /division_abc/subdivision_xyz/',
				routing: {
					send: {
						preSend: [validatePath],
						property: 'Path',
						type: 'query',
					},
				},
			},
			{
				displayName: 'Permissions Boundary',
				name: 'permissionsBoundary',
				default: '',
				description:
					'The ARN of the managed policy that is used to set the permissions boundary for the user',
				placeholder: 'e.g. arn:aws:iam::123456789012:policy/ExampleBoundaryPolicy',
				type: 'string',
				validateType: 'string',
				routing: {
					send: {
						preSend: [validatePermissionsBoundary],
					},
				},
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'fixedCollection',
				description: 'A list of tags that you want to attach to the new user',
				default: [],
				placeholder: 'Add Tag',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'tags',
						displayName: 'Tag',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								placeholder: 'e.g., Department',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'e.g., Engineering',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [preprocessTags],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['user'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
