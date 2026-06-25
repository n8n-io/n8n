import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INodeProperties,
	Icon,
} from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';

import { getTokenRequestClient, TOKEN_REQUEST_TIMEOUT } from './common/token-request';

const DEFAULT_GRAPH_API_BASE_URL = 'https://graph.microsoft.com';
const DEFAULT_LOGIN_HOST = 'https://login.microsoftonline.com';

// A `tenantId` is either a GUID or a verified domain (e.g. `contoso.onmicrosoft.com`).
// Anything carrying `/ \ @ ? #` or whitespace is rejected so it cannot reshape the
// token URL path or turn into a confusing Microsoft 400.
const TENANT_ID_GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
const TENANT_ID_DOMAIN = /^[A-Za-z0-9.-]+$/;

// The login/token host is derived from the selected cloud so a sovereign tenant
// authenticates against the matching sovereign login host. All values are fixed
// Microsoft hosts chosen via the `graphApiBaseUrl` enum, which keeps the token POST
// on the `fixed-vendor` (SSRF-exempt) path.
const LOGIN_HOSTS_BY_GRAPH_URL: Record<string, string> = {
	'https://graph.microsoft.com': 'https://login.microsoftonline.com',
	'https://graph.microsoft.us': 'https://login.microsoftonline.us',
	'https://dod-graph.microsoft.us': 'https://login.microsoftonline.us',
	'https://microsoftgraph.chinacloudapi.cn': 'https://login.partner.microsoftonline.cn',
};

interface TokenResponse {
	access_token?: string;
	token_type?: string;
	expires_in?: number;
}

function hasAccessToken(response: unknown): response is TokenResponse & { access_token: string } {
	return (
		typeof response === 'object' &&
		response !== null &&
		typeof (response as { access_token?: unknown }).access_token === 'string' &&
		(response as { access_token: string }).access_token.length > 0
	);
}

// Reads + trims the credential fields the token exchange depends on. Pasted IDs
// often carry whitespace, so trimming happens once here.
function readCredentials(credentials: ICredentialDataDecryptedObject) {
	const stringOrEmpty = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
	return {
		authentication: stringOrEmpty(credentials.authentication) || 'clientSecret',
		tenantId: stringOrEmpty(credentials.tenantId),
		clientId: stringOrEmpty(credentials.clientId),
		clientSecret: stringOrEmpty(credentials.clientSecret),
		graphApiBaseUrl: stringOrEmpty(credentials.graphApiBaseUrl),
	};
}

/**
 * Exchanges the application credentials for a Microsoft Graph access token via the
 * OAuth2 `client_credentials` grant and returns the raw `access_token`.
 *
 * Exported for unit testing. Validation runs before any network call.
 */
export async function getAccessToken(credentials: ICredentialDataDecryptedObject): Promise<string> {
	const { authentication, tenantId, clientId, clientSecret, graphApiBaseUrl } =
		readCredentials(credentials);

	// Defense beyond the `required: true` UI gate — a programmatically-set credential
	// could omit these and build a malformed `.../undefined/oauth2/...` URL.
	if (!tenantId || !clientId || !clientSecret) {
		throw new OperationalError('Microsoft Entra credentials are incomplete');
	}

	// Keep the rejection generic — never echo the value.
	if (!TENANT_ID_GUID.test(tenantId) && !TENANT_ID_DOMAIN.test(tenantId)) {
		throw new OperationalError('Microsoft Entra tenant ID is not a valid GUID or domain');
	}

	// Normalize a trailing slash before the map lookup so a stored `.../` value does
	// not silently fall back to the global login host while the test hits a sovereign base.
	const normalizedBaseUrl = graphApiBaseUrl.replace(/\/+$/, '');

	// `graphApiBaseUrl` is a UI-only enum, but an API-created credential can carry an
	// arbitrary value. Reject any unrecognized non-empty cloud so a valid Graph token is
	// never minted for (and later attached to) a host outside the known Microsoft clouds.
	// An empty value means the global cloud and stays allowed.
	if (normalizedBaseUrl && !Object.hasOwn(LOGIN_HOSTS_BY_GRAPH_URL, normalizedBaseUrl)) {
		throw new OperationalError(
			'Microsoft Entra Graph API base URL is not a recognized Microsoft cloud',
		);
	}

	const loginHost = LOGIN_HOSTS_BY_GRAPH_URL[normalizedBaseUrl] ?? DEFAULT_LOGIN_HOST;
	const tokenUrl = `${loginHost}/${tenantId}/oauth2/v2.0/token`;

	// App-only `client_credentials` cannot request granular scopes — the scope is always
	// `<resource>/.default`, where the resource is the validated cloud's Graph endpoint (so
	// a sovereign cloud mints a sovereign-audience token). Granted permissions come from
	// admin consent on the app registration, not from this request.
	const resource = normalizedBaseUrl || DEFAULT_GRAPH_API_BASE_URL;
	const scope = `${resource}/.default`;

	const body = new URLSearchParams({
		grant_type: 'client_credentials',
		client_id: clientId,
		scope,
	});

	// Branch point for ENT-86: certificate auth appends `client_assertion_type` +
	// `client_assertion` (x5t) here. No crypto imports until then.
	if (authentication === 'certificate') {
		// ENT-86 placeholder — intentionally not implemented in Phase 1.
	} else {
		body.append('client_secret', clientSecret);
	}

	// `loginHost` is a fixed Microsoft host and `tenantId` is a validated path segment,
	// so the origin is not user-controlled — `fixed-vendor` keeps the SSRF guard off.
	const http = getTokenRequestClient('fixed-vendor');

	const response = await http.request({
		url: tokenUrl,
		method: 'POST',
		body: body.toString(),
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		json: true,
		timeout: TOKEN_REQUEST_TIMEOUT,
	});

	// Static message only — an AADSTS error body can carry correlation IDs / reflected
	// material, so never interpolate or log the response, body, or credentials.
	if (!hasAccessToken(response)) {
		throw new OperationalError('Microsoft Entra authentication did not return an access token');
	}

	return response.access_token;
}

export class MicrosoftEntraServicePrincipalApi implements ICredentialType {
	name = 'microsoftEntraServicePrincipalApi';

	displayName = 'Microsoft Entra Service Principal';

	documentationUrl = 'microsoftentra';

	icon: Icon = 'file:icons/Microsoft.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
		// ENT-86 flips this to `type: 'options'` and adds the `certificate` value — the
		// field `name` and the stored value stay constant, so existing credentials keep
		// working unchanged (no migration). `clientSecret`/(future)`certificate` fields
		// gate on it via `displayOptions`.
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'clientSecret',
		},
		{
			displayName:
				'App-only access uses application permissions that an admin must consent to on the app registration. The connection test reads the organization via Microsoft Graph, so the app needs Organization.Read.All (or Directory.Read.All) for the test to pass.',
			name: 'setupNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Directory (Tenant) ID',
			name: 'tenantId',
			type: 'string',
			default: '',
			required: true,
			description:
				'The Directory (tenant) ID from your app registration overview in the Microsoft Entra admin center',
		},
		{
			displayName: 'Application (Client) ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			description: 'The Application (client) ID from your app registration overview',
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
			displayOptions: {
				show: {
					authentication: ['clientSecret'],
				},
			},
			description: 'A client secret created under Certificates & secrets',
		},
		{
			displayName: 'Microsoft Graph API Base URL',
			name: 'graphApiBaseUrl',
			type: 'options',
			options: [
				{ name: 'Global (https://graph.microsoft.com)', value: 'https://graph.microsoft.com' },
				{ name: 'US Government (https://graph.microsoft.us)', value: 'https://graph.microsoft.us' },
				{
					name: 'US Government DOD (https://dod-graph.microsoft.us)',
					value: 'https://dod-graph.microsoft.us',
				},
				{
					name: 'China (https://microsoftgraph.chinacloudapi.cn)',
					value: 'https://microsoftgraph.chinacloudapi.cn',
				},
			],
			default: DEFAULT_GRAPH_API_BASE_URL,
			description: 'Select the endpoint for your Microsoft cloud environment.',
		},
	];

	// Only called when "accessToken" (the expirable property) is empty, on a 401 retry,
	// or during a credential test. Core drives expiry refresh through its 401 retry path,
	// so we deliberately do not persist `expires_in` or run a credential-side TTL.
	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const accessToken = await getAccessToken(credentials);
		return { accessToken };
	}

	// Pure mapper: attach the cached bearer token only. There is no dynamic instance URL,
	// so no baseURL is set here — the test supplies its own and future nodes set theirs.
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			...requestOptions.headers,
			Authorization: `Bearer ${credentials.accessToken as string}`,
		};

		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.graphApiBaseUrl || "https://graph.microsoft.com"}}',
			url: '/v1.0/organization',
			method: 'GET',
		},
	};
}
