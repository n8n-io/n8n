import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DropboxApi implements ICredentialType {
	name = 'dropboxApi';
	displayName = 'Dropbox API';
	documentationUrl = 'dropbox';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'APP Access Type',
			name: 'accessType',
			type: 'options',
			options: [
				{
					name: 'App Folder',
					value: 'folder',
				},
				{
					name: 'Full Dropbox',
					value: 'full',
				},
			],
			default: 'full',
		},
	];
}
