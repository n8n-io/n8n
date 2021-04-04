import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class OuraApi implements ICredentialType {
	name = 'ouraApi';
	displayName = 'Oura API';
	documentationUrl = 'oura';
	properties = [
		{
			displayName: 'Personal Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
