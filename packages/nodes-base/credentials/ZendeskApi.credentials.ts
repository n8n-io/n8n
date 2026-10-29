import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class ZendeskApi implements ICredentialType {
	name = 'zendeskApi';

	displayName = 'Zendesk API';

	documentationUrl = 'zendesk';

	properties: INodeProperties[] = [
		{
			displayName:
				'Zendesk is retiring API token authentication. Use OAuth2 for new connections and migrate existing workflows to OAuth2. <a href="https://developer.zendesk.com/documentation/authentication/oauth-migration/#migration-timeline" target="_blank">Learn more about OAuth migration (Zendesk)</a>',
			name: 'apiTokenRetirementNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			description: 'The subdomain of your Zendesk work environment',
			placeholder: 'company',
			default: '',
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.auth = {
			username: `${credentials.email}/token`,
			password: credentials.apiToken as string,
		};
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.subdomain}}.zendesk.com/api/v2',
			url: '/ticket_fields.json',
		},
	};
}
