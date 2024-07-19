import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class CouchbaseApi implements ICredentialType {
	name = 'couchbaseApi';
	displayName = 'Couchbase Credentials API';
	documentationUrl = 'https://github.com/maruakinu/n8n-nodes-couchbase.git';
	properties: INodeProperties[] = [
		{
			displayName: 'Connection String',
			name: 'CouchbaseConnection',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Username',
			name: 'CouchbaseUsername',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'CouchbasePassword',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
