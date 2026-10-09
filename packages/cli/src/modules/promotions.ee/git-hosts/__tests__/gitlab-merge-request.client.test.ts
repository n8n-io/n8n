import { mockLogger } from '@n8n/backend-test-utils';
import {
	OutboundHttp,
	type HttpRequestClient,
	type SsrfProtectionService,
} from '@n8n/backend-network';
import type { SsrfProtectionConfig } from '@n8n/config';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ConflictError, ServiceUnavailableError } from '@n8n/errors';

import {
	GitLabMergeRequestClient,
	parseGitLabReviewId,
	toGitLabReviewId,
} from '../gitlab-merge-request.client';

const access = {
	baseUrl: 'https://gitlab.example.com/gitlab',
	username: 'n8n',
	accessToken: 'glpat-token',
};
const ref = { projectId: 7, iid: 3 };

/** The fields n8n reads from a GitLab merge request, with the shape GitLab v4 returns. */
const mergeRequest = {
	iid: 3,
	project_id: 7,
	web_url: 'https://gitlab.example.com/gitlab/platform/api/-/merge_requests/3',
	title: 'Promote: fix the thing',
	description: 'Opened by n8n',
	state: 'opened',
	source_branch: 'n8n-promotion/2026-10-05T10-00-00-000Z',
	target_branch: 'main',
	has_conflicts: false,
	merged_at: null,
	closed_at: null,
	detailed_merge_status: 'mergeable',
	author: { name: 'n8n bot' },
	diff_refs: { base_sha: 'a'.repeat(40), head_sha: 'b'.repeat(40) },
};

describe('remoteReviewId helpers', () => {
	it('round-trips a merge request reference', () => {
		const id = toGitLabReviewId({ projectId: 42, iid: 7 });
		expect(id).toBe('gitlab:42!7');
		expect(parseGitLabReviewId(id)).toEqual({ projectId: 42, iid: 7 });
	});

	it.each(['github:org/repo#7', 'gitlab:42', 'gitlab:abc!7', '', 'gitlab:42!7!1'])(
		'rejects %j',
		(value) => {
			expect(() => parseGitLabReviewId(value)).toThrow(BadRequestError);
		},
	);
});

describe('GitLabMergeRequestClient', () => {
	const http = mock<HttpRequestClient>();
	const outboundHttp = mock<OutboundHttp>();
	let client: GitLabMergeRequestClient;

	const respond = (statusCode: number, body: unknown) =>
		http.request.mockResolvedValueOnce({ statusCode, body, headers: {} });

	const lastRequest = () => http.request.mock.calls.at(-1)?.[0];

	beforeEach(() => {
		vi.resetAllMocks();
		outboundHttp.requests.mockReturnValue(http);
		// `resetAllMocks` clears the `scoped` stub, so build a fresh logger per test.
		client = new GitLabMergeRequestClient(outboundHttp, mockLogger());
	});

	it('creates the merge request on the project path and asks GitLab to remove the source branch', async () => {
		respond(201, mergeRequest);

		const created = await client.createMergeRequest(access, {
			projectPath: 'platform/api',
			sourceBranch: mergeRequest.source_branch,
			targetBranch: 'main',
			title: mergeRequest.title,
			description: 'Opened by n8n',
		});

		expect(created).toMatchObject({ iid: 3, project_id: 7, state: 'opened' });
		expect(lastRequest()).toMatchObject({
			method: 'POST',
			url: 'https://gitlab.example.com/gitlab/api/v4/projects/platform%2Fapi/merge_requests',
			headers: { 'PRIVATE-TOKEN': 'glpat-token' },
			body: {
				source_branch: mergeRequest.source_branch,
				target_branch: 'main',
				title: mergeRequest.title,
				description: 'Opened by n8n',
				remove_source_branch: true,
			},
			disableFollowRedirect: true,
		});
	});

	it('reads one merge request by project id and iid', async () => {
		respond(200, mergeRequest);

		const read = await client.getMergeRequest(access, ref);

		expect(read.diff_refs?.base_sha).toBe('a'.repeat(40));
		expect(lastRequest()).toMatchObject({
			method: 'GET',
			url: 'https://gitlab.example.com/gitlab/api/v4/projects/7/merge_requests/3',
		});
	});

	it('reads several merge requests in one call and skips the request for no iids', async () => {
		respond(200, [mergeRequest, { ...mergeRequest, iid: 4, state: 'merged' }]);

		const read = await client.listMergeRequests(access, 7, [3, 4]);

		expect(read.map((mr) => mr.iid)).toEqual([3, 4]);
		expect(lastRequest()).toMatchObject({
			method: 'GET',
			url: 'https://gitlab.example.com/gitlab/api/v4/projects/7/merge_requests',
			qs: { iids: [3, 4], per_page: 2, state: 'all' },
			arrayFormat: 'brackets',
		});

		http.request.mockClear();
		await expect(client.listMergeRequests(access, 7, [])).resolves.toEqual([]);
		expect(http.request).not.toHaveBeenCalled();
	});

	it('reads more than one page of iids without dropping any', async () => {
		const iids = Array.from({ length: 150 }, (_, index) => index + 1);
		http.request.mockImplementation(async (options) => {
			const requested = (options.qs as { iids: number[] }).iids;
			return {
				statusCode: 200,
				headers: {},
				body: requested.map((iid) => ({ ...mergeRequest, iid })),
			};
		});

		const read = await client.listMergeRequests(access, 7, iids);

		expect(read.map((mr) => mr.iid)).toEqual(iids);
		expect(http.request).toHaveBeenCalledTimes(2);
		expect(
			http.request.mock.calls.map(([options]) => (options.qs as { per_page: number }).per_page),
		).toEqual([100, 50]);
	});

	it('tolerates fields GitLab omits and keeps the ones it adds', async () => {
		const { has_conflicts, merged_at, closed_at, author, diff_refs, ...minimal } = mergeRequest;
		respond(200, { ...minimal, references: { full: 'platform/api!3' } });

		const read = await client.getMergeRequest(access, ref);

		expect(read.has_conflicts).toBe(false);
		expect(read.diff_refs).toBeUndefined();
	});

	it('rejects a merge request response that misses required fields', async () => {
		respond(200, { iid: 3 });

		await expect(client.getMergeRequest(access, ref)).rejects.toThrow(BadRequestError);
	});

	it('rejects a list response that is not a list', async () => {
		respond(200, { message: 'unexpected' });

		await expect(client.listMergeRequests(access, 7, [3])).rejects.toThrow(BadRequestError);
	});

	it.each([
		[302, BadRequestError, /redirected/],
		[401, BadRequestError, /access token/],
		[403, BadRequestError, /may not perform/],
		[404, BadRequestError, /could not find/],
		[409, ConflictError, /changed on GitLab/],
		[429, ServiceUnavailableError, /not available/],
		[500, ServiceUnavailableError, /not available/],
	])('maps HTTP %s to %s', async (status, errorClass, message) => {
		respond(status, {});

		const promise = client.getMergeRequest(access, ref);

		await expect(promise).rejects.toThrow(errorClass);
		await expect(promise).rejects.toThrow(message);
	});

	it.each([
		[
			'a string',
			409,
			{ message: '409 Conflict: Another open merge request already exists' },
			'GitLab: 409 Conflict: Another open merge request already exists',
		],
		[
			'a list',
			409,
			{ message: ['409 Conflict:', 'Another open merge request already exists'] },
			'GitLab: 409 Conflict: Another open merge request already exists',
		],
		[
			'field errors',
			400,
			{
				message: {
					source_branch: ['has already been taken'],
					title: ['is too long', 'is invalid'],
				},
			},
			'GitLab: source_branch: has already been taken; title: is too long, is invalid',
		],
	])('surfaces the GitLab message when it is %s', async (_, status, body, detail) => {
		respond(status, body);

		await expect(
			client.createMergeRequest(access, {
				projectPath: 'platform/api',
				sourceBranch: 'n8n-promotion/x',
				targetBranch: 'main',
				title: 't',
				description: 'd',
			}),
		).rejects.toThrow(detail);
	});

	it('does not retry a call that failed before a response', async () => {
		http.request.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'ECONNRESET' }));

		await expect(client.getMergeRequest(access, ref)).rejects.toThrow(ServiceUnavailableError);
		expect(http.request).toHaveBeenCalledTimes(1);
	});
});

/**
 * The wire format, through the real HTTP client. A serializer difference once
 * sent `iids[][0]=3`, which GitLab answers with an empty list.
 */
describe('GitLabMergeRequestClient transport', () => {
	const logger = mockLogger();
	const outboundHttp = new OutboundHttp(
		mock<SsrfProtectionService>(),
		mock<SsrfProtectionConfig>(),
		logger,
	);
	const client = new GitLabMergeRequestClient(outboundHttp, logger);

	afterEach(() => {
		nock.cleanAll();
	});

	it('sends the token header and repeats iids[] per value', async () => {
		const api = nock('https://gitlab.example.com')
			.matchHeader('PRIVATE-TOKEN', access.accessToken)
			.get('/gitlab/api/v4/projects/7/merge_requests')
			.query((query) => {
				// Each iid is its own `iids[]` entry.
				const iids = query['iids[]'];
				return (
					Array.isArray(iids) &&
					iids.join(',') === '3,4' &&
					query.per_page === '2' &&
					query.state === 'all'
				);
			})
			.reply(200, [mergeRequest]);

		await expect(client.listMergeRequests(access, 7, [3, 4])).resolves.toHaveLength(1);
		expect(api.isDone()).toBe(true);
	});

	it('does not follow a redirect with the token', async () => {
		const api = nock('https://gitlab.example.com')
			.get('/gitlab/api/v4/projects/7/merge_requests/3')
			.reply(302, '', { Location: 'https://elsewhere.example.com/' });
		const elsewhere = nock('https://elsewhere.example.com').get('/').reply(200, mergeRequest);

		await expect(client.getMergeRequest(access, ref)).rejects.toThrow(/redirected/);
		expect(api.isDone()).toBe(true);
		expect(elsewhere.isDone()).toBe(false);
	});
});
