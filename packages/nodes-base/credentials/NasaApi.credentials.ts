import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class NasaApi implements ICredentialType {
	name = 'nasaApi';
	displayName = 'NASA API';
	properties = [
		{
			displayName: 'API Key',
			name: 'api_key',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
