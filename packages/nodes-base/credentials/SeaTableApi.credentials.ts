import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class SeaTableApi implements ICredentialType {
	name = 'seaTableApi';

	displayName = 'SeaTable API';

	documentationUrl = 'seaTable';

	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			default: 'cloudHosted',
			options: [
				{
					name: 'Cloud-Hosted',
					value: 'cloudHosted',
				},
				{
					name: 'Self-Hosted',
					value: 'selfHosted',
				},
			],
		},
		{
			displayName: 'Self-Hosted Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://seatable.example.com',
			displayOptions: {
				show: {
					environment: ['selfHosted'],
				},
			},
		},
		{
			displayName: 'API Token (of a Base)',
			name: 'token',
			type: 'string',
			description:
				'The API-Token of the SeaTable base you would like to use with n8n. n8n can only connect to one base at a time.',
			typeOptions: { password: true },
			default: '',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.domain || "https://cloud.seatable.io" }}',
			url: '/api/v2.1/dtable/app-access-token/',
			headers: {
				Authorization: '={{"Token " + $credentials.token}}',
			},
		},
	};
}
