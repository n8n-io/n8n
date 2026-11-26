import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class LangfuseApi implements ICredentialType {
	name = 'langfuseApi';

	displayName = 'Langfuse API';

	documentationUrl = 'langfuse';

	icon: Icon = 'node:n8n-nodes-base.evaluationTrigger';

	properties: INodeProperties[] = [
		{
			displayName: 'Langfuse Host URL',
			name: 'host',
			type: 'string',
			default: 'https://cloud.langfuse.com',
			required: true,
			description:
				'The base URL of your Langfuse instance, for example https://cloud.langfuse.com (EU), https://us.cloud.langfuse.com (US) or your self-hosted URL',
		},
		{
			displayName: 'Public Key',
			name: 'publicKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Langfuse public API key (used as username for Basic Auth)',
		},
		{
			displayName: 'Secret Key',
			name: 'secretKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Langfuse secret API key (used as password for Basic Auth)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.publicKey}}',
				password: '={{$credentials.secretKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.host.replace(/\\/$/, "")}}',
			url: '/api/public/projects',
			method: 'GET',
		},
	};
}
