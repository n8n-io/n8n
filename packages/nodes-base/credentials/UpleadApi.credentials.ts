import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class UpleadApi implements ICredentialType {
	name = 'upleadApi';
	displayName = 'Uplead API';
	documentationUrl = 'uplead';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
