import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

import axios from 'axios';

export class CiscoSecureEndpointApi implements ICredentialType {
	name = 'ciscoSecureEndpointApi';

	displayName = 'Cisco Secure Endpoint (AMP) API';

	documentationUrl = 'ciscosecureendpoint';

	icon = { light: 'file:icons/Cisco.svg', dark: 'file:icons/Cisco.dark.svg' } as const;

	httpRequestNode = {
		name: 'Cisco Secure Endpoint',
		docsUrl: 'https://developer.cisco.com/docs/secure-endpoint/',
		apiBaseUrl: '',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			options: [
				{
					name: 'Asia Pacific, Japan, and China',
					value: 'apjc.amp',
				},
				{
					name: 'Europe',
					value: 'eu.amp',
				},
				{
					name: 'North America',
					value: 'amp',
				},
			],
			default: 'amp',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
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
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const clientId = credentials.clientId as string;
		const clientSecret = credentials.clientSecret as string;
		const region = credentials.region as string;

		const secureXToken = await axios({
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
			auth: {
				username: clientId,
				password: clientSecret,
			},
			method: 'POST',
			data: new URLSearchParams({
				grant_type: 'client_credentials',
			}).toString(),
			url: `https://visibility.${region}.cisco.com/iroh/oauth2/token`,
		});

		const secureEndpointToken = await axios({
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
				Authorization: `Bearer ${secureXToken.data.access_token}`,
			},
			method: 'POST',
			data: new URLSearchParams({
				grant_type: 'client_credentials',
			}).toString(),
			url: `https://api.${region}.cisco.com/v3/access_tokens`,
		});

		const requestOptionsWithAuth: IHttpRequestOptions = {
			...requestOptions,
			headers: {
				...requestOptions.headers,
				Authorization: `Bearer ${secureEndpointToken.data.access_token}`,
			},
		};

		return requestOptionsWithAuth;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://api.{{$credentials.region}}.cisco.com',
			url: '/v3/organizations',
			qs: {
				size: 10,
			},
		},
	};
}
