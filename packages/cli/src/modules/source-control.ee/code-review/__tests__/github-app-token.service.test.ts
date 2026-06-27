import { UserError } from 'n8n-workflow';

import { GitHubAppTokenService } from '../auth/github-app-token.service.ee';

jest.mock('jsonwebtoken', () => ({
	__esModule: true,
	default: { sign: jest.fn().mockReturnValue('app.jwt.token') },
}));

describe('GitHubAppTokenService', () => {
	const params = {
		apiBaseUrl: 'https://api.github.com',
		appId: '123456',
		privateKey: '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----',
		owner: 'acme',
		repo: 'flows',
	};

	const futureIso = () => new Date(Date.now() + 3_600_000).toISOString();

	let service: GitHubAppTokenService;

	beforeEach(() => {
		service = new GitHubAppTokenService();
	});

	afterEach(() => jest.restoreAllMocks());

	const mockFetchSequence = (responses: Array<{ status: number; body: unknown }>) => {
		const fetchMock = jest.fn();
		responses.forEach(({ status, body }) =>
			fetchMock.mockResolvedValueOnce({ status, json: async () => body } as Response),
		);
		global.fetch = fetchMock as unknown as typeof fetch;
		return fetchMock;
	};

	it('discovers the installation and mints an installation token', async () => {
		const fetchMock = mockFetchSequence([
			{ status: 200, body: { id: 42 } },
			{ status: 201, body: { token: 'ghs_installation', expires_at: futureIso() } },
		]);

		const token = await service.getInstallationToken(params);

		expect(token).toBe('ghs_installation');
		// 1) GET installation, 2) POST access_tokens
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/acme/flows/installation');
		expect(fetchMock.mock.calls[1][0]).toBe(
			'https://api.github.com/app/installations/42/access_tokens',
		);
		expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
			Authorization: 'Bearer app.jwt.token',
		});
	});

	it('reuses the cached token until it nears expiry', async () => {
		const fetchMock = mockFetchSequence([
			{ status: 200, body: { id: 42 } },
			{ status: 201, body: { token: 'ghs_installation', expires_at: futureIso() } },
		]);

		const first = await service.getInstallationToken(params);
		const second = await service.getInstallationToken(params);

		expect(first).toBe(second);
		// No additional requests on the second call.
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('throws a UserError when the App credentials are rejected', async () => {
		mockFetchSequence([{ status: 401, body: { message: 'Bad credentials' } }]);

		await expect(service.getInstallationToken(params)).rejects.toThrow(UserError);
	});

	it('throws a UserError when the App is not installed on the repo', async () => {
		mockFetchSequence([{ status: 404, body: { message: 'Not Found' } }]);

		await expect(service.getInstallationToken(params)).rejects.toThrow(UserError);
	});
});
