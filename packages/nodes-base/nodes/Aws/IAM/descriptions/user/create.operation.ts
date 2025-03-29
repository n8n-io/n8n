import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'User Name',
		name: 'userNameNew',
		default: '',
		description: 'The username of the new user to create',
		placeholder: 'e.g. JohnSmith',
		required: true,
		type: 'string',
		validateType: 'string',
		typeOptions: {
			maxLength: 64,
			regex: '^[A-Za-z0-9+=,\\.@_-]+$',
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				validateType: 'string',
				default: '',
				description: 'The path for the user name',
				placeholder: 'e.g. /division_abc/subdivision_xyz/',
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
