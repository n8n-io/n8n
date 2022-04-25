import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WebflowApi implements ICredentialType {
	name = 'webflowApi';
	displayName = 'Webflow API';
	documentationUrl = 'webflow';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];
}
