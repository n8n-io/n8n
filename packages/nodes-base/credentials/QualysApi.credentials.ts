import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class QualysApi implements ICredentialType {
	name = 'qualysApi';

	displayName = 'Qualys API';

	icon = 'file:icons/Qualys.svg';

	documentationUrl = 'qualys';

	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Requested With',
			name: 'requestedWith',
			type: 'string',
			default: 'n8n application',
			description: 'User description, like a user agent',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Requested-With': '={{$credentials.requestedWith}}',
			},
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	// test: ICredentialTestRequest = {
	// 	request: {
	// 		baseURL: 'https://qualysapi.qualys.com',
	// 		url: '/api/2.0/fo/asset/host/?action=list',
	// 	},
	// };
}
