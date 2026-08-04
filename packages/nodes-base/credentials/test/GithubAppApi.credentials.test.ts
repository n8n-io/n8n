import jwt from 'jsonwebtoken';
import type { ICredentialDataDecryptedObject, IHttpRequestHelper } from 'n8n-workflow';

import { GithubAppApi } from '../GithubAppApi.credentials';
import type { Mock } from 'vitest';

vi.mock('jsonwebtoken', () => ({
	default: { sign: vi.fn() },
}));

vi.mock('@n8n/utils/format-pem-block', () => ({
	formatPemBlock: (key: string) => key,
}));

describe('GithubAppApi Credential', () => {
	const credential = new GithubAppApi();
	const mockedSign = jwt.sign as unknown as Mock;
	const baseCredentials: ICredentialDataDecryptedObject = {
		server: 'https://api.github.com/',
		appId: '12345',
		installationId: '98765',
		privateKey: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
	};

	beforeEach(() => {
		mockedSign.mockReset();
		mockedSign.mockReturnValue('signed-jwt');
	});

	it('should have correct properties', () => {
		expect(credential.name).toBe('githubAppApi');
		expect(credential.displayName).toBe('GitHub App API');
		expect(credential.documentationUrl).toBe('github');
		expect(credential.test.request.baseURL).toBe('={{$credentials?.server}}');
		expect(credential.test.request.url).toBe('/installation/repositories');
	});

	describe('preAuthentication', () => {
		it('should create app JWT and return installation access token', async () => {
			const httpRequest = vi.fn().mockResolvedValue({ token: 'ghs_installation_token' });
			const helper = {
				helpers: { httpRequest },
			} as unknown as IHttpRequestHelper;

			const result = await credential.preAuthentication.call(helper, baseCredentials);

			expect(mockedSign).toHaveBeenCalledWith(
				expect.objectContaining({ iss: '12345' }),
				expect.any(String),
				expect.objectContaining({ algorithm: 'RS256' }),
			);
			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: 'https://api.github.com/app/installations/98765/access_tokens',
					headers: expect.objectContaining({
						Authorization: 'Bearer signed-jwt',
						Accept: 'application/vnd.github+json',
						'X-GitHub-Api-Version': '2022-11-28',
					}),
					json: true,
				}),
			);
			expect(result.accessToken).toBe('ghs_installation_token');
		});

		it('should throw a clear error when JWT creation fails', async () => {
			const httpRequest = vi.fn();
			const helper = {
				helpers: { httpRequest },
			} as unknown as IHttpRequestHelper;
			mockedSign.mockImplementationOnce(() => {
				throw new Error('invalid key');
			});

			await expect(credential.preAuthentication.call(helper, baseCredentials)).rejects.toThrow(
				'Failed to create GitHub App JWT. Verify that App ID and Private Key are valid.',
			);
			expect(httpRequest).not.toHaveBeenCalled();
		});

		it('should include status code and API message when token request fails', async () => {
			const httpRequest = vi.fn().mockRejectedValue({
				response: {
					statusCode: 401,
					body: { message: 'Bad credentials' },
				},
			});
			const helper = {
				helpers: { httpRequest },
			} as unknown as IHttpRequestHelper;

			await expect(credential.preAuthentication.call(helper, baseCredentials)).rejects.toThrow(
				'Failed to get GitHub App installation token (401): Bad credentials',
			);
		});

		it('should throw when GitHub response has no token', async () => {
			const httpRequest = vi.fn().mockResolvedValue({});
			const helper = {
				helpers: { httpRequest },
			} as unknown as IHttpRequestHelper;

			await expect(credential.preAuthentication.call(helper, baseCredentials)).rejects.toThrow(
				'GitHub did not return an installation token. Check App and Installation IDs.',
			);
		});
	});
});
