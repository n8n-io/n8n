import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class HunterApi implements ICredentialType {
	name = 'hunterApi';
	displayName = 'Hunter API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
