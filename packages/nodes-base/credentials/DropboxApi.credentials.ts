import {
	IAuthenticateGeneric,
	ICredentialTestFunction,
	ICredentialTestRequest,
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
			typeOptions: { password: true },
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
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.dropboxapi.com/2',
			url: '/users/get_current_account',
			method: 'POST',
		},
	};
}
