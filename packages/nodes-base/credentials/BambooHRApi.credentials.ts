import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BambooHRApi implements ICredentialType {
	name = 'bambooHRApi';
	displayName = 'BambooHR API';
	documentationUrl = 'bambooHR';
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
