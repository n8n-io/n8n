import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class GraphApi implements ICredentialType {
	name = 'graphApi';
	displayName = 'Graph API';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
