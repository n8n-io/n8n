import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ClickUpApi implements ICredentialType {
	name = 'clickUpApi';
	displayName = 'ClickUp API';
	documentationUrl = 'clickUp';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];
}
