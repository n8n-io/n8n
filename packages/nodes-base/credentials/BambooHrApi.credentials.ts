import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class BambooHrApi implements ICredentialType {
	name = 'bambooHrApi';
	displayName = 'BambooHR API';
	documentationUrl = 'bambooHr';
	properties: INodeProperties[] = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
