import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { CHAT_MODEL_USER_AGENT } from '../constants';
import type { DatabricksOAuth2Credential } from '../token-provider';
import { getDatabricksTokenProvider } from '../token-provider';

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

const mockRefreshOAuth2Token = vi.fn();

const mockCtx = {
	getNode: () => mockNode,
	helpers: { refreshOAuth2Token: mockRefreshOAuth2Token },
} as unknown as ISupplyDataFunctions;

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
		const { getToken } = getDatabricksTokenProvider(mockCtx, mockCredential);

		await expect(getToken()).resolves.toBe('token-a');
		expect(MockClientOAuth2.init).toHaveBeenCalledWith({
			clientId: 'test-client-id',
			clientSecret: SENTINEL_SECRET,
			accessTokenUri: 'https://my.databricks.com/oidc/v1/token',
			scopes: ['all-apis'],
			authentication: 'header',
			headers: { 'User-Agent': CHAT_MODEL_USER_AGENT },
		});
	});

	it('should derive the mint URL from the host, ignoring a stored accessTokenUrl', async () => {
		mockGetToken.mockResolvedValue(tokenResponse('token-a', 3600));
		const poisoned = {
			...mockCredential,
			host: 'https://my.databricks.com/',
			accessTokenUrl: 'http://attacker.example/token',
		} as DatabricksOAuth2Credential;
		const { getToken } = getDatabricksTokenProvider(mockCtx, poisoned);

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
		const { getToken } = getDatabricksTokenProvider(mockCtx, mockCredential, egressFilter);

		await expect(getToken()).resolves.toBe('token-a');
		expect(MockClientOAuth2.init).toHaveBeenCalledWith(
			expect.objectContaining({ ssrfBridge: egressFilter }),
		);
	});

	it('should reuse the cached token before the 60s early-expiry buffer', async () => {
		vi.useFakeTimers();
		mockGetToken.mockResolvedValue(tokenResponse('token-a', 3600));
		const { getToken } = getDatabricksTokenProvider(mockCtx, mockCredential);

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
		const { getToken } = getDatabricksTokenProvider(mockCtx, mockCredential);

		await expect(getToken()).resolves.toBe('token-a');
		vi.advanceTimersByTime((3600 - 30) * 1000);
		await expect(getToken()).resolves.toBe('token-b');
		expect(mockGetToken).toHaveBeenCalledTimes(2);
	});

	it('should re-mint every call when expires_in is missing', async () => {
		mockGetToken
			.mockResolvedValueOnce(tokenResponse('token-a'))
			.mockResolvedValueOnce(tokenResponse('token-b'));
		const { getToken } = getDatabricksTokenProvider(mockCtx, mockCredential);

		await expect(getToken()).resolves.toBe('token-a');
		await expect(getToken()).resolves.toBe('token-b');
		expect(mockGetToken).toHaveBeenCalledTimes(2);
	});

	it('should cache when expires_in is a numeric string', async () => {
		mockGetToken.mockResolvedValue(tokenResponse('token-a', '3600'));
		const { getToken } = getDatabricksTokenProvider(mockCtx, mockCredential);

		await expect(getToken()).resolves.toBe('token-a');
		await expect(getToken()).resolves.toBe('token-a');
		expect(mockGetToken).toHaveBeenCalledTimes(1);
	});

	it('should share a single in-flight mint between concurrent callers', async () => {
		let resolveMint!: (value: ReturnType<typeof tokenResponse>) => void;
		mockGetToken.mockImplementation(
			async () => await new Promise((resolve) => (resolveMint = resolve)),
		);
		const { getToken } = getDatabricksTokenProvider(mockCtx, mockCredential);

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
		const { getToken } = getDatabricksTokenProvider(mockCtx, mockCredential);

		await expect(getToken()).rejects.toThrow(NodeOperationError);
		await expect(getToken()).resolves.toBe('token-a');
		expect(mockGetToken).toHaveBeenCalledTimes(2);
	});

	it('should wrap mint failures in a NodeOperationError that leaks no secret', async () => {
		mockGetToken.mockRejectedValue(new MockResponseError());
		const { getToken } = getDatabricksTokenProvider(mockCtx, mockCredential);

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
		const { getToken } = getDatabricksTokenProvider(mockCtx, mockCredential);

		const error = await getToken().then(
			() => {
				throw new Error('expected getToken to reject');
			},
			(e: NodeOperationError) => e,
		);

		expect(error.description).not.toContain(SENTINEL_SECRET);
		expect(error.description).toContain('***');
	});

	describe('authorizationCode grant', () => {
		const userCredential: DatabricksOAuth2Credential = {
			...mockCredential,
			grantType: 'authorizationCode',
			oauthTokenData: { access_token: 'user-token', refresh_token: 'refresh-a' },
		};

		it('should return the access token stored by the sign-in', async () => {
			const { getToken } = getDatabricksTokenProvider(mockCtx, userCredential);

			await expect(getToken()).resolves.toBe('user-token');
		});

		it('should never mint from the client secret', async () => {
			const { getToken } = getDatabricksTokenProvider(mockCtx, userCredential);

			await getToken();

			expect(MockClientOAuth2.init).not.toHaveBeenCalled();
			expect(mockGetToken).not.toHaveBeenCalled();
		});

		it('should tell the user to connect when the credential holds no token', async () => {
			const { getToken } = getDatabricksTokenProvider(mockCtx, {
				...userCredential,
				oauthTokenData: undefined,
			});

			await expect(getToken()).rejects.toThrow('Databricks credential is not connected');
		});
	});
});
