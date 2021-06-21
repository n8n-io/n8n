import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DemioApi implements ICredentialType {
	name = 'demioApi';
	displayName = 'Demio API';
	documentationUrl = 'demio';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			default: '',
		},
	];
}
