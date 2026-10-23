import { mockLogger } from '@n8n/backend-test-utils';
import {
	OutboundHttp,
	SsrfBlockedIpError,
	type HttpRequestClient,
	type SsrfProtectionService,
} from '@n8n/backend-network';
import type { SsrfProtectionConfig } from '@n8n/config';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import {
	BadRequestError,
	ConflictError,
	ServiceUnavailableError,
	TooManyRequestsError,
	UnexpectedError,
} from '@n8n/errors';

import {
	GitLabMergeRequestClient,
	parseGitLabReviewId,
	toGitLabReviewId,
} from '../gitlab-merge-request.client';

const access = {
	baseUrl: 'https://gitlab.example.com/gitlab',
	accessToken: 'glpat-token',
};
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
		expect(id).toBe('42!7');
		expect(parseGitLabReviewId(id)).toEqual({ projectId: 42, iid: 7 });
	});

	it.each(['gitlab:42!7', '42', ''])('rejects %j', (value) => {
		expect(() => parseGitLabReviewId(value)).toThrow(BadRequestError);
	});
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

	it('creates the merge request on the project path and keeps the source branch', async () => {
		respond(201, mergeRequest);

		const created = await client.createMergeRequest(access, {
			projectPath: 'platform/api',
			sourceBranch: mergeRequest.source_branch,
			targetBranch: 'main',
			title: mergeRequest.title,
			description: 'Opened by n8n',
		});

		expect(created).toMatchObject({ iid: 3, project_id: 7, state: 'opened' });
		expect(outboundHttp.requests).toHaveBeenCalledWith();
		expect(lastRequest()).toMatchObject({
			method: 'POST',
			url: 'https://gitlab.example.com/gitlab/api/v4/projects/platform%2Fapi/merge_requests',
			headers: { 'PRIVATE-TOKEN': 'glpat-token' },
			body: {
				source_branch: mergeRequest.source_branch,
				target_branch: 'main',
				title: mergeRequest.title,
				description: 'Opened by n8n',
				remove_source_branch: false,
			},
			maxResponseBodyBytes: 1024 * 1024,
			disableFollowRedirect: true,
		});
	});

	it('shortens a title to the GitLab limit', async () => {
		respond(201, mergeRequest);

		await client.createMergeRequest(access, {
			projectPath: 'platform/api',
			sourceBranch: mergeRequest.source_branch,
			targetBranch: 'main',
			title: 'a'.repeat(300),
			description: 'Opened by n8n',
		});

		expect(lastRequest()?.body).toMatchObject({ title: 'a'.repeat(255) });
	});

	const openMergeRequest = async () =>
		await client.createMergeRequest(access, {
			projectPath: 'platform/api',
			sourceBranch: 'n8n-promotion/x',
			targetBranch: 'main',
			title: 't',
			description: 'd',
		});

	it('tolerates fields GitLab omits and keeps the ones it adds', async () => {
		const { has_conflicts, merged_at, closed_at, author, diff_refs, ...minimal } = mergeRequest;
		respond(201, { ...minimal, references: { full: 'platform/api!3' } });

		const created = await openMergeRequest();

		expect(created.has_conflicts).toBe(false);
		expect(created.diff_refs).toBeUndefined();
	});

	it('rejects a merge request response that misses required fields', async () => {
		respond(201, { iid: 3 });

		await expect(openMergeRequest()).rejects.toThrow(UnexpectedError);
	});

	it('rejects a merge request URL that is not http or https', async () => {
		respond(201, { ...mergeRequest, web_url: 'javascript:alert(1)' });

		await expect(openMergeRequest()).rejects.toThrow(UnexpectedError);
	});

	it.each([
		[401, {}, BadRequestError, /access token/],
		[
			409,
			{ message: 'Another open merge request already exists' },
			ConflictError,
			/GitLab: Another open merge request already exists/,
		],
		[429, {}, TooManyRequestsError, /limiting requests/],
		[500, {}, ServiceUnavailableError, /not available/],
	])('maps HTTP %s', async (status, body, errorClass, message) => {
		respond(status, body);

		const promise = openMergeRequest();

		await expect(promise).rejects.toThrow(errorClass);
		await expect(promise).rejects.toThrow(message);
	});

	it('includes field errors from a GitLab validation response', async () => {
		respond(400, {
			message: {
				source_branch: ['has already been taken'],
				title: ['is too long'],
			},
		});

		await expect(openMergeRequest()).rejects.toThrow(
			'GitLab: source_branch: has already been taken; title: is too long',
		);
	});

	it.each([
		['ETIMEDOUT', ServiceUnavailableError, /timed out/],
		['ENOTFOUND', BadRequestError, /hostname/],
		['CERT_HAS_EXPIRED', BadRequestError, /certificate/],
		['ECONNRESET', ServiceUnavailableError, /reach GitLab/],
		['ERR_RESPONSE_TOO_LARGE', BadRequestError, /too large/],
	])('maps a %s failure and does not retry it', async (code, errorClass, message) => {
		http.request.mockRejectedValueOnce(Object.assign(new Error('boom'), { code }));

		const promise = openMergeRequest();

		await expect(promise).rejects.toThrow(errorClass);
		await expect(promise).rejects.toThrow(message);
		expect(http.request).toHaveBeenCalledTimes(1);
	});

	it('reports a blocked address as a configuration error', async () => {
		http.request.mockRejectedValueOnce(new SsrfBlockedIpError('127.0.0.1'));

		await expect(openMergeRequest()).rejects.toThrow(/network policy/);
	});
});

/** The wire format, through the real HTTP client. */
describe('GitLabMergeRequestClient transport', () => {
	const logger = mockLogger();
	const ssrfConfig = mock<SsrfProtectionConfig>();
	// This test checks redirect handling. The network policy is covered separately.
	ssrfConfig.enabled = false;
	const outboundHttp = new OutboundHttp(mock<SsrfProtectionService>(), ssrfConfig, logger);
	const client = new GitLabMergeRequestClient(outboundHttp, logger);

	afterEach(() => {
		nock.cleanAll();
	});

	it('does not follow a redirect with the token', async () => {
		const api = nock('https://gitlab.example.com')
			.post(/\/merge_requests$/)
			.reply(302, '', { Location: 'https://elsewhere.example.com/' });
		const elsewhere = nock('https://elsewhere.example.com').get('/').reply(200, mergeRequest);

		await expect(
			client.createMergeRequest(access, {
				projectPath: 'platform/api',
				sourceBranch: 'n8n-promotion/x',
				targetBranch: 'main',
				title: 't',
				description: 'd',
			}),
		).rejects.toThrow(/redirected/);
		expect(api.isDone()).toBe(true);
		expect(elsewhere.isDone()).toBe(false);
	});
});
