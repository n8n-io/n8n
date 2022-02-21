import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MispApi implements ICredentialType {
	name = 'mispApi';
	displayName = 'MISP API';
	documentationUrl = 'misp';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Allow Unauthorized Certificates',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
		},
	];
}
