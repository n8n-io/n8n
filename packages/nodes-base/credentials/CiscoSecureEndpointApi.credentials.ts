import {
	getCredentialOwnRequestAllowedDomains,
	UserError,
	type ICredentialDataDecryptedObject,
	type ICredentialTestRequest,
	type ICredentialType,
	type IHttpRequestOptions,
	type INodeProperties,
} from 'n8n-workflow';

import { getTokenRequestClient, TOKEN_REQUEST_TIMEOUT } from './common/token-request';

// `region` is interpolated into the token-exchange host, so the stored value must stay
// inside this fixed set. The options field and the runtime check both read it from here.
const REGION_OPTIONS = [
	{ name: 'Asia Pacific, Japan, and China', value: 'apjc.amp' },
	{ name: 'Europe', value: 'eu.amp' },
	{ name: 'North America', value: 'amp' },
] as const;
type Region = (typeof REGION_OPTIONS)[number]['value'];

function assertSupportedRegion(region: unknown): asserts region is Region {
	if (typeof region !== 'string' || !REGION_OPTIONS.some((option) => option.value === region)) {
		throw new UserError('Unsupported Cisco Secure Endpoint region');
	}
}

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
			options: [...REGION_OPTIONS],
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
		const region = credentials.region;

		assertSupportedRegion(region);

		// `region` is interpolated into the request host, so gate the token POSTs on SSRF protection.
		const http = getTokenRequestClient('user-controlled');
		// Apply the credential's own allow-list to the token requests it issues.
		const allowedDomains = getCredentialOwnRequestAllowedDomains(credentials);

		const secureXToken = (await http.request({
			url: `https://visibility.${region}.cisco.com/iroh/oauth2/token`,
			method: 'POST',
			auth: {
				username: clientId,
				password: clientSecret,
			},
			body: new URLSearchParams({
				grant_type: 'client_credentials',
			}).toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
			json: true,
			timeout: TOKEN_REQUEST_TIMEOUT,
			allowedDomains,
		})) as { access_token: string };

		const secureEndpointToken = (await http.request({
			url: `https://api.${region}.cisco.com/v3/access_tokens`,
			method: 'POST',
			body: new URLSearchParams({
				grant_type: 'client_credentials',
			}).toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
				Authorization: `Bearer ${secureXToken.access_token}`,
			},
			json: true,
			timeout: TOKEN_REQUEST_TIMEOUT,
			allowedDomains,
		})) as { access_token: string };

		const requestOptionsWithAuth: IHttpRequestOptions = {
			...requestOptions,
			headers: {
				...requestOptions.headers,
				Authorization: `Bearer ${secureEndpointToken.access_token}`,
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
