import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class NetlifyApi implements ICredentialType {
	name = 'netlifyApi';

	displayName = 'Netlify API';

	documentationUrl = 'netlify';

	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
