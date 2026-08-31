import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { DatabricksOAuth2Credential } from '../token-provider';
import { createDatabricksFetch, getDatabricksTokenProvider } from '../token-provider';

const { MockClientOAuth2, mockGetToken } = vi.hoisted(() => {
	const mockGetToken = vi.fn();

	class MockClientOAuth2 {
		credentials = { getToken: mockGetToken };

		constructor(readonly options: unknown) {
			MockClientOAuth2.init(options);
		}

		static init = vi.fn();
	}

	return { MockClientOAuth2, mockGetToken };
});

vi.mock('@n8n/client-oauth2', () => ({
	ClientOAuth2: MockClientOAuth2,
}));

const mockNode: INode = {
	id: '1',
	name: 'Databricks Chat Model',
	typeVersion: 1,
	type: '@n8n/n8n-nodes-langchain.lmChatDatabricks',
	position: [0, 0],
	parameters: {},
};

const SENTINEL_SECRET = 'sentinel-client-secret-xyz';

const mockCredential: DatabricksOAuth2Credential = {
	host: 'https://my.databricks.com',
	grantType: 'clientCredentials',
	clientId: 'test-client-id',
	clientSecret: SENTINEL_SECRET,
	scope: 'all-apis',
	authentication: 'header',
};

// Realistic mint failure: an Error instance shaped like the token endpoint's
// error response (status + body own props)
class MockResponseError extends Error {
	status = 401;

	body = { error: 'invalid_client', error_description: 'Client authentication failed' };

	constructor() {
		super('401: Client authentication failed (invalid_client)');
	}
}

function tokenResponse(accessToken: string, expiresIn?: number | string) {
	return {
		accessToken,
		data: { access_token: accessToken, expires_in: expiresIn },
	};
}

describe('getDatabricksTokenProvider', () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it('should mint a token via ClientOAuth2 built from the decrypted credential', async () => {
		mockGetToken.mockResolvedValue(tokenResponse('token-a', 3600));
		const getToken = getDatabricksTokenProvider(mockNode, mockCredential);

		await expect(getToken()).resolves.toBe('token-a');
		expect(MockClientOAuth2.init).toHaveBeenCalledWith({
			clientId: 'test-client-id',
			clientSecret: SENTINEL_SECRET,
			accessTokenUri: 'https://my.databricks.com/oidc/v1/token',
			scopes: ['all-apis'],
			authentication: 'header',
		});
	});

	it('should derive the mint URL from the host, ignoring a stored accessTokenUrl', async () => {
		mockGetToken.mockResolvedValue(tokenResponse('token-a', 3600));
		const poisoned = {
			...mockCredential,
			host: 'https://my.databricks.com/',
			accessTokenUrl: 'http://attacker.example/token',
		} as DatabricksOAuth2Credential;
		const getToken = getDatabricksTokenProvider(mockNode, poisoned);

		await expect(getToken()).resolves.toBe('token-a');
		expect(MockClientOAuth2.init).toHaveBeenCalledWith(
			expect.objectContaining({ accessTokenUri: 'https://my.databricks.com/oidc/v1/token' }),
		);
	});

	it('should pass the egress filter to ClientOAuth2 as its ssrfBridge', async () => {
		mockGetToken.mockResolvedValue(tokenResponse('token-a', 3600));
		const egressFilter = {
			validateUrl: vi.fn(),
			validateRedirectSync: vi.fn(),
			createSecureLookup: vi.fn(),
		};
		const getToken = getDatabricksTokenProvider(mockNode, mockCredential, egressFilter);

		await expect(getToken()).resolves.toBe('token-a');
		expect(MockClientOAuth2.init).toHaveBeenCalledWith(
			expect.objectContaining({ ssrfBridge: egressFilter }),
		);
	});

	it('should reuse the cached token before the 60s early-expiry buffer', async () => {
		vi.useFakeTimers();
		mockGetToken.mockResolvedValue(tokenResponse('token-a', 3600));
		const getToken = getDatabricksTokenProvider(mockNode, mockCredential);

		await expect(getToken()).resolves.toBe('token-a');
		vi.advanceTimersByTime((3600 - 120) * 1000);
		await expect(getToken()).resolves.toBe('token-a');
		expect(mockGetToken).toHaveBeenCalledTimes(1);
	});

	it('should re-mint within the last 60s of the token window', async () => {
		vi.useFakeTimers();
		mockGetToken
			.mockResolvedValueOnce(tokenResponse('token-a', 3600))
			.mockResolvedValueOnce(tokenResponse('token-b', 3600));
		const getToken = getDatabricksTokenProvider(mockNode, mockCredential);

		await expect(getToken()).resolves.toBe('token-a');
		vi.advanceTimersByTime((3600 - 30) * 1000);
		await expect(getToken()).resolves.toBe('token-b');
		expect(mockGetToken).toHaveBeenCalledTimes(2);
	});

	it('should re-mint every call when expires_in is missing', async () => {
		mockGetToken
			.mockResolvedValueOnce(tokenResponse('token-a'))
			.mockResolvedValueOnce(tokenResponse('token-b'));
		const getToken = getDatabricksTokenProvider(mockNode, mockCredential);

		await expect(getToken()).resolves.toBe('token-a');
		await expect(getToken()).resolves.toBe('token-b');
		expect(mockGetToken).toHaveBeenCalledTimes(2);
	});

	it('should re-mint every call when expires_in is not a number', async () => {
		mockGetToken
			.mockResolvedValueOnce(tokenResponse('token-a', 'soon'))
			.mockResolvedValueOnce(tokenResponse('token-b', 'soon'));
		const getToken = getDatabricksTokenProvider(mockNode, mockCredential);

		await expect(getToken()).resolves.toBe('token-a');
		await expect(getToken()).resolves.toBe('token-b');
		expect(mockGetToken).toHaveBeenCalledTimes(2);
	});

	it('should cache when expires_in is a numeric string', async () => {
		mockGetToken.mockResolvedValue(tokenResponse('token-a', '3600'));
		const getToken = getDatabricksTokenProvider(mockNode, mockCredential);

		await expect(getToken()).resolves.toBe('token-a');
		await expect(getToken()).resolves.toBe('token-a');
		expect(mockGetToken).toHaveBeenCalledTimes(1);
	});

	it('should share a single in-flight mint between concurrent callers', async () => {
		let resolveMint!: (value: ReturnType<typeof tokenResponse>) => void;
		mockGetToken.mockImplementation(
			async () => await new Promise((resolve) => (resolveMint = resolve)),
		);
		const getToken = getDatabricksTokenProvider(mockNode, mockCredential);

		const first = getToken();
		const second = getToken();
		resolveMint(tokenResponse('token-a', 3600));

		await expect(first).resolves.toBe('token-a');
		await expect(second).resolves.toBe('token-a');
		expect(mockGetToken).toHaveBeenCalledTimes(1);
	});

	it('should clear the cache slot on a rejected mint so the next call re-mints', async () => {
		mockGetToken
			.mockRejectedValueOnce(new MockResponseError())
			.mockResolvedValueOnce(tokenResponse('token-a', 3600));
		const getToken = getDatabricksTokenProvider(mockNode, mockCredential);

		await expect(getToken()).rejects.toThrow(NodeOperationError);
		await expect(getToken()).resolves.toBe('token-a');
		expect(mockGetToken).toHaveBeenCalledTimes(2);
	});

	it('should wrap mint failures in a NodeOperationError that leaks no secret', async () => {
		mockGetToken.mockRejectedValue(new MockResponseError());
		const getToken = getDatabricksTokenProvider(mockNode, mockCredential);

		const error = await getToken().then(
			() => {
				throw new Error('expected getToken to reject');
			},
			(e: NodeOperationError) => e,
		);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error.message).toBe('Failed to retrieve Databricks access token');
		expect(error.description).toContain('Client authentication failed');

		const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
		for (const text of [serialized, error.message, error.description ?? '']) {
			expect(text).not.toContain(SENTINEL_SECRET);
			expect(text).not.toContain('Bearer ');
		}
	});

	it('should scrub the client secret from an echoed mint error message', async () => {
		mockGetToken.mockRejectedValue(
			new Error(`400: invalid request "client_secret=${SENTINEL_SECRET}"`),
		);
		const getToken = getDatabricksTokenProvider(mockNode, mockCredential);

		const error = await getToken().then(
			() => {
				throw new Error('expected getToken to reject');
			},
			(e: NodeOperationError) => e,
		);

		expect(error.description).not.toContain(SENTINEL_SECRET);
		expect(error.description).toContain('***');
	});
});

describe('createDatabricksFetch', () => {
	const origFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = origFetch;
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it('should set the Authorization header, overwriting an existing one', async () => {
		const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
		globalThis.fetch = mockFetch;
		const wrappedFetch = createDatabricksFetch(async () => 'fresh-token');

		await wrappedFetch('https://my.databricks.com/serving-endpoints/chat/completions', {
			method: 'POST',
			headers: { authorization: 'Bearer stale-token' },
		});

		const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
		expect(new Headers(init.headers).get('authorization')).toBe('Bearer fresh-token');
		expect(init.method).toBe('POST');
	});

	it('should return the exact Response instance with an unread body', async () => {
		const response = new Response('data: chunk\n\n');
		globalThis.fetch = vi.fn().mockResolvedValue(response);
		const wrappedFetch = createDatabricksFetch(async () => 'fresh-token');

		const result = await wrappedFetch('https://my.databricks.com/serving-endpoints');

		expect(result).toBe(response);
		expect(result.bodyUsed).toBe(false);
	});

	it.each([401, 403, 429])(
		'should return a %i response unmodified without throwing',
		async (status) => {
			const response = new Response('{"error":"denied"}', { status });
			globalThis.fetch = vi.fn().mockResolvedValue(response);
			const wrappedFetch = createDatabricksFetch(async () => 'fresh-token');

			const result = await wrappedFetch('https://my.databricks.com/serving-endpoints');

			expect(result).toBe(response);
		},
	);

	it('should propagate network failures without leaking the token', async () => {
		globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
		const wrappedFetch = createDatabricksFetch(async () => 'minted-token-abc');

		const error = await wrappedFetch('https://my.databricks.com/serving-endpoints').then(
			() => {
				throw new Error('expected wrapped fetch to reject');
			},
			(e: Error) => e,
		);

		const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
		expect(serialized).not.toContain('minted-token-abc');
		expect(serialized).not.toContain('Bearer ');
	});

	it('should send a rotated token after the previous one expires mid-execution', async () => {
		vi.useFakeTimers();
		const mockFetch = vi.fn().mockResolvedValue(new Response('ok'));
		globalThis.fetch = mockFetch;
		mockGetToken
			.mockResolvedValueOnce(tokenResponse('token-a', 3600))
			.mockResolvedValueOnce(tokenResponse('token-b', 3600));
		const wrappedFetch = createDatabricksFetch(
			getDatabricksTokenProvider(mockNode, mockCredential),
		);

		await wrappedFetch('https://my.databricks.com/serving-endpoints');
		vi.advanceTimersByTime((3600 - 30) * 1000);
		await wrappedFetch('https://my.databricks.com/serving-endpoints');

		const sentAuth = mockFetch.mock.calls.map((call) =>
			new Headers((call[1] as RequestInit).headers).get('authorization'),
		);
		expect(sentAuth).toEqual(['Bearer token-a', 'Bearer token-b']);
	});
});
