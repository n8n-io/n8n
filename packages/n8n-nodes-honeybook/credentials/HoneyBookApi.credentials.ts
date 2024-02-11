import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HoneyBookApi implements ICredentialType {
	name = 'honeyBookApi';
	displayName = 'HoneyBook API';
	properties: INodeProperties[] = [
		{
			displayName: 'Context user',
			name: 'ctxu',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Context company',
			name: 'ctxc',
			type: 'string',
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				ctxu: '={{$credentials.ctxu}}',
				ctxc: '={{$credentials.ctxc}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: process.env['HB_API_ENDPOINT'] || 'https://mocki.io',
			url: process.env['HB_TEST_API_ENDPOINT'] || 'v2/n8n/test_credentials',
			method: 'GET'
		},
	};
}