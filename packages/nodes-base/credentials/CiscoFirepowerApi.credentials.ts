import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

export class CiscoFirepowerApi implements ICredentialType {
	name = 'metabaseApi';

	displayName = 'Metabase API';

	documentationUrl = 'metabase';

	icon = 'file:icons/Cisco.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
		{
			displayName: 'Management Center IP / Name',
			name: 'url',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: '',
		},
		{
			displayName: 'Domain UUID',
			name: 'domainUuid',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const url = credentials.url as string;
		const port = credentials.port as number;
		const { id } = (await this.helpers.httpRequest({
			method: 'POST',
			url: `https://${
				url.endsWith('/') ? url.slice(0, -1) : url
			}:${port}/api/fmc_platform/v1/auth/generatetoken`,
			body: {
				username: credentials.username,
				password: credentials.password,
			},
		})) as { id: string };
		return { sessionToken: id };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-auth-access-token:': '={{$credentials.sessionToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials?.url}}:{{$credentials?.port}}',
			url: '=/api/fmc_config/v1/domain/{{$credentials?.domainUuid}}',
		},
	};
}
