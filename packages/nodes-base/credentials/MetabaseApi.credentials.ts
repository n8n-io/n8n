import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MetabaseApi implements ICredentialType {
	name = 'metabaseApi';
	displayName = 'Metabase API';
	documentationUrl = 'metabase';
	extends = [
		'renovateToken',
	];
	properties: INodeProperties[] = [
		{
			displayName: 'Authentication Endpoint',
			name: 'authEndpoint',
			type: 'hidden',
			default: '/api/session',
		},
	];
}
