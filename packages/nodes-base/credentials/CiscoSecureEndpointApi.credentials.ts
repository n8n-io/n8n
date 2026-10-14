import axios from 'axios';
import {
	getCredentialAllowedDomains,
	isDomainAllowed,
	UserError,
	type ICredentialDataDecryptedObject,
	type ICredentialTestRequest,
	type ICredentialType,
	type IHttpRequestOptions,
	type INodeProperties,
} from 'n8n-workflow';

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

		// These token POSTs go through axios directly, so apply the credential's own
		// allow-list to each request host instead of relying on the node HTTP layer.
		const allowedDomains = getCredentialAllowedDomains(credentials);
		if (credentials.allowedHttpRequestDomains === 'domains' && !allowedDomains) {
			throw new UserError(
				'No allowed domains specified. Configure allowed domains or change restriction setting.',
			);
		}
		const assertHostAllowed = (url: string) => {
			if (allowedDomains && !isDomainAllowed(url, { allowedDomains })) {
				throw new UserError(
					`Domain not allowed: This credential is restricted from accessing ${new URL(url).host}. Only the following domains are allowed: ${allowedDomains}`,
				);
			}
		};
		// axios follows redirects on its own, so re-check each redirect target against the
		// allow-list, not only the initial URL.
		const beforeRedirect = (redirectedRequest: { href?: string }) => {
			if (redirectedRequest.href) assertHostAllowed(redirectedRequest.href);
		};

		const secureXTokenUrl = `https://visibility.${region}.cisco.com/iroh/oauth2/token`;
		assertHostAllowed(secureXTokenUrl);

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
			url: secureXTokenUrl,
			beforeRedirect,
		});

		const secureEndpointTokenUrl = `https://api.${region}.cisco.com/v3/access_tokens`;
		assertHostAllowed(secureEndpointTokenUrl);

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
			url: secureEndpointTokenUrl,
			beforeRedirect,
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
