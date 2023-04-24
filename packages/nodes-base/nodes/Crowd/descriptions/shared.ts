import { INodeProperties } from "n8n-workflow";

export const usernameField: INodeProperties = {
	displayName: 'Username',
	name: 'username',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	options: [
		{
			displayName: 'Item Choice',
			name: 'itemChoice',
			values: [
				{
					displayName: 'Key',
					name: 'key',
					type: 'string',
					default: ''
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: ''
				}
			]
		}
	]
};

export const emailsField: INodeProperties = {
	displayName: 'Emails',
	name: 'emails',
	description: 'Email addresses of the member',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	options: [
		{
			displayName: 'Item Choice',
			name: 'itemChoice',
			values: [
				{
					displayName: 'Email',
					name: 'email',
					type: 'string',
					placeholder: 'name@email.com',
					default: ''
				}
			]
		}
	]
}

export const organizationFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		description: 'The name of the organization',
		type: 'string',
		required: true,
		default: '',
	},
	{
		displayName: 'Url',
		name: 'url',
		description: 'The URL of the organization',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Description',
		name: 'description',
		description: 'A short description of the organization',
		type: 'string',
		typeOptions: {
			rows: 3
		},
		default: '',
	},
	{
		displayName: 'Logo',
		name: 'logo',
		description: 'A URL for logo of the organization',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Employees',
		name: 'employees',
		description: 'The number of employees of the organization',
		type: 'number',
		default: '',
	},
	{
		displayName: 'Members',
		name: 'members',
		description: 'Members associated with the organization. Each element in the array is the ID of the member.',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Item Choice',
				name: 'itemChoice',
				values: [
					{
						displayName: 'Member',
						name: 'member',
						type: 'string',
						default: ''
					}
				]
			}
		]
	},
];
