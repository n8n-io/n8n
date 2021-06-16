import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class NasaApi implements ICredentialType {
	name = 'nasaApi';
	displayName = 'NASA API';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'api_key',
			type: 'string',
			default: '',
		},
	];
}
