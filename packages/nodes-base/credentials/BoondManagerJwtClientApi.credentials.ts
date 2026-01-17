import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
	Icon,
} from 'n8n-workflow';
import { createHmac } from 'crypto';

export class BoondManagerJwtClient implements ICredentialType {
	name = 'boondManagerJwtClient';
	displayName = 'Boond Manager JWT Client';
	documentationUrl = 'https://doc.boondmanager.com/api-externe/';
	icon: Icon = 'file:icons/BoondManager.svg';

	httpRequestNode = {
		name: 'Boond Manager',
		docsUrl: 'https://doc.boondmanager.com/api-externe/',
		apiBaseUrlPlaceholder: 'https://ui.boondmanager.com/api',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://ui.boondmanager.com/api',
			placeholder: 'https://ui.boondmanager.com/api',
			description: 'Base URL of the Boond Manager API (without trailing slash)',
			required: true,
		},
		{
			displayName: 'Client Token',
			name: 'clientToken',
			type: 'string',
			default: '',
			placeholder: 'Your client token',
			description: 'Client token provided by Boond Manager in Administration > API',
			required: true,
		},
		{
			displayName: 'Client Key',
			name: 'clientKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'Your secret key',
			description: 'Client secret key to sign the JWT',
			required: true,
		},
		{
			displayName: 'User Token',
			name: 'userToken',
			type: 'string',
			default: '',
			placeholder: 'Your user token',
			description: 'Boond Manager user token',
			required: true,
		},
		{
			displayName: 'Mode',
			name: 'mode',
			type: 'string',
			default: 'normal',
			placeholder: 'normal or god',
			description: 'Boond Manager rights mode',
			required: true,
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const header = {
			alg: 'HS256',
			type: 'JWT',
		};

		const payload = {
			userToken: credentials.userToken,
			clientToken: credentials.clientToken,
			time: Date.now(),
			mode: credentials.mode,
		};

		const header64 = btoa(JSON.stringify(header));
		const payload64 = btoa(JSON.stringify(payload));

		const signature = createHmac('sha256', credentials.clientKey as string)
			.update(`${header64}.${payload64}`)
			.digest('base64');

		const jwt = `${header64}.${payload64}.${signature}`;

		requestOptions.headers = {
			...requestOptions.headers,
			'X-Jwt-Client-Boondmanager': jwt,
		};

		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.apiUrl}}',
			url: '/application',
		},
	};
}
