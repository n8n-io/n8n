import { GitHubProvider } from '../providers/github-provider';

describe('GitHubProvider', () => {
	const baseOptions = {
		apiBaseUrl: 'https://api.github.com',
		token: 'test-token',
		owner: 'acme',
		repo: 'flows',
	};

	const mockFetch = (status: number, body: unknown) => {
		const fetchMock = jest.fn().mockResolvedValue({
			status,
			json: async () => body,
		} as Response);
		global.fetch = fetchMock as unknown as typeof fetch;
		return fetchMock;
	};

	const mockFetchSequence = (responses: Array<{ status: number; body: unknown }>) => {
		const fetchMock = jest.fn();
		for (const response of responses) {
			fetchMock.mockResolvedValueOnce({
				status: response.status,
				json: async () => response.body,
			} as Response);
		}
		global.fetch = fetchMock as unknown as typeof fetch;
		return fetchMock;
	};

	afterEach(() => jest.restoreAllMocks());

	it('lists open pull requests targeting the branch with auth headers', async () => {
		const fetchMock = mockFetch(200, [
			{
				number: 7,
				title: 'Add lead flow',
				html_url: 'https://github.com/acme/flows/pull/7',
				draft: false,
				created_at: '2026-06-01T00:00:00Z',
				updated_at: '2026-06-02T00:00:00Z',
				user: { login: 'alice' },
				head: { ref: 'feature', sha: 'headsha' },
				base: { ref: 'main', sha: 'basesha' },
			},
		]);

		const provider = new GitHubProvider(baseOptions);
		const prs = await provider.listOpenPullRequests('main');

		expect(prs).toEqual([
			expect.objectContaining({
				provider: 'github',
				prNumber: 7,
				title: 'Add lead flow',
				url: 'https://github.com/acme/flows/pull/7',
				author: 'alice',
				isDraft: false,
				sourceBranch: 'feature',
				targetBranch: 'main',
				baseSha: 'basesha',
				headSha: 'headsha',
			}),
		]);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(
			'https://api.github.com/repos/acme/flows/pulls?state=open&base=main&per_page=100',
		);
		expect((init as RequestInit).headers).toMatchObject({
			Authorization: 'Bearer test-token',
		});
	});

	it('normalizes changed file statuses', async () => {
		mockFetch(200, [
			{ filename: 'workflows/a.json', status: 'modified' },
			{ filename: 'workflows/b.json', status: 'added' },
			{ filename: 'workflows/c.json', status: 'copied' },
			{ filename: 'README.md', status: 'changed' },
		]);

		const provider = new GitHubProvider(baseOptions);
		const files = await provider.listFiles(7);

		expect(files).toEqual([
			{ path: 'workflows/a.json', status: 'modified' },
			{ path: 'workflows/b.json', status: 'added' },
			{ path: 'workflows/c.json', status: 'added' },
			{ path: 'README.md', status: 'modified' },
		]);
	});

	it('decodes base64 file content at a ref', async () => {
		const content = JSON.stringify({ id: '1', name: 'flow' });
		mockFetch(200, {
			encoding: 'base64',
			content: Buffer.from(content).toString('base64'),
		});

		const provider = new GitHubProvider(baseOptions);
		const result = await provider.getFileAtRef('workflows/a.json', 'basesha');

		expect(result).toBe(content);
	});

	it('returns null when a file is absent at the ref', async () => {
		mockFetch(404, { message: 'Not Found' });

		const provider = new GitHubProvider(baseOptions);
		const result = await provider.getFileAtRef('workflows/new.json', 'basesha');

		expect(result).toBeNull();
	});

	it('throws a UserError naming an invalid/expired credential on 401', async () => {
		mockFetch(401, { message: 'Bad credentials' });

		const provider = new GitHubProvider(baseOptions);
		await expect(provider.listOpenPullRequests('main')).rejects.toThrow(/invalid or has expired/);
	});

	it('names the Contents permission when reading file content is forbidden (403)', async () => {
		mockFetch(403, { message: 'Resource not accessible by integration' });

		const provider = new GitHubProvider(baseOptions);
		await expect(provider.getFileAtRef('workflows/a.json', 'basesha')).rejects.toThrow(
			/Contents: Read/,
		);
	});

	it('names the Pull requests permission when listing is forbidden (403)', async () => {
		mockFetch(403, { message: 'Resource not accessible by integration' });

		const provider = new GitHubProvider(baseOptions);
		await expect(provider.listOpenPullRequests('main')).rejects.toThrow(/Pull requests: Read/);
	});

	it('names write permission when adding a review comment is forbidden (403)', async () => {
		mockFetch(403, { message: 'Resource not accessible by integration' });

		const provider = new GitHubProvider(baseOptions);
		await expect(
			provider.createReviewComment(7, {
				body: 'x',
				path: 'workflows/a.json',
				line: 1,
				side: 'RIGHT',
				subjectType: 'line',
				commitId: 'headsha',
			}),
		).rejects.toThrow(/Read and write/);
	});

	it('deletes a pull request review comment', async () => {
		const fetchMock = mockFetch(204, {});

		const provider = new GitHubProvider(baseOptions);
		await provider.deleteReviewComment(42);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://api.github.com/repos/acme/flows/pulls/comments/42');
		expect((init as RequestInit).method).toBe('DELETE');
	});

	it('submits a pull request review', async () => {
		const fetchMock = mockFetchSequence([
			{ status: 200, body: { login: 'alice' } },
			{ status: 200, body: [] },
			{
				status: 200,
				body: {
					id: 99,
					body: 'Looks good',
					html_url: 'https://github.com/acme/flows/pull/7#pullrequestreview-99',
					state: 'APPROVED',
					submitted_at: '2026-06-03T00:00:00Z',
					user: { login: 'alice' },
				},
			},
		]);

		const provider = new GitHubProvider(baseOptions);
		const review = await provider.submitPullRequestReview(7, {
			body: 'Looks good',
			event: 'APPROVE',
			commitId: 'headsha',
		});

		expect(review).toEqual({
			id: 99,
			body: 'Looks good',
			url: 'https://github.com/acme/flows/pull/7#pullrequestreview-99',
			state: 'APPROVED',
			author: 'alice',
			submittedAt: '2026-06-03T00:00:00Z',
		});

		expect(fetchMock).toHaveBeenCalledTimes(3);
		const [url, init] = fetchMock.mock.calls[2];
		expect(url).toBe('https://api.github.com/repos/acme/flows/pulls/7/reviews');
		expect((init as RequestInit).method).toBe('POST');
		expect(JSON.parse(String((init as RequestInit).body))).toEqual({
			commit_id: 'headsha',
			body: 'Looks good',
			event: 'APPROVE',
		});
	});

	it('submits a pending pull request review after inline comments', async () => {
		const fetchMock = mockFetchSequence([
			{ status: 200, body: { login: 'alice' } },
			{
				status: 200,
				body: [
					{
						id: 88,
						body: '',
						html_url: 'https://github.com/acme/flows/pull/7#pullrequestreview-88',
						state: 'PENDING',
						submitted_at: '2026-06-03T00:00:00Z',
						user: { login: 'alice' },
					},
				],
			},
			{
				status: 200,
				body: {
					id: 88,
					body: 'Looks good',
					html_url: 'https://github.com/acme/flows/pull/7#pullrequestreview-88',
					state: 'APPROVED',
					submitted_at: '2026-06-03T00:00:00Z',
					user: { login: 'alice' },
				},
			},
		]);

		const provider = new GitHubProvider(baseOptions);
		const review = await provider.submitPullRequestReview(7, {
			body: 'Looks good',
			event: 'APPROVE',
			commitId: 'headsha',
		});

		expect(review.state).toBe('APPROVED');
		expect(fetchMock).toHaveBeenCalledTimes(3);
		const [url, init] = fetchMock.mock.calls[2];
		expect(url).toBe('https://api.github.com/repos/acme/flows/pulls/7/reviews/88/events');
		expect((init as RequestInit).method).toBe('POST');
		expect(JSON.parse(String((init as RequestInit).body))).toEqual({
			body: 'Looks good',
			event: 'APPROVE',
		});
	});

	it('submits a pending review when GET /user is forbidden for GitHub App tokens', async () => {
		const fetchMock = mockFetchSequence([
			{ status: 403, body: { message: 'Resource not accessible by integration' } },
			{
				status: 200,
				body: [
					{
						id: 88,
						body: '',
						html_url: 'https://github.com/acme/flows/pull/7#pullrequestreview-88',
						state: 'PENDING',
						submitted_at: '2026-06-03T00:00:00Z',
						user: { login: 'n8n-app[bot]' },
					},
				],
			},
			{
				status: 200,
				body: {
					id: 88,
					body: 'Looks good',
					html_url: 'https://github.com/acme/flows/pull/7#pullrequestreview-88',
					state: 'APPROVED',
					submitted_at: '2026-06-03T00:00:00Z',
					user: { login: 'n8n-app[bot]' },
				},
			},
		]);

		const provider = new GitHubProvider(baseOptions);
		const review = await provider.submitPullRequestReview(7, {
			body: 'Looks good',
			event: 'APPROVE',
			commitId: 'headsha',
		});

		expect(review.state).toBe('APPROVED');
		expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/user');
		expect(fetchMock.mock.calls[2][0]).toBe(
			'https://api.github.com/repos/acme/flows/pulls/7/reviews/88/events',
		);
	});

	it('creates a review when GET /user is forbidden and no pending review exists', async () => {
		const fetchMock = mockFetchSequence([
			{ status: 403, body: { message: 'Resource not accessible by integration' } },
			{ status: 200, body: [] },
			{
				status: 200,
				body: {
					id: 99,
					body: 'Looks good',
					html_url: 'https://github.com/acme/flows/pull/7#pullrequestreview-99',
					state: 'APPROVED',
					submitted_at: '2026-06-03T00:00:00Z',
					user: { login: 'n8n-app[bot]' },
				},
			},
		]);

		const provider = new GitHubProvider(baseOptions);
		const review = await provider.submitPullRequestReview(7, {
			body: 'Looks good',
			event: 'APPROVE',
			commitId: 'headsha',
		});

		expect(review.state).toBe('APPROVED');
		expect(fetchMock.mock.calls[2][0]).toBe(
			'https://api.github.com/repos/acme/flows/pulls/7/reviews',
		);
	});

	it('lists pull request reviews for approval status', async () => {
		mockFetch(200, [
			{
				id: 1,
				body: 'LGTM',
				html_url: 'https://github.com/acme/flows/pull/7#pullrequestreview-1',
				state: 'APPROVED',
				submitted_at: '2026-06-03T00:00:00Z',
				user: { login: 'alice' },
			},
		]);

		const provider = new GitHubProvider(baseOptions);
		const reviews = await provider.listPullRequestReviews(7);

		expect(reviews).toEqual([
			{
				author: 'alice',
				state: 'APPROVED',
				submittedAt: '2026-06-03T00:00:00Z',
			},
		]);
	});

	it('creates a line-level pull request review comment', async () => {
		const fetchMock = mockFetch(201, {
			id: 56,
			body: 'Fix this value',
			path: 'workflows/a.json',
			line: 12,
			side: 'RIGHT',
			html_url: 'https://github.com/acme/flows/pull/7#discussion_r56',
			user: { login: 'alice' },
			created_at: '2026-06-05T00:00:00Z',
			updated_at: '2026-06-05T00:00:00Z',
		});

		const provider = new GitHubProvider(baseOptions);
		const comment = await provider.createReviewComment(7, {
			body: 'Fix this value',
			path: 'workflows/a.json',
			line: 12,
			side: 'RIGHT',
			commitId: 'headsha',
		});

		expect(comment).toEqual(
			expect.objectContaining({
				id: 56,
				line: 12,
				subjectType: 'line',
			}),
		);

		expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({
			body: 'Fix this value',
			commit_id: 'headsha',
			path: 'workflows/a.json',
			line: 12,
			side: 'RIGHT',
		});
	});

	it('creates a file-level pull request review comment', async () => {
		const fetchMock = mockFetch(201, {
			id: 55,
			body: 'Looks good overall',
			path: 'workflows/a.json',
			line: null,
			side: 'RIGHT',
			subject_type: 'file',
			html_url: 'https://github.com/acme/flows/pull/7#discussion_r55',
			user: { login: 'alice' },
			created_at: '2026-06-05T00:00:00Z',
			updated_at: '2026-06-05T00:00:00Z',
		});

		const provider = new GitHubProvider(baseOptions);
		const comment = await provider.createReviewComment(7, {
			body: 'Looks good overall',
			path: 'workflows/a.json',
			commitId: 'headsha',
			subjectType: 'file',
		});

		expect(comment).toEqual(
			expect.objectContaining({
				id: 55,
				path: 'workflows/a.json',
				subjectType: 'file',
			}),
		);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://api.github.com/repos/acme/flows/pulls/7/comments');
		expect(JSON.parse(String((init as RequestInit).body))).toEqual({
			body: 'Looks good overall',
			commit_id: 'headsha',
			path: 'workflows/a.json',
			subject_type: 'file',
		});
	});

	it('creates a pull request', async () => {
		const fetchMock = mockFetch(201, {
			number: 12,
			title: 'Review: Lead flow',
			html_url: 'https://github.com/acme/flows/pull/12',
			draft: false,
			created_at: '2026-06-04T00:00:00Z',
			updated_at: '2026-06-04T00:00:00Z',
			user: { login: 'bob' },
			head: { ref: 'n8n-review/123', sha: 'headsha' },
			base: { ref: 'main', sha: 'basesha' },
		});

		const provider = new GitHubProvider(baseOptions);
		const pr = await provider.createPullRequest({
			title: 'Review: Lead flow',
			body: 'Please review',
			headBranch: 'n8n-review/123',
			baseBranch: 'main',
		});

		expect(pr).toEqual(
			expect.objectContaining({
				prNumber: 12,
				title: 'Review: Lead flow',
				sourceBranch: 'n8n-review/123',
				targetBranch: 'main',
			}),
		);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://api.github.com/repos/acme/flows/pulls');
		expect((init as RequestInit).method).toBe('POST');
		expect(JSON.parse(String((init as RequestInit).body))).toEqual({
			title: 'Review: Lead flow',
			body: 'Please review',
			head: 'n8n-review/123',
			base: 'main',
		});
	});

	it('merges a pull request', async () => {
		const fetchMock = mockFetch(200, {
			sha: 'mergedsha',
			merged: true,
			message: 'Pull Request successfully merged',
		});

		const provider = new GitHubProvider(baseOptions);
		const result = await provider.mergePullRequest(7);

		expect(result).toEqual({
			sha: 'mergedsha',
			merged: true,
			message: 'Pull Request successfully merged',
		});

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://api.github.com/repos/acme/flows/pulls/7/merge');
		expect((init as RequestInit).method).toBe('PUT');
	});
});
