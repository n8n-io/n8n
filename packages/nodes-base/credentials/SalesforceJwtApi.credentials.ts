import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import jwt from 'jsonwebtoken';
import moment from 'moment-timezone';

import { formatPrivateKey } from '@utils/utilities';
import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

const TOKEN_REQUEST_TIMEOUT = 30_000;

export class SalesforceJwtApi implements ICredentialType {
	name = 'salesforceJwtApi';

	displayName = 'Salesforce JWT API';

	documentationUrl = 'salesforce';

	properties: INodeProperties[] = [
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

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
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
		const http = Container.get(OutboundHttp).requests({
			ssrf: Container.get(SsrfProtectionConfig).enabled
				? Container.get(SsrfProtectionService)
				: 'disabled',
		});

		const { access_token } = (await http.request({
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
		})) as { access_token: string };

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
