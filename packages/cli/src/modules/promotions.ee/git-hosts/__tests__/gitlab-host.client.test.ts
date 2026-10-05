import { mockLogger } from '@n8n/backend-test-utils';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ServiceUnavailableError } from '@n8n/errors';

import { GitLabHostClient } from '../gitlab-host.client';

describe('GitLabHostClient', () => {
	const http = mock<HttpRequestClient>();
	const outboundHttp = mock<OutboundHttp>();
	const logger = mockLogger();
	let client: GitLabHostClient;

	const access = {
		baseUrl: 'https://gitlab.example.com',
		username: 'n8n',
		accessToken: 'glpat-token',
	};
	const firstPage = { offset: 0, limit: 20 };
	const project = {
		id: 7,
		name: 'api',
		path_with_namespace: 'platform/api',
		http_url_to_repo: 'https://gitlab.example.com/platform/api.git',
		ssh_url_to_repo: 'git@gitlab.example.com:platform/api.git',
	};

	const respond = (statusCode: number, body: unknown, headers: Record<string, string> = {}) =>
		http.request.mockResolvedValueOnce({ statusCode, body, headers });

	const lastRequest = () => http.request.mock.calls.at(-1)?.[0];

	beforeEach(() => {
		vi.resetAllMocks();
		outboundHttp.requests.mockReturnValue(http);
		client = new GitLabHostClient(outboundHttp, logger);
	});

	it('opts out of the default SSRF policy, because an admin sets the base URL', () => {
		expect(outboundHttp.requests).toHaveBeenCalledWith({ useDefaultSsrfPolicy: 'unsafe' });
	});

	it('lists the projects the token is a member of, with their HTTPS remote', async () => {
		respond(200, [project], { 'x-next-page': '' });

		const page = await client.listRepositories(access, firstPage);

		expect(page).toEqual({
			repositories: [
				{
					id: '7',
					fullPath: 'platform/api',
					remoteUrl: 'https://gitlab.example.com/platform/api.git',
				},
			],
			hasNextPage: false,
		});
		expect(lastRequest()).toMatchObject({
			method: 'GET',
			url: 'https://gitlab.example.com/api/v4/projects',
			headers: { 'PRIVATE-TOKEN': 'glpat-token' },
			qs: { membership: true, archived: false, per_page: 20, page: 1 },
		});
	});

	it('validates authentication and API read access even when there are no projects', async () => {
		respond(200, { id: 12 });
		respond(200, []);

		await expect(client.validateAccess(access)).resolves.toBeUndefined();

		expect(http.request).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ url: 'https://gitlab.example.com/api/v4/user' }),
		);
		expect(lastRequest()?.qs).toMatchObject({ per_page: 1, page: 1 });
	});

	it('rejects an unauthenticated user response before listing projects', async () => {
		respond(200, '<html>Sign in</html>');

		await expect(client.validateAccess(access)).rejects.toThrow(
			'GitLab returned an unexpected response',
		);
		expect(http.request).toHaveBeenCalledTimes(1);
	});

	it('rejects credentials without API read access', async () => {
		respond(200, { id: 12 });
		respond(403, { message: 'Forbidden' });

		await expect(client.validateAccess(access)).rejects.toThrow('read_api scope');
	});

	it('reports certificate failures without exposing the request', async () => {
		http.request.mockRejectedValueOnce(
			Object.assign(new Error('token: glpat-token'), {
				cause: { code: 'SELF_SIGNED_CERT_IN_CHAIN' },
			}),
		);

		await expect(client.validateAccess(access)).rejects.toThrow(
			'configure a trusted certificate authority',
		);
	});

	it('does not follow a redirect', async () => {
		respond(302, '', { location: 'https://other.example.com' });

		await expect(client.validateAccess(access)).rejects.toThrow('Use the final GitLab URL');
		expect(lastRequest()).toMatchObject({ disableFollowRedirect: true });
	});

	it('turns the offset into a page number and reports a next page', async () => {
		respond(200, [project], { 'x-next-page': '4' });

		const page = await client.listRepositories(access, { offset: 60, limit: 20 });

		expect(page.hasNextPage).toBe(true);
		expect(lastRequest()?.qs).toMatchObject({ page: 4, per_page: 20 });
	});

	it('searches names and namespaces only when there is search text', async () => {
		respond(200, []);
		await client.listRepositories(access, { ...firstPage, search: 'platform' });
		expect(lastRequest()?.qs).toMatchObject({ search: 'platform', search_namespaces: true });

		respond(200, []);
		await client.listRepositories(access, firstPage);
		expect(lastRequest()?.qs).not.toHaveProperty('search');
	});

	it('keeps a subpath in the base URL', async () => {
		respond(200, []);

		await client.listRepositories({ ...access, baseUrl: 'https://example.com/gitlab/' }, firstPage);

		expect(lastRequest()?.url).toBe('https://example.com/gitlab/api/v4/projects');
	});

	it.each([
		[401, BadRequestError, 'GitLab rejected the access token'],
		[403, BadRequestError, 'read_api scope'],
		[404, BadRequestError, 'No GitLab API was found'],
		[429, ServiceUnavailableError, 'GitLab is not available'],
		[502, ServiceUnavailableError, 'GitLab is not available'],
	])('explains a %i response', async (status, errorClass, text) => {
		respond(status, { message: 'error' });

		const result = client.listRepositories(access, firstPage);

		await expect(result).rejects.toThrow(errorClass);
		await expect(result).rejects.toThrow(text);
	});

	it('reports an unreachable host as unavailable', async () => {
		http.request.mockRejectedValue(Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }));

		await expect(client.listRepositories(access, firstPage)).rejects.toThrow(
			ServiceUnavailableError,
		);
		expect(http.request).toHaveBeenCalledTimes(2);
		expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
			'GitLab request failed before a response (ECONNREFUSED)',
			{ path: 'projects' },
		);
	});

	it('retries one connection reset and returns the repositories', async () => {
		http.request.mockRejectedValueOnce(
			Object.assign(new Error('socket closed'), { code: 'ECONNRESET' }),
		);
		respond(200, [project]);

		await expect(client.listRepositories(access, firstPage)).resolves.toMatchObject({
			repositories: [{ fullPath: 'platform/api' }],
		});
		expect(http.request).toHaveBeenCalledTimes(2);
		expect(vi.mocked(logger.warn)).not.toHaveBeenCalled();
	});

	it('reports a timeout after one retry', async () => {
		http.request.mockRejectedValue(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }));

		await expect(client.listRepositories(access, firstPage)).rejects.toThrow(
			'The GitLab request timed out',
		);
		expect(http.request).toHaveBeenCalledTimes(2);
	});

	it('reports a missing hostname without retrying', async () => {
		http.request.mockRejectedValueOnce(Object.assign(new Error('lookup'), { code: 'ENOTFOUND' }));

		await expect(client.listRepositories(access, firstPage)).rejects.toThrow(
			'n8n server DNS settings',
		);
		expect(http.request).toHaveBeenCalledTimes(1);
	});

	it('does not put unknown codes, headers, or error messages in the log', async () => {
		http.request.mockRejectedValueOnce(
			Object.assign(new Error(access.accessToken), {
				code: access.accessToken,
				headers: { 'PRIVATE-TOKEN': access.accessToken },
			}),
		);

		await expect(client.listRepositories(access, firstPage)).rejects.toThrow(
			'Could not complete the GitLab API request',
		);
		expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain(access.accessToken);
		expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
			'GitLab request failed before a response (UNKNOWN)',
			{ path: 'projects' },
		);
	});

	it('rejects a response that is not a GitLab project list', async () => {
		respond(200, '<html>Sign in</html>');

		await expect(client.listRepositories(access, firstPage)).rejects.toThrow(
			'GitLab returned an unexpected response',
		);
	});

	it.each([
		'not-a-url',
		'https://bot:secret@gitlab.example.com/platform/api.git',
		'https://gitlab.example.com/platform/api.git?token=example',
		'https://gitlab.example.com/platform/api.git\nextra',
	])('rejects an invalid clone URL: %s', async (remoteUrl) => {
		respond(200, [{ ...project, http_url_to_repo: remoteUrl }]);

		await expect(client.listRepositories(access, firstPage)).rejects.toThrow(
			'GitLab returned an unexpected response',
		);
	});
});
