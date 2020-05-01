import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class MongoDb implements ICredentialType {
	name = 'mongoDb';
	displayName = 'MongoDB';
	properties = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string' as NodePropertyTypes,
			default: 'localhost'
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string' as NodePropertyTypes,
			default: '',
			description:
				'Note: the database should still be provided even if using an override connection string'
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string' as NodePropertyTypes,
			default: ''
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true
			},
			default: ''
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number' as NodePropertyTypes,
			default: 27017
		},
		{
			displayName: 'Override conn string',
			name: 'shouldOverrideConnString',
			type: 'boolean' as NodePropertyTypes,
			default: false,
			required: false,
			description:
				'Whether to override the generated connection string. Credentials will also be ignored in this case.'
		},
		{
			displayName: 'Conn string override',
			name: 'connStringOverrideVal',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				rows: 1
			},
			default: '',
			placeholder: `mongodb://USERNAMEHERE:PASSWORDHERE@localhost:27017/?authSource=admin&readPreference=primary&appname=n8n&ssl=false`,
			required: false,
			description: `If provided, the value here will be used as a MongoDB connection string, and the MongoDB credentials will be ignored`
		}
	];
}
