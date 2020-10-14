import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class CleverCloudCli implements ICredentialType {
	name = 'cleverCloudCli';
	displayName = 'Clever Cloud CLI';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Access Token Secret',
			name: 'accessTokenSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
		}
	];
}
