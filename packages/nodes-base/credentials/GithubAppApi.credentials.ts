import { formatPemBlock } from '@n8n/utils';
import jwt from 'jsonwebtoken';
import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

export class GithubAppApi implements ICredentialType {
	name = 'githubAppApi';

	displayName = 'GitHub App API';

	documentationUrl = 'github';

	properties: INodeProperties[] = [
		{
			displayName: 'GitHub Server',
			name: 'server',
			type: 'string',
			default: 'https://api.github.com',
			description: 'The server to connect to. Only has to be set if Github Enterprise is used.',
		},
		{
			displayName: 'App ID or Client ID',
			name: 'appId',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Installation ID',
			name: 'installationId',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'PEM private key from the GitHub App',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
	];

	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	): Promise<ICredentialDataDecryptedObject> {
		const now = Math.floor(Date.now() / 1000);
		const baseUrl = String(credentials.server ?? 'https://api.github.com').replace(/\/$/, '');
		const privateKey = formatPemBlock(credentials.privateKey as string);

		let appJwt: string;
		try {
			appJwt = jwt.sign(
				{
					iat: now - 60,
					exp: now + 9 * 60,
					iss: credentials.appId,
				},
				privateKey,
				{ algorithm: 'RS256' },
			);
		} catch {
			throw new Error(
				'Failed to create GitHub App JWT. Verify that App ID and Private Key are valid.',
			);
		}

		let response;
		try {
			response = await this.helpers.httpRequest({
				method: 'POST',
				url: `${baseUrl}/app/installations/${credentials.installationId}/access_tokens`,
				headers: {
					Authorization: `Bearer ${appJwt}`,
					Accept: 'application/vnd.github+json',
					'X-GitHub-Api-Version': '2022-11-28',
				},
				json: true,
			});
		} catch (error: unknown) {
			const err = error as { response?: { statusCode?: number; body?: { message?: string } } };
			const statusCode = err.response?.statusCode;
			const message = err.response?.body?.message;
			throw new Error(
				`Failed to get GitHub App installation token${statusCode ? ` (${statusCode})` : ''}${message ? `: ${message}` : ''}`,
			);
		}

		if (typeof response?.token !== 'string' || response.token.length === 0) {
			throw new Error(
				'GitHub did not return an installation token. Check App and Installation IDs.',
			);
		}

		return {
			...credentials,
			accessToken: response.token,
		};
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
				Accept: 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.server}}',
			url: '/installation/repositories',
		},
	};
}
