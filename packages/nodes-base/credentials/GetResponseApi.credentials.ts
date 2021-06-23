import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GetResponseApi implements ICredentialType {
	name = 'getResponseApi';
	displayName = 'GetResponse API';
	documentationUrl = 'getResponse';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
