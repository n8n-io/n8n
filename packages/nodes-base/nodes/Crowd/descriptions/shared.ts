import type { INodeProperties } from 'n8n-workflow';

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
					default: '',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
				},
			],
		},
	],
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
					default: '',
				},
			],
		},
	],
};
