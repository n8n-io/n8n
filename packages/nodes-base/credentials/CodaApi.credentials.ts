import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class CodaApi implements ICredentialType {
	name = 'codaApi';
	displayName = 'Coda API';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
