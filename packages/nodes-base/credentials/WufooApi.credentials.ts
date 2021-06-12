import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WufooApi implements ICredentialType {
	name = 'wufooApi';
	displayName = 'Wufoo API';
	documentationUrl = 'wufoo';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
		},
	];
}
