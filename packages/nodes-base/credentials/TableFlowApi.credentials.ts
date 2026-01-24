import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class TableFlowApi implements ICredentialType {
	name = 'tableflowApi';
	displayName = 'TableFlow API';
	documentationUrl = '';

	properties: INodeProperties[] = [
		// User access token
		{
			displayName: 'Access Token',
			name: 'token',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			required: true,
			description: 'Your TableFlow API access token (JWT)',
		},
	];

	authenticate = {
		type: 'generic' as const,
		properties: {
			headers: {
				Authorization: '={{"Bearer " + $credentials.token}}',
			},
		},
	};

	// Method for checking credentials
	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			url: 'https://example.com',
		},
	};
}
