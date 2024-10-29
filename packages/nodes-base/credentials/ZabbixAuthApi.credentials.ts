import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

export class ZabbixAuthApi implements ICredentialType {
	name = 'zabbixAuthApi';

	displayName = 'Zabbix Auth API';

	documentationUrl = 'zabbix';

	icon: Icon = 'file:icons/Zabbix.svg';

	httpRequestNode = {
		name: 'Zabbix',
		docsUrl: 'https://www.zabbix.com/documentation/current/en/manual/api',
		apiBaseUrl: '',
	};

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
			displayName: 'URL',
			name: 'url',
			type: 'string',
			required: true,
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

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.sessionToken}}',
			},
		},
	};

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const url = credentials.url as string;

		const { token } = (await this.helpers.httpRequest({
			method: 'POST',
			url,
			body: {
				jsonrpc: '2.0',
				method: 'user.login',
				params: {
					username: credentials.username,
					password: credentials.password,
				},
				id: 1,
			},
			headers: {
				'Content-Type': 'application/json-rpc',
			},
			json: true,
		})) as { token: string };
		return { sessionToken: token };
	}

	async postAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const url = credentials.url as string;
		const token = credentials.sessionToken as string;

		await this.helpers.httpRequest({
			method: 'POST',
			url,
			body: {
				jsonrpc: '2.0',
				method: 'user.logout',
				params: [],
				id: 1,
			},
			headers: {
				'Content-Type': 'application/json-rpc',
				Authorization: `Bearer ${token}`,
			},
			json: true,
		});
	}

	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			url: 'https://zabbix.digital-boss.dev/zabbix/api_jsonrpc.php',
			body: {
				jsonrpc: '2.0',
				method: 'apiinfo.version',
				params: {},
				id: 1,
			},
			headers: {
				'Content-Type': 'application/json-rpc',
			},
			json: true,
		},
	};
}
