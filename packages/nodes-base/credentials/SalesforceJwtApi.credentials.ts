import jwt from 'jsonwebtoken';
import moment from 'moment-timezone';
import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';

import { formatPrivateKey } from '@utils/utilities';

import { getTokenRequestClient, TOKEN_REQUEST_TIMEOUT } from './common/token-request';

export class SalesforceJwtApi implements ICredentialType {
	name = 'salesforceJwtApi';

	displayName = 'Salesforce JWT API';

	documentationUrl = 'salesforce';

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
		{
			displayName: 'Instance URL',
			name: 'instanceUrl',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Environment Type',
			name: 'environment',
			type: 'options',
			options: [
				{
					name: 'Production',
					value: 'production',
				},
				{
					name: 'Sandbox',
					value: 'sandbox',
				},
			],
			default: 'production',
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
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				password: true,
				rows: 4,
			},
			default: '',
			required: true,
			description:
				'Use the multiline editor. Make sure it is in standard PEM key format:<br />-----BEGIN PRIVATE KEY-----<br />KEY DATA GOES HERE<br />-----END PRIVATE KEY-----',
		},
		{
			displayName: 'My Domain URL',
			name: 'myDomainUrl',
			type: 'string',
			default: '',
			placeholder: 'https://mycompany.my.salesforce.com',
			description:
				"Your org's My Domain URL (e.g. <code>https://mycompany.my.salesforce.com</code>). Required for Spring '26 and later orgs; leave blank to keep the default audience used by earlier orgs.",
		},
	];

	// Only called when "accessToken" (the expirable property) is empty or expired.
	// Exchanges the signed JWT for an access token once and caches it (together with
	// the instance URL) so chained Salesforce actions reuse the same session instead
	// of logging in on every request.
	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const now = moment().unix();
		const authUrl = resolveAuthUrl(credentials);
		const privateKey = formatPrivateKey(credentials.privateKey as string);
		const signature = jwt.sign(
			{
				iss: credentials.clientId as string,
				sub: credentials.username as string,
				aud: authUrl,
				exp: now + 3 * 60,
			},
			privateKey,
			{
				algorithm: 'RS256',
				header: {
					alg: 'RS256',
				},
			},
		);

		// `myDomainUrl` is a free-form credential string, so gate the token POST on SSRF protection.
		const http = getTokenRequestClient('user-controlled');

		const response = (await http.request({
			url: `${authUrl}/services/oauth2/token`,
			method: 'POST',
			body: new URLSearchParams({
				grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: signature,
			}).toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			json: true,
			timeout: TOKEN_REQUEST_TIMEOUT,
		})) as { access_token?: string; instance_url?: string };

		if (!response.access_token || !response.instance_url) {
			throw new OperationalError(
				'Salesforce JWT authentication did not return an access token and instance URL',
			);
		}

		return { accessToken: response.access_token, instanceUrl: response.instance_url };
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			...requestOptions.headers,
			Authorization: `Bearer ${credentials.accessToken as string}`,
		};

		// Node requests pass a relative URL and rely on the cached instance URL as base.
		// The credential test supplies its own baseURL (the login/My Domain URL), which
		// must be left untouched.
		if (!requestOptions.baseURL && credentials.instanceUrl) {
			requestOptions.baseURL = credentials.instanceUrl as string;
		}

		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials?.myDomainUrl ? $credentials.myDomainUrl.replace(/\\/$/, "") : ($credentials?.environment === "sandbox" ? "https://test.salesforce.com" : "https://login.salesforce.com")}}',
			url: '/services/oauth2/userinfo',
			method: 'GET',
		},
	};
}

export function resolveAuthUrl(credentials: ICredentialDataDecryptedObject): string {
	const myDomainUrl = ((credentials.myDomainUrl as string | undefined) ?? '').replace(/\/$/, '');
	if (myDomainUrl) {
		return myDomainUrl;
	}
	return credentials.environment === 'sandbox'
		? 'https://test.salesforce.com'
		: 'https://login.salesforce.com';
}
