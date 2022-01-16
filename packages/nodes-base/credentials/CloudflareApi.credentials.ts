import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CloudflareApi implements ICredentialType {
	name = 'cloudflareApi';
	displayName = 'Cloudflare API';
	documentationUrl = 'cloudflare';
	properties: INodeProperties[] = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Authentication Key',
			name: 'authenticationKey',
			type: 'string',
			default: '',
		},
	];
}
