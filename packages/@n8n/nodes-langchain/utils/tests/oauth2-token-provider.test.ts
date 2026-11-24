import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import {
	createRefreshingOAuth2TokenProvider,
	findSessionExpiredError,
	OAuth2SessionExpiredError,
	type OAuth2TokenData,
	type OAuth2UserCredential,
} from '../oauth2-token-provider';

const mockNode: INode = {
	id: '1',
	name: 'Chat Model',
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

function tokenData(overrides: Partial<OAuth2TokenData> = {}): OAuth2TokenData {
	return {
		access_token: 'stored-token',
		refresh_token: 'refresh-a',
		expires_in: '3600',
		n8n_expires_at: String(Date.now() + 3600 * 1000),
		...overrides,
	};
}

function makeProvider(credential: OAuth2UserCredential) {
	return createRefreshingOAuth2TokenProvider({
		ctx: mockCtx,
		credentialType: 'databricksOAuth2Api',
		credential,
		serviceName: 'Databricks',
	});
}

beforeEach(() => vi.clearAllMocks());

describe('createRefreshingOAuth2TokenProvider', () => {
	it('should return the stored token without refreshing when it is fresh', async () => {
		const provider = makeProvider({ oauthTokenData: tokenData() });

		await expect(provider.getToken()).resolves.toBe('stored-token');
		expect(mockRefreshOAuth2Token).not.toHaveBeenCalled();
	});

	it('should refresh through core before returning a stale token', async () => {
		mockRefreshOAuth2Token.mockResolvedValue({ access_token: 'refreshed-token' });
		const provider = makeProvider({
			oauthTokenData: tokenData({ n8n_expires_at: String(Date.now() - 1000) }),
		});

		await expect(provider.getToken()).resolves.toBe('refreshed-token');
		expect(mockRefreshOAuth2Token).toHaveBeenCalledWith('databricksOAuth2Api');
	});

	it('should keep serving the refreshed token on later calls', async () => {
		mockRefreshOAuth2Token.mockResolvedValue({
			access_token: 'refreshed-token',
			refresh_token: 'refresh-b',
			expires_in: 3600,
			n8n_expires_at: String(Date.now() + 3600 * 1000),
		});
		const provider = makeProvider({
			oauthTokenData: tokenData({ n8n_expires_at: String(Date.now() - 1000) }),
		});

		await provider.getToken();
		await expect(provider.getToken()).resolves.toBe('refreshed-token');
		expect(mockRefreshOAuth2Token).toHaveBeenCalledTimes(1);
	});

	it('should fall back to the stored token when the refresh fails transiently', async () => {
		mockRefreshOAuth2Token.mockRejectedValue(new Error('socket hang up'));
		const provider = makeProvider({
			oauthTokenData: tokenData({ n8n_expires_at: String(Date.now() - 1000) }),
		});

		await expect(provider.getToken()).resolves.toBe('stored-token');
	});

	describe('when core reports the credential is dead', () => {
		// Core flags an unrecoverable grant as plain data on `failure`
		const deadCredential = () =>
			Object.assign(new Error('The credential "Databricks" needs to be reconnected.'), {
				failure: { cause: 'credential-invalid' },
				description: 'Open the credential and reconnect it to continue.',
			});

		const expiredProvider = () => {
			mockRefreshOAuth2Token.mockRejectedValue(deadCredential());
			return makeProvider({
				oauthTokenData: tokenData({ n8n_expires_at: String(Date.now() - 1000) }),
			});
		};

		it('should surface it instead of sending the expired token', async () => {
			await expect(expiredProvider().getToken()).rejects.toThrow(OAuth2SessionExpiredError);
		});

		it('should keep the reconnect advice readable', async () => {
			const error = await expiredProvider()
				.getToken()
				.catch((caught: OAuth2SessionExpiredError) => caught);

			expect(error).toBeInstanceOf(OAuth2SessionExpiredError);
			expect((error as OAuth2SessionExpiredError).message).toContain('needs to be reconnected');
			expect((error as OAuth2SessionExpiredError).description).toBe(
				'Open the credential and reconnect it to continue.',
			);
		});

		it('should surface it from the post-rejection retry as well', async () => {
			await expect(expiredProvider().refreshAfterRejection?.()).rejects.toThrow(
				OAuth2SessionExpiredError,
			);
		});

		it('should stay findable after a model SDK rewraps it', async () => {
			const original = await expiredProvider()
				.getToken()
				.catch((caught: OAuth2SessionExpiredError) => caught);

			expect(findSessionExpiredError(new Error('APIError', { cause: original }))).toBe(original);
		});
	});

	it('should ask the user to reconnect when the credential holds no token', async () => {
		const provider = makeProvider({ oauthTokenData: undefined });

		await expect(provider.getToken()).rejects.toThrow(OAuth2SessionExpiredError);
		await expect(provider.getToken()).rejects.toThrow('Databricks credential is not connected');
	});

	it('should take the expiry status from the credential', () => {
		expect(
			makeProvider({ oauthTokenData: tokenData(), tokenExpiredStatusCode: 403 }).expiredStatus,
		).toBe(403);
	});

	it('should default the expiry status to the RFC 6750 401', () => {
		expect(makeProvider({ oauthTokenData: tokenData() }).expiredStatus).toBe(401);
	});

	it('should report an unrecoverable session from refreshAfterRejection', async () => {
		mockRefreshOAuth2Token.mockRejectedValue(new Error('refresh token expired'));
		const provider = makeProvider({ oauthTokenData: tokenData() });

		await expect(provider.refreshAfterRejection!()).resolves.toBeNull();
	});
});

describe('findSessionExpiredError', () => {
	it('should find the error through a wrapping cause chain', () => {
		const original = new OAuth2SessionExpiredError(mockNode, 'session gone');
		const wrapped = new Error('Connection error.', {
			cause: new Error('inner', { cause: original }),
		});

		expect(findSessionExpiredError(wrapped)).toBe(original);
	});

	it('should return undefined for unrelated errors', () => {
		expect(findSessionExpiredError(new Error('boom'))).toBeUndefined();
	});

	it('should not loop on a self-referencing cause', () => {
		const looped: Error & { cause?: unknown } = new Error('loop');
		looped.cause = looped;

		expect(findSessionExpiredError(looped)).toBeUndefined();
	});
});
