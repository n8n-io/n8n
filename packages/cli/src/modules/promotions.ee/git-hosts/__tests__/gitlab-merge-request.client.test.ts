import { mockLogger } from '@n8n/backend-test-utils';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ConflictError, ServiceUnavailableError } from '@n8n/errors';

import { GitLabMergeRequestClient } from '../gitlab-merge-request.client';

describe('GitLabMergeRequestClient', () => {
	const http = mock<HttpRequestClient>();
	const outboundHttp = mock<OutboundHttp>();
	let client: GitLabMergeRequestClient;

	const access = {
		baseUrl: 'https://gitlab.example.com/gitlab',
		username: 'n8n',
		accessToken: 'glpat-token',
	};
	const ref = { projectId: 7, iid: 3 };
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
			qs: { iids: [3, 4], state: 'all' },
			arrayFormat: 'brackets',
		});

		http.request.mockClear();
		await expect(client.listMergeRequests(access, 7, [])).resolves.toEqual([]);
		expect(http.request).not.toHaveBeenCalled();
	});

	it('posts a note, approves, and merges with the expected head sha', async () => {
		respond(201, {});
		respond(201, {});
		respond(200, { ...mergeRequest, state: 'merged', merged_at: '2026-10-05T11:00:00Z' });

		await client.createNote(access, ref, 'Approved in n8n by Ada');
		await client.approve(access, ref);
		const merged = await client.merge(access, ref, 'b'.repeat(40));

		expect(merged.state).toBe('merged');
		expect(http.request.mock.calls.map(([request]) => [request.method, request.url])).toEqual([
			['POST', 'https://gitlab.example.com/gitlab/api/v4/projects/7/merge_requests/3/notes'],
			['POST', 'https://gitlab.example.com/gitlab/api/v4/projects/7/merge_requests/3/approve'],
			['PUT', 'https://gitlab.example.com/gitlab/api/v4/projects/7/merge_requests/3/merge'],
		]);
		expect(lastRequest()?.body).toEqual({
			should_remove_source_branch: true,
			sha: 'b'.repeat(40),
		});
	});

	it('rejects a merge request response that misses required fields', async () => {
		respond(200, { iid: 3 });

		await expect(client.getMergeRequest(access, ref)).rejects.toThrow(BadRequestError);
	});

	it.each([
		[401, BadRequestError, /access token/],
		[403, BadRequestError, /may not perform/],
		[404, BadRequestError, /could not find/],
		[405, ConflictError, /cannot merge/],
		[406, ConflictError, /cannot merge/],
		[409, ConflictError, /changed on GitLab/],
		[500, ServiceUnavailableError, /not available/],
	])('maps HTTP %s to %s', async (status, errorClass, message) => {
		respond(status, {});

		const promise = client.merge(access, ref, 'b'.repeat(40));

		await expect(promise).rejects.toThrow(errorClass);
		await expect(promise).rejects.toThrow(message);
	});

	it('surfaces the GitLab message of a merge refusal', async () => {
		respond(405, { message: '405 Method Not Allowed: Branch cannot be merged' });

		await expect(client.merge(access, ref, 'b'.repeat(40))).rejects.toThrow(
			'GitLab: 405 Method Not Allowed: Branch cannot be merged',
		);
	});

	it('does not retry a write that failed before a response', async () => {
		http.request.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'ECONNRESET' }));

		await expect(client.createNote(access, ref, 'note')).rejects.toThrow(ServiceUnavailableError);
		expect(http.request).toHaveBeenCalledTimes(1);
	});
});
