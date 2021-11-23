import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OneSaasApi implements ICredentialType {
	name = 'oneSaasApi';
	displayName = '1SaaS';
	documentationUrl = '1Saas';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
