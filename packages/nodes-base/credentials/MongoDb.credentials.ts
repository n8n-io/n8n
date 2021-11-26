import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MongoDb implements ICredentialType {
	name = 'mongoDb';
	displayName = 'MongoDB';
	documentationUrl = 'mongoDb';
	properties: INodeProperties[] = [
		{
			displayName: 'Configuration Type',
			name: 'configurationType',
			type: 'options',
			options: [
				{
					name: 'Connection String',
					value: 'connectionString',
					description: 'Provide connection data via string',
				},
				{
					name: 'Values',
					value: 'values',
					description: 'Provide connection data via values',
				},
			],
			default: 'values',
			description: 'The operation to perform.',
		},
		{
			displayName: 'Connection String',
			name: 'connectionString',
			type: 'string',
			displayOptions: {
				show: {
					configurationType: [
						'connectionString',
					],
				},
			},
			default: '',
			placeholder: 'mongodb://<USERNAME>:<PASSWORD>@localhost:27017/?authSource=admin&readPreference=primary&appname=n8n&ssl=false',
			required: false,
			description: `If provided, the value here will be used as a MongoDB connection string,
						  and the MongoDB credentials will be ignored`,
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			displayOptions: {
				show: {
					configurationType: [
						'values',
					],
				},
			},
			default: 'localhost',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			default: '',
			description: 'Note: the database should still be provided even if using an override connection string',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			displayOptions: {
				show: {
					configurationType: [
						'values',
					],
				},
			},
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					configurationType: [
						'values',
					],
				},
			},
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			displayOptions: {
				show: {
					configurationType: [
						'values',
					],
				},
			},
			default: 27017,
		},
	];
}
