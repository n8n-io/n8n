import type {
	Icon,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class ZabbixApi implements ICredentialType {
	name = 'zabbixApi';

	displayName = 'Zabbix API';

	documentationUrl = 'zabbix';

	icon: Icon = 'file:icons/Zabbix.svg';

	httpRequestNode = {
		name: 'Zabbix',
		docsUrl: 'zabbix',
		apiBaseUrlPlaceholder: 'https://zabbix.digital-boss.dev/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			description: 'The base url',
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
		{
			displayName: 'Testing Mode',
			name: 'testingMode',
			type: 'boolean',
			default: false,
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			'Api-Username': credentials.username,
			'Api-Password': credentials.password,
		};
		if (requestOptions.method === 'GET') {
			delete requestOptions.body;
		}

		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/',
			method: 'GET',
		},
	};
}
