import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class ProjectsApi implements ICredentialType {
	name = 'projectsApi';

	displayName = 'Projects API';

	icon: Icon = 'file:../nodes/Projects/projects.svg';

	documentationUrl = 'https://example.com/n8n-nodes-projects#credentials';

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
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: { baseURL: 'http://127.0.0.1:18090/projects/v1', url: '/projects' },
	};
}
