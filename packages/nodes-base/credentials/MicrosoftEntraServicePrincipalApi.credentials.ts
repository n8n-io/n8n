import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

import { formatPrivateKey } from '../utils/utilities';

const TOKEN_HOST = 'https://login.microsoftonline.com';

/**
 * Acquires an app-only Microsoft Graph access token using the OAuth2
 * `client_credentials` grant. Supports both service-principal auth methods:
 *
 *  - Client secret: posts the secret directly.
 *  - Certificate: signs a short-lived `client_assertion` JWT (RS256) whose `x5t`
 *    header (base64url of the cert's SHA-1 thumbprint) tells Entra which uploaded
 *    certificate to validate against.
 *
 * Note: `client_credentials` cannot request granular scopes — it always asks for
 * `<resource>/.default` and receives whatever application permissions an admin
 * has consented to for the app.
 */
async function getAccessToken(credentials: ICredentialDataDecryptedObject): Promise<string> {
	const tenantId = (credentials.tenantId as string).trim();
	const clientId = (credentials.clientId as string).trim();
	const tokenUrl = `${TOKEN_HOST}/${tenantId}/oauth2/v2.0/token`;
	const scope =
		((credentials.scope as string) || '').trim() || 'https://graph.microsoft.com/.default';

	const body = new URLSearchParams({
		client_id: clientId,
		scope,
		grant_type: 'client_credentials',
	});

	if (credentials.authentication === 'certificate') {
		const privateKey = formatPrivateKey(credentials.privateKey as string);
		const certificate = formatPrivateKey(credentials.certificate as string);
		const x5t = crypto
			.createHash('sha1')
			.update(new crypto.X509Certificate(certificate).raw)
			.digest('base64url');

		const now = Math.floor(Date.now() / 1000);
		const clientAssertion = jwt.sign(
			{
				aud: tokenUrl,
				iss: clientId,
				sub: clientId,
				jti: crypto.randomUUID(),
				iat: now,
				nbf: now,
				exp: now + 300,
			},
			privateKey,
			{ algorithm: 'RS256', header: { alg: 'RS256', typ: 'JWT', x5t } },
		);

		body.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
		body.append('client_assertion', clientAssertion);
	} else {
		body.append('client_secret', (credentials.clientSecret as string).trim());
	}

	const axiosRequestConfig: AxiosRequestConfig = {
		method: 'POST',
		url: tokenUrl,
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		data: body.toString(),
	};

	const result = await axios(axiosRequestConfig);
	return result.data.access_token as string;
}

export class MicrosoftEntraServicePrincipalApi implements ICredentialType {
	name = 'microsoftEntraServicePrincipalApi';

	displayName = 'Microsoft Entra Service Principal API';

	documentationUrl = 'microsoft';

	icon: Icon = 'file:icons/Microsoft.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{ name: 'Client Secret', value: 'clientSecret' },
				{ name: 'Certificate', value: 'certificate' },
			],
			default: 'clientSecret',
		},
		{
			displayName: 'Directory (Tenant) ID',
			name: 'tenantId',
			type: 'string',
			default: '',
			required: true,
			description: 'The Directory (tenant) ID from the Entra app registration overview',
		},
		{
			displayName: 'Application (Client) ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			description: 'The Application (client) ID from the Entra app registration overview',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: { show: { authentication: ['clientSecret'] } },
			description: 'A client secret created under Certificates & secrets → Client secrets',
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			placeholder: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
			displayOptions: { show: { authentication: ['certificate'] } },
			description: 'The PEM private key matching the certificate uploaded to Entra',
		},
		{
			displayName: 'Certificate',
			name: 'certificate',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			placeholder: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
			displayOptions: { show: { authentication: ['certificate'] } },
			description:
				'The public certificate (PEM) uploaded to Entra. Used to compute the x5t thumbprint so Entra can validate the signed assertion.',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: 'https://graph.microsoft.com/.default',
			description:
				'Resource scope. App-only must use the <resource>/.default form; the actual permissions come from admin-consented application permissions.',
		},
		{
			displayName: 'Microsoft Graph Base URL',
			name: 'graphApiBaseUrl',
			type: 'string',
			default: 'https://graph.microsoft.com',
			description: 'Override for sovereign clouds (e.g. GCC High, China)',
		},
		{
			displayName: 'User (UPN or ID)',
			name: 'userId',
			type: 'string',
			default: '',
			placeholder: 'user@contoso.com',
			description:
				'App-only has no signed-in user, so user-centric nodes (e.g. OneDrive) target this user instead of /me. The app needs the matching application permission (e.g. Files.Read.All).',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const accessToken = await getAccessToken(credentials);
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
			baseURL: '={{$credentials.graphApiBaseUrl || "https://graph.microsoft.com"}}',
			// If a user is configured, validate the realistic app-only path (uses the
			// same Files.Read.All the consuming node needs). Otherwise fall back to a
			// directory read (needs Organization.Read.All / Directory.Read.All).
			url: '={{$credentials.userId ? ("/v1.0/users/" + $credentials.userId + "/drive") : "/v1.0/organization"}}',
		},
	};
}
