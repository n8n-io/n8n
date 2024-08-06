import type {
	ICredentialType,
	INodeProperties,
	IAuthenticateGeneric,
	ICredentialTestRequest,
} from 'n8n-workflow';

export class AcuitySchedulingApi implements ICredentialType {
	name = 'acuitySchedulingApi';

	displayName = 'Acuity Scheduling API';

	documentationUrl = 'acuityScheduling';

	properties: INodeProperties[] = [
		{
			displayName: 'User ID',
			name: 'userId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://acuityscheduling.com/api/v1',
			url: '/appointments',
		},
	};
}
