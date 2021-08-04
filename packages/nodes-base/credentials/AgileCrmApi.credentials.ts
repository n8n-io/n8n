import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AgileCrmApi implements ICredentialType {
	name = 'agileCrmApi';
	displayName = 'AgileCRM API';
	documentationUrl = 'agileCrm';
	properties: INodeProperties[] = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
		},
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
			placeholder: 'example',
			description: 'If the domain is https://example.agilecrm.com "example" would have to be entered.',
		},
	];
}
