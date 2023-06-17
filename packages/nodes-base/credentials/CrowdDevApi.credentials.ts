import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CrowdDevApi implements ICredentialType {
	name = 'crowdDevApi';

	displayName = 'crowd.dev API';

	documentationUrl = 'https://docs.crowd.dev/reference/getting-started-with-crowd-dev-api';

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'hidden',
			default: 'https://app.crowd.dev',
		},
		{
			displayName: 'Tenant ID',
			name: 'tenantId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];

	// This allows the credential to be used by other parts of n8n
	// stating how this credential is injected as part of the request
	// An example is the Http Request node that can make generic calls
	// reusing this credential
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Bearer " + $credentials.token}}',
			},
		},
	};

	// The block below tells how this credential can be tested
	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			baseURL: '={{$credentials?.url + "/api/tenant/" + $credentials?.tenantId}}',
			url: '/member/query',
			body: {
				limit: 1,
				offset: 0,
			},
		},
	};
}
