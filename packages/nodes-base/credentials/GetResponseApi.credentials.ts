import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class GetResponseApi implements ICredentialType {
	name = 'getResponseApi';
	displayName = 'GetResponse API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
