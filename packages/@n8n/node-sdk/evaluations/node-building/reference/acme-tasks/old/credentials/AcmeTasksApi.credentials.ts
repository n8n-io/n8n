import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class AcmeTasksApi implements ICredentialType {
	name = 'acmeTasksApi';

	displayName = 'Acme Tasks API';

	icon: Icon = 'file:../nodes/AcmeTasks/acmeTasks.svg';

	documentationUrl = 'https://example.com/n8n-nodes-acme-tasks#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Acme-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'http://127.0.0.1:18090/acme-tasks/v1',
			url: '/tasks',
			qs: { pageSize: 1 },
		},
	};
}
