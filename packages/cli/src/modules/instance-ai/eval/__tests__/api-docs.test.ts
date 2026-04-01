const mockLogger = {
	warn: jest.fn(),
	debug: jest.fn(),
};

jest.mock('@n8n/backend-common', () => ({
	Logger: class Logger {},
}));

jest.mock('@n8n/di', () => ({
	Container: {
		get: jest.fn().mockReturnValue(mockLogger),
	},
	Service: () => jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FALLBACK_INSTRUCTIONS =
	'No API documentation was found for this endpoint. Generate the response based on your knowledge of this API. Follow standard REST conventions for the HTTP method: GET returns resource data, POST returns the created resource, PUT/PATCH returns the updated resource, DELETE returns 204 or confirmation.';

let mockFetch: jest.Mock;
let savedApiKey: string | undefined;

function mockFetchResponse(status: number, body: unknown, ok?: boolean) {
	const isOk = ok ?? (status >= 200 && status < 300);
	const textBody = typeof body === 'string' ? body : JSON.stringify(body);
	mockFetch.mockResolvedValueOnce({
		ok: isOk,
		status,
		text: jest.fn().mockResolvedValue(textBody),
		json: jest.fn().mockResolvedValue(body),
	});
}

beforeEach(() => {
	jest.resetModules();
	jest.clearAllMocks();
	mockFetch = jest.fn();
	global.fetch = mockFetch;
	savedApiKey = process.env.CONTEXT7_API_KEY;
	delete process.env.CONTEXT7_API_KEY;
});

afterEach(() => {
	if (savedApiKey !== undefined) {
		process.env.CONTEXT7_API_KEY = savedApiKey;
	} else {
		delete process.env.CONTEXT7_API_KEY;
	}
});

// ---------------------------------------------------------------------------
// resolveLibraryId (tested indirectly through fetchApiDocs)
// ---------------------------------------------------------------------------

describe('resolveLibraryId (via fetchApiDocs)', () => {
	it('should return docs when library search and docs fetch both succeed', async () => {
		const { fetchApiDocs } = await import('../api-docs');

		// Library search
		mockFetchResponse(200, [{ id: '/lib/slack-api', trust_score: 90 }]);
		// Docs fetch
		mockFetchResponse(200, 'POST /chat.postMessage — sends a message to a channel');

		const result = await fetchApiDocs('Slack', 'chat.postMessage');

		expect(result).toBe('POST /chat.postMessage — sends a message to a channel');
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('should cache library ID — second call does not re-fetch library search', async () => {
		const { fetchApiDocs } = await import('../api-docs');

		// First call: library search + docs
		mockFetchResponse(200, [{ id: '/lib/slack-api', trust_score: 90 }]);
		mockFetchResponse(200, 'docs for postMessage');

		await fetchApiDocs('Slack', 'chat.postMessage');

		// Second call: only docs fetch needed (library ID is cached)
		mockFetchResponse(200, 'docs for conversations.list');

		const result = await fetchApiDocs('Slack', 'conversations.list');

		expect(result).toBe('docs for conversations.list');
		// 2 from first call + 1 from second call = 3
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});

	it('should return fallback when library search returns non-200', async () => {
		const { fetchApiDocs } = await import('../api-docs');

		mockFetchResponse(500, 'Internal Server Error');

		const result = await fetchApiDocs('FakeService', 'endpoint');

		expect(result).toBe(FALLBACK_INSTRUCTIONS);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it('should return fallback when library search returns empty results', async () => {
		const { fetchApiDocs } = await import('../api-docs');

		mockFetchResponse(200, []);

		const result = await fetchApiDocs('ObscureService', 'endpoint');

		expect(result).toBe(FALLBACK_INSTRUCTIONS);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it('should log warning on 429 status (quota exceeded)', async () => {
		const { fetchApiDocs } = await import('../api-docs');

		mockFetchResponse(429, 'Rate limit exceeded');

		await fetchApiDocs('Slack', 'endpoint');

		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining('Context7 quota exceeded'),
		);
	});

	it('should log warning when response body contains "Quota"', async () => {
		const { fetchApiDocs } = await import('../api-docs');

		mockFetchResponse(403, 'Quota limit reached for your plan');

		await fetchApiDocs('Slack', 'endpoint');

		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining('Context7 quota exceeded'),
		);
	});

	it('should log warning only once per session (context7WarningLogged flag)', async () => {
		const { fetchApiDocs } = await import('../api-docs');

		// First call — 429, should warn
		mockFetchResponse(429, 'Rate limit');
		await fetchApiDocs('Service1', 'endpoint');

		// Second call — also 429, should NOT warn again
		mockFetchResponse(429, 'Rate limit');
		await fetchApiDocs('Service2', 'endpoint');

		expect(mockLogger.warn).toHaveBeenCalledTimes(1);
	});

	it('should return fallback on fetch timeout / network error', async () => {
		const { fetchApiDocs } = await import('../api-docs');

		mockFetch.mockRejectedValueOnce(new Error('network timeout'));

		const result = await fetchApiDocs('Slack', 'endpoint');

		expect(result).toBe(FALLBACK_INSTRUCTIONS);
		expect(mockLogger.debug).toHaveBeenCalledWith(
			expect.stringContaining('Context7 library search failed'),
		);
	});
});

// ---------------------------------------------------------------------------
// fetchApiDocs
// ---------------------------------------------------------------------------

describe('fetchApiDocs', () => {
	it('should return docs text from Context7 on success', async () => {
		const { fetchApiDocs } = await import('../api-docs');

		mockFetchResponse(200, [{ id: '/lib/github-api', trust_score: 80 }]);
		mockFetchResponse(200, 'GET /repos/{owner}/{repo} — returns a repository');

		const result = await fetchApiDocs('GitHub', 'repos');

		expect(result).toBe('GET /repos/{owner}/{repo} — returns a repository');
	});

	it('should cache docs per serviceName + endpointQuery', async () => {
		const { fetchApiDocs } = await import('../api-docs');

		// First call: library search + docs
		mockFetchResponse(200, [{ id: '/lib/slack-api', trust_score: 90 }]);
		mockFetchResponse(200, 'cached docs content');

		const first = await fetchApiDocs('Slack', 'chat.postMessage');

		// Second call with same args: should hit cache, no fetch
		const second = await fetchApiDocs('Slack', 'chat.postMessage');

		expect(first).toBe('cached docs content');
		expect(second).toBe('cached docs content');
		// Only 2 fetches total (library search + docs from first call)
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('should return fallback when docs endpoint returns non-200', async () => {
		const { fetchApiDocs } = await import('../api-docs');

		mockFetchResponse(200, [{ id: '/lib/slack-api', trust_score: 90 }]);
		mockFetchResponse(500, 'Server Error');

		const result = await fetchApiDocs('Slack', 'endpoint');

		expect(result).toBe(FALLBACK_INSTRUCTIONS);
	});

	it('should return fallback when docs response is empty text', async () => {
		const { fetchApiDocs } = await import('../api-docs');

		mockFetchResponse(200, [{ id: '/lib/slack-api', trust_score: 90 }]);
		mockFetchResponse(200, '   ');

		const result = await fetchApiDocs('Slack', 'endpoint');

		expect(result).toBe(FALLBACK_INSTRUCTIONS);
	});

	it('should pass CONTEXT7_API_KEY as Bearer Authorization header when env var is set', async () => {
		process.env.CONTEXT7_API_KEY = 'test-api-key-123';
		const { fetchApiDocs } = await import('../api-docs');

		mockFetchResponse(200, [{ id: '/lib/slack-api', trust_score: 90 }]);
		mockFetchResponse(200, 'docs');

		await fetchApiDocs('Slack', 'endpoint');

		// Both the library search and docs fetch should include the header
		for (const call of mockFetch.mock.calls) {
			const options = call[1] as { headers: Record<string, string> };
			expect(options.headers.Authorization).toBe('Bearer test-api-key-123');
		}
	});

	it('should not send Authorization header when CONTEXT7_API_KEY is not set', async () => {
		delete process.env.CONTEXT7_API_KEY;
		const { fetchApiDocs } = await import('../api-docs');

		mockFetchResponse(200, [{ id: '/lib/slack-api', trust_score: 90 }]);
		mockFetchResponse(200, 'docs');

		await fetchApiDocs('Slack', 'endpoint');

		for (const call of mockFetch.mock.calls) {
			const options = call[1] as { headers: Record<string, string> };
			expect(options.headers).not.toHaveProperty('Authorization');
		}
	});
});
