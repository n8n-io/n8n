import type {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	IHttpRequestOptions,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';

import axios from 'axios';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';

async function getGigaChatAccessToken({
	clientId,
	clientSecret,
	scope,
	authUrl,
	allowUnauthorizedCerts = false,
}: {
	clientId: string;
	clientSecret: string;
	scope: string;
	authUrl: string;
	allowUnauthorizedCerts?: boolean;
}): Promise<string> {
	const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

	const headers = {
		Authorization: `Basic ${auth}`,
		RqUID: uuidv4(),
		'User-Agent': 'n8n-gigachat/1.0',
		'Content-Type': 'application/x-www-form-urlencoded',
		Accept: 'application/json',
	};

	const response = await axios.post(`${authUrl}/oauth`, new URLSearchParams({ scope }), {
		headers,
		httpsAgent: new https.Agent({ rejectUnauthorized: !allowUnauthorizedCerts }),
	});

	return response.data.access_token;
}

export class GigaChatApi implements ICredentialType {
	name = 'gigaChatApi';

	displayName = 'GigaChat';

	documentationUrl = 'gigaChat';

	properties: INodeProperties[] = [
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			required: true,
			default: '',
			description: 'Client ID из личного кабинета GigaChat',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Client Secret из личного кабинета GigaChat',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'options',
			options: [
				{
					name: 'GIGACHAT_API_PERS',
					value: 'GIGACHAT_API_PERS',
					description: 'Доступ для физических лиц',
				},
				{
					name: 'GIGACHAT_API_B2B',
					value: 'GIGACHAT_API_B2B',
					description: 'Доступ для ИП и юридических лиц по платным пакетам',
				},
				{
					name: 'GIGACHAT_API_CORP',
					value: 'GIGACHAT_API_CORP',
					description: 'Доступ для ИП и юридических лиц по схеме pay-as-you-go',
				},
			],
			default: 'GIGACHAT_API_PERS',
			required: true,
		},
		{
			displayName: 'Auth URL',
			name: 'authUrl',
			type: 'string',
			default: 'https://ngw.devices.sberbank.ru:9443/api/v2',
			description: 'URL для получения access_token',
		},
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://gigachat.devices.sberbank.ru/api/v1',
			description: 'Базовый URL для API GigaChat',
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			description: 'Whether to connect even if SSL certificate validation is not possible',
			default: false,
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const accessToken = await getGigaChatAccessToken({
			clientId: String(credentials.clientId),
			clientSecret: String(credentials.clientSecret),
			scope: String(credentials.scope),
			authUrl: String(credentials.authUrl),
			allowUnauthorizedCerts: Boolean(credentials.allowUnauthorizedCerts),
		});

		return {
			...requestOptions,
			headers: {
				...requestOptions.headers,
				Authorization: `Bearer ${accessToken}`,
			},
		};
	}

	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			url: '={{$credentials?.apiUrl}}/models',
			headers: {
				'User-Agent': 'n8n-gigachat/1.0',
				Accept: 'application/json',
			},
			skipSslCertificateValidation: '={{ $credentials.allowUnauthorizedCerts }}',
		},
	};
}
