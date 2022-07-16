import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class RocketchatApi implements ICredentialType {
	name = 'rocketchatApi';
	displayName = 'Rocket API';
	documentationUrl = 'rocketchat';
	properties: INodeProperties[] = [
		{
			displayName: 'User ID',
			name: 'userId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Auth Key',
			name: 'authKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://n8n.rocket.chat',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Auth-Token': '={{$credentials.authKey}}',
				'X-User-Id': '={{$credentials.userId}}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.domain}}',
			url: '/api/v1/webdav.getMyAccounts',
		},
	};
}
