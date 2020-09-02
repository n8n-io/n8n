import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class WebflowApi implements ICredentialType {
	name = 'webflowApi';
	displayName = 'Webflow API';
	documentationUrl = 'webflow';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
