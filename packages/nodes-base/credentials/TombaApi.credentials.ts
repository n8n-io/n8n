import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TombaApi implements ICredentialType {
	name = 'tombaApi';
	displayName = 'Tomba API';
	documentationUrl = 'tomba';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Secret',
			name: 'secretKey',
			type: 'string',
			default: '',
		},
	];
}
