import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class SalesforceClientCredentialsApi implements ICredentialType {
	name = 'salesforceClientCredentialsApi';

	displayName = 'Salesforce Client Credentials API';

	documentationUrl = 'salesforce';

	properties: INodeProperties[] = [
		{
			displayName: 'Salesforce Url',
			name: 'url',
			type: 'string',
			default: '',
			required: true,
			description: 'Salesforce instance URL, e.g. https://mydomain.my.salesforce.com',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			description: 'Consumer Key from Salesforce Connected App',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Consumer Secret from Salesforce Connected App',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const axiosRequestConfig: AxiosRequestConfig = {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			method: 'POST',
			data: new URLSearchParams({
				grant_type: 'client_credentials',
				client_id: credentials.clientId as string,
				client_secret: credentials.clientSecret as string,
			}).toString(),
			url: `${credentials.url as string}/services/oauth2/token`,
			responseType: 'json',
		};
		const result = await axios(axiosRequestConfig);
		const { access_token } = result.data as { access_token: string };

		return {
			...requestOptions,
			headers: {
				...requestOptions.headers,
				Authorization: `Bearer ${access_token}`,
			},
		};
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.url}}',
			url: '/services/oauth2/userinfo',
			method: 'GET',
		},
	};
}
