import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class JiraSoftwareCloudApi implements ICredentialType {
	name = 'jiraSoftwareCloudApi';
	displayName = 'Jira SW Cloud API';
	documentationUrl = 'jira';
	properties: INodeProperties[] = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://example.atlassian.net',
		},
	];
	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		console.log('credentials', credentials.password);
		const bearer = Buffer.from(`${credentials.email}:${credentials!.password || credentials!.apiToken}`).toString('base64');
		requestOptions.headers!['Authorization'] = `Basic ${bearer}`;
		console.log('### PASSED #### ');
		console.log(`Bearer: ${bearer}`);
		return requestOptions;
	}
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.domain}}',
			url: '/rest/api/2/project',
		},
	};
}
