import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class JiraSoftwareServerApi implements ICredentialType {
	name = 'jiraSoftwareServerApi';
	displayName = 'Jira SW Server API';
	documentationUrl = 'jira';
	properties: INodeProperties[] = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			typeOptions: {
				password: true,
			},
			type: 'string',
			default: '',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://example.com',
		},
	];
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const data = Buffer.from(`${credentials!.email}:${credentials!.password}`).toString('base64');
		requestOptions.headers = {
			Authorization: `Basic ${data}`,
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'X-Atlassian-Token': 'no-check',
		};
		return requestOptions;
	}
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.domain}}',
			url: '/rest/api/2/project',
		},
	};
}
