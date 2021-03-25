import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class DropboxApi implements ICredentialType {
	name = 'dropboxApi';
	displayName = 'Dropbox API';
	documentationUrl = 'dropbox';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'APP Access Type',
			name: 'accessType',
			type: 'options' as NodePropertyTypes,
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
