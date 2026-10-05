import { mockLogger } from '@n8n/backend-test-utils';
import { OutboundHttp, type SsrfProtectionService } from '@n8n/backend-network';
import type { SsrfProtectionConfig } from '@n8n/config';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import { GitLabHostClient } from '../gitlab-host.client';

describe('GitLab API transport', () => {
	const logger = mockLogger();
	const outboundHttp = new OutboundHttp(
		mock<SsrfProtectionService>(),
		mock<SsrfProtectionConfig>(),
		logger,
	);
	const client = new GitLabHostClient(outboundHttp, logger);
	const access = {
		baseUrl: 'https://gitlab.example.com',
		username: 'n8n',
		accessToken: 'example-access-token',
	};

	afterEach(() => {
		nock.cleanAll();
		vi.clearAllMocks();
	});

	it('checks a token through the centralized HTTP client', async () => {
		const api = nock(access.baseUrl)
			.matchHeader('PRIVATE-TOKEN', access.accessToken)
			.get('/api/v4/user')
			.reply(200, { id: 12 })
			.get('/api/v4/projects')
			.query({
				membership: 'true',
				simple: 'true',
				archived: 'false',
				order_by: 'last_activity_at',
				sort: 'desc',
				per_page: '1',
				page: '1',
			})
			.reply(200, []);

		await expect(client.validateAccess(access)).resolves.toBeUndefined();
		api.done();
	});

	it('returns normalized repository identities and the next-page state', async () => {
		const api = nock(access.baseUrl)
			.matchHeader('PRIVATE-TOKEN', access.accessToken)
			.get('/api/v4/projects')
			.query((query) => query.search === 'workflows' && query.page === '2')
			.reply(
				200,
				[
					{
						id: 42,
						path_with_namespace: 'platform/workflows',
						http_url_to_repo: `${access.baseUrl}/platform/workflows.git`,
					},
				],
				{ 'X-Next-Page': '3' },
			);

		await expect(
			client.listRepositories(access, { search: 'workflows', offset: 20, limit: 20 }),
		).resolves.toEqual({
			repositories: [
				{
					id: '42',
					fullPath: 'platform/workflows',
					remoteUrl: `${access.baseUrl}/platform/workflows.git`,
				},
			],
			hasNextPage: true,
		});
		api.done();
	});

	it('returns a useful error for an expired token without exposing it', async () => {
		const api = nock(access.baseUrl)
			.get('/api/v4/user')
			.reply(401, { message: access.accessToken });

		await expect(client.validateAccess(access)).rejects.toThrow('GitLab rejected the access token');
		expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain(access.accessToken);
		api.done();
	});

	it('reports a redirect without sending credentials to the destination', async () => {
		const api = nock(access.baseUrl)
			.get('/api/v4/user')
			.reply(302, '', { Location: 'https://other.example.com/api/v4/user' });
		const destination = nock('https://other.example.com')
			.get('/api/v4/user')
			.reply(200, { id: 12 });

		await expect(client.validateAccess(access)).rejects.toThrow('Use the final GitLab URL');
		expect(destination.isDone()).toBe(false);
		api.done();
	});

	it('recovers from one dropped connection through the HTTP transport', async () => {
		const api = nock(access.baseUrl)
			.get('/api/v4/projects')
			.query(true)
			.replyWithError(Object.assign(new Error('socket closed'), { code: 'ECONNRESET' }))
			.get('/api/v4/projects')
			.query(true)
			.reply(200, []);

		await expect(client.listRepositories(access, { offset: 0, limit: 20 })).resolves.toEqual({
			repositories: [],
			hasNextPage: false,
		});
		api.done();
	});
});
