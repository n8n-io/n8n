import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ZenHubApi implements ICredentialType {
	name = 'zenHubApi';
	displayName = 'ZenHub API';
	documentationUrl = 'zenHub';
	properties = [
			{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string' as NodePropertyTypes,
					default: '',
			},
	];
}
