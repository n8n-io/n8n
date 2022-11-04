import {IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties} from 'n8n-workflow';

export class TiDBCloudApi implements ICredentialType {
	name = 'tiDBCloudApi';
	displayName = 'TiDB';
	documentationUrl = 'tiDB';
	properties: INodeProperties[] = [
		{
			displayName: 'Public Key',
			name: 'publicKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			default: '',
		},
	];
	// authenticate: IAuthenticateGeneric = {
	// 	type: 'generic',
	// 	properties: {
	// 		auth: {
	// 			username: '={{$credentials.publicKey}}',
	// 			password: '={{$credentials.privateKey}}',
	// 			sendImmediately: false,
	// 		},
	// 	},
	// };
	// test: ICredentialTestRequest = {
	// 	request: {
	// 		baseURL: 'https://api.tidbcloud.com',
	// 		url: '/api/v1beta/projects',
	// 		method: 'GET',
	// 	},
	// };
}
