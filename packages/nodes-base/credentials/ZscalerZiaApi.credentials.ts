import { ApplicationError } from 'n8n-workflow';
import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class ZscalerZiaApi implements ICredentialType {
	name = 'zscalerZiaApi';

	displayName = 'Zscaler ZIA API';

	documentationUrl = 'zscalerzia';

	icon: Icon = 'file:icons/Zscaler.svg';

	httpRequestNode = {
		name: 'Zscaler ZIA',
		docsUrl: 'https://help.zscaler.com/zia/getting-started-zia-api',
		apiBaseUrl: '',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Cookie',
			name: 'cookie',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'e.g. zsapi.zscalerthree.net',
			required: true,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Api Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const { baseUrl, username, password, apiKey } = credentials;

		const url = (baseUrl as string).endsWith('/')
			? (baseUrl as string).slice(0, -1)
			: (baseUrl as string);

		const now = Date.now().toString();

		const obfuscate = (key: string, timestamp: string) => {
			const high = timestamp.substring(timestamp.length - 6);
			let low = (parseInt(high) >> 1).toString();

			let obfuscatedApiKey = '';
			while (low.length < 6) {
				low = '0' + low;
			}

			for (let i = 0; i < high.length; i++) {
				obfuscatedApiKey += key.charAt(parseInt(high.charAt(i)));
			}
			for (let j = 0; j < low.length; j++) {
				obfuscatedApiKey += key.charAt(parseInt(low.charAt(j)) + 2);
			}

			return obfuscatedApiKey;
		};

		const response = await this.helpers.httpRequest({
			method: 'POST',
			baseURL: `https://${url}`,
			url: '/api/v1/authenticatedSession',
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache',
			},
			body: {
				apiKey: obfuscate(apiKey as string, now),
				username,
				password,
				timestamp: now,
			},
			returnFullResponse: true,
		});

		const headers = response.headers;

		const cookie = (headers['set-cookie'] as string[])
			?.find((entrt) => entrt.includes('JSESSIONID'))
			?.split(';')
			?.find((entry) => entry.includes('JSESSIONID'));

		if (!cookie) {
			throw new ApplicationError('No cookie returned. Please check your credentials.', {
				level: 'warning',
			});
		}

		return { cookie };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Cookie: '={{$credentials.cookie}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			url: '=https://{{$credentials.baseUrl}}/api/v1/authSettings/exemptedUrls',
		},
	};
}
