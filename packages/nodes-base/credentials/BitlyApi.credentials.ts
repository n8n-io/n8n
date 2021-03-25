import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class BitlyApi implements ICredentialType {
	name = 'bitlyApi';
	displayName = 'Bitly API';
	documentationUrl = 'bitly';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
