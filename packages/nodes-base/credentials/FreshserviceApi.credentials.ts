import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FreshserviceApi implements ICredentialType {
	name = 'freshserviceApi';
	displayName = 'Freshservice API';
	documentationUrl = 'freshservice';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			placeholder: 'atuH3AbeH9HsKvgHuxg',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'n8n',
			description: 'Domain in the Freshservice org URL. For example, in <code>https://n8n.freshservice.com</code>, the domain is <code>n8n</code>',
		},
	];
}
