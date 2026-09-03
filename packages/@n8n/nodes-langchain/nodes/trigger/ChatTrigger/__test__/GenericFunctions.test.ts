import type { ICredentialDataDecryptedObject, IWebhookFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ChatTriggerAuthorizationError } from '../error';
import {
	establishChatSessionIdentity,
	handleChatTokenRefresh,
	resolveInnerFrameIdentity,
	validateAuth,
} from '../GenericFunctions';

describe('validateAuth', () => {
	const mockContext = mock<IWebhookFunctions>();
	/** The n8n user every successful `n8nUserAuth` leg below resolves to. */
	const authedUser = {
		id: 'user-1',
		email: 'user@example.com',
		firstName: 'Test',
		lastName: 'User',
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('authentication = none', () => {
		it('should pass without error, and identify nobody', async () => {
			mockContext.getNodeParameter.calledWith('authentication').mockReturnValue('none');

			await expect(validateAuth(mockContext)).resolves.toBeUndefined();
		});
	});

	describe('authentication = basicAuth', () => {
		beforeEach(() => {
			mockContext.getNodeParameter.calledWith('authentication').mockReturnValue('basicAuth');
		});

		it('should throw 500 when credentials are not defined', async () => {
			mockContext.getCredentials.mockRejectedValue(new Error('No credentials'));

			await expect(validateAuth(mockContext)).rejects.toThrow(ChatTriggerAuthorizationError);
			await expect(validateAuth(mockContext)).rejects.toMatchObject({
				responseCode: 500,
			});
		});

		it('should throw 401 when no auth header is provided', async () => {
			mockContext.getCredentials.mockResolvedValue({
				user: 'admin',
				password: 'secret',
			} as ICredentialDataDecryptedObject);
			mockContext.getRequestObject.mockReturnValue({
				headers: {},
			} as never);

			await expect(validateAuth(mockContext)).rejects.toThrow(ChatTriggerAuthorizationError);
			await expect(validateAuth(mockContext)).rejects.toMatchObject({
				responseCode: 401,
			});
		});

		it('should throw 403 when credentials are wrong', async () => {
			mockContext.getCredentials.mockResolvedValue({
				user: 'admin',
				password: 'secret',
			} as ICredentialDataDecryptedObject);
			mockContext.getRequestObject.mockReturnValue({
				headers: {
					authorization: 'Basic ' + Buffer.from('admin:wrong').toString('base64'),
				},
			} as never);

			await expect(validateAuth(mockContext)).rejects.toThrow(ChatTriggerAuthorizationError);
			await expect(validateAuth(mockContext)).rejects.toMatchObject({
				responseCode: 403,
			});
		});

		it('should pass with correct credentials, and identify nobody', async () => {
			mockContext.getCredentials.mockResolvedValue({
				user: 'admin',
				password: 'secret',
			} as ICredentialDataDecryptedObject);
			mockContext.getRequestObject.mockReturnValue({
				headers: {
					authorization: 'Basic ' + Buffer.from('admin:secret').toString('base64'),
				},
			} as never);

			await expect(validateAuth(mockContext)).resolves.toBeUndefined();
		});
	});

	describe('authentication = n8nUserAuth', () => {
		beforeEach(() => {
			mockContext.getNodeParameter.calledWith('authentication').mockReturnValue('n8nUserAuth');
		});

		it('should skip validation for the setup webhook, and identify nobody', async () => {
			mockContext.getWebhookName.mockReturnValue('setup');
			mockContext.getHeaderData.mockReturnValue({});

			await expect(validateAuth(mockContext)).resolves.toBeUndefined();
		});

		it('should throw 401 when no n8n-auth cookie is present', async () => {
			mockContext.getWebhookName.mockReturnValue('default');
			mockContext.getHeaderData.mockReturnValue({});

			await expect(validateAuth(mockContext)).rejects.toThrow(ChatTriggerAuthorizationError);
			await expect(validateAuth(mockContext)).rejects.toMatchObject({
				responseCode: 401,
				message: 'User not authenticated!',
			});
		});

		it('should throw 401 when cookie has a fake/invalid token', async () => {
			mockContext.getWebhookName.mockReturnValue('default');
			mockContext.getHeaderData.mockReturnValue({
				cookie: 'n8n-auth=anything',
			});
			mockContext.validateCookieAuth.mockRejectedValue(new Error('Unauthorized'));

			await expect(validateAuth(mockContext)).rejects.toThrow(ChatTriggerAuthorizationError);
			await expect(validateAuth(mockContext)).rejects.toMatchObject({
				responseCode: 401,
				message: 'Invalid authentication token',
			});
		});

		it('should throw 401 when validateCookieAuth rejects (revoked token)', async () => {
			mockContext.getWebhookName.mockReturnValue('default');
			mockContext.getHeaderData.mockReturnValue({
				cookie: 'n8n-auth=some.revoked.token',
			});
			mockContext.validateCookieAuth.mockRejectedValue(new Error('Unauthorized'));

			await expect(validateAuth(mockContext)).rejects.toThrow(ChatTriggerAuthorizationError);
			await expect(validateAuth(mockContext)).rejects.toMatchObject({
				responseCode: 401,
				message: 'Invalid authentication token',
			});
		});

		it('should pass with a valid token', async () => {
			mockContext.getWebhookName.mockReturnValue('default');
			mockContext.getHeaderData.mockReturnValue({
				cookie: 'n8n-auth=valid.jwt.token',
			});
			mockContext.validateCookieAuth.mockResolvedValue(authedUser);

			await expect(validateAuth(mockContext)).resolves.toEqual(authedUser);
			expect(mockContext.validateCookieAuth).toHaveBeenCalledWith('valid.jwt.token');
		});

		it('should pass when cookie has other cookies alongside n8n-auth', async () => {
			mockContext.getWebhookName.mockReturnValue('default');
			mockContext.getHeaderData.mockReturnValue({
				cookie: 'other=value; n8n-auth=valid.jwt.token; another=thing',
			});
			mockContext.validateCookieAuth.mockResolvedValue(authedUser);

			await expect(validateAuth(mockContext)).resolves.toEqual(authedUser);
			expect(mockContext.validateCookieAuth).toHaveBeenCalledWith('valid.jwt.token');
		});

		// Messages sent from the sandboxed chat frame can't carry the session cookie:
		// the document has no origin, so `SameSite=Lax` never sends it. The frame
		// carries an AS-issued token instead, verified — and used to seed the run's
		// identity — through the shared trigger-identity pipeline.
		describe('x-auth-token from the sandboxed frame', () => {
			const resourceUrl = 'http://localhost:5678/webhook/abc/chat';

			beforeEach(() => {
				mockContext.getWebhookName.mockReturnValue('default');
				mockContext.getNodeParameter.calledWith('mode', 'hostedChat').mockReturnValue('hostedChat');
				mockContext.getWebhookResourceUrl.mockReturnValue(resourceUrl);
				vi.stubEnv('N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2', 'true');
			});

			afterEach(() => {
				vi.unstubAllEnvs();
			});

			it('establishes the trigger identity and passes for a valid token', async () => {
				mockContext.getHeaderData.mockReturnValue({ 'x-auth-token': 'as-token' });
				mockContext.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: authedUser });

				await expect(validateAuth(mockContext)).resolves.toEqual(authedUser);

				expect(mockContext.validateN8nOAuth2Token).toHaveBeenCalledWith('as-token', resourceUrl);
				expect(mockContext.establishTriggerIdentity).toHaveBeenCalledWith(
					'as-token',
					resourceUrl,
					authedUser.id,
				);
				expect(mockContext.validateCookieAuth).not.toHaveBeenCalled();
			});

			it('should throw 401 for a token the AS rejects', async () => {
				mockContext.getHeaderData.mockReturnValue({ 'x-auth-token': 'not-a-token' });
				mockContext.validateN8nOAuth2Token.mockResolvedValue({
					valid: false,
					reason: 'invalid_token',
				});

				await expect(validateAuth(mockContext)).rejects.toMatchObject({
					responseCode: 401,
					message: 'Invalid authentication token',
				});
				expect(mockContext.establishTriggerIdentity).not.toHaveBeenCalled();
			});

			it('should throw 401 when the resource URL cannot be resolved', async () => {
				mockContext.getHeaderData.mockReturnValue({ 'x-auth-token': 'as-token' });
				mockContext.getWebhookResourceUrl.mockReturnValue(undefined);

				await expect(validateAuth(mockContext)).rejects.toMatchObject({
					responseCode: 401,
					message: 'Invalid authentication token',
				});
				expect(mockContext.validateN8nOAuth2Token).not.toHaveBeenCalled();
			});

			// The header only means anything on the split page, so with the flag off it
			// must not become a second way in.
			it('should ignore the header when the flag is off', async () => {
				vi.stubEnv('N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2', 'false');
				mockContext.getHeaderData.mockReturnValue({ 'x-auth-token': 'as-token' });

				await expect(validateAuth(mockContext)).rejects.toMatchObject({
					responseCode: 401,
					message: 'User not authenticated!',
				});
				expect(mockContext.validateN8nOAuth2Token).not.toHaveBeenCalled();
			});

			// Embedded (`webhook`) mode has no page to mint or carry this token, so a
			// call to it must keep working the same way it always has (the plain
			// session-cookie check) even if a hostedChat-minted token is replayed —
			// e.g. after switching a node's mode from hostedChat to webhook.
			it('falls back to the cookie check when mode is webhook, even with a valid token', async () => {
				mockContext.getNodeParameter.calledWith('mode', 'hostedChat').mockReturnValue('webhook');
				mockContext.getHeaderData.mockReturnValue({
					'x-auth-token': 'as-token',
				});

				await expect(validateAuth(mockContext)).rejects.toMatchObject({
					responseCode: 401,
					message: 'User not authenticated!',
				});
				expect(mockContext.validateN8nOAuth2Token).not.toHaveBeenCalled();
			});

			it('still passes via the cookie check in webhook mode when a valid token is also present', async () => {
				mockContext.getNodeParameter.calledWith('mode', 'hostedChat').mockReturnValue('webhook');
				mockContext.getHeaderData.mockReturnValue({
					'x-auth-token': 'as-token',
					cookie: 'n8n-auth=valid.jwt.token',
				});
				mockContext.validateCookieAuth.mockResolvedValue(authedUser);

				await expect(validateAuth(mockContext)).resolves.toEqual(authedUser);
				expect(mockContext.validateCookieAuth).toHaveBeenCalledWith('valid.jwt.token');
			});
		});
	});
});

describe('establishChatSessionIdentity', () => {
	const mockContext = mock<IWebhookFunctions>();
	const resourceUrl = 'http://localhost:5678/webhook/abc/chat';
	const user = {
		id: 'user-1',
		email: 'visitor@example.com',
		firstName: 'Vi',
		lastName: 'Sitor',
	};

	const mockRes = () => {
		const res = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
			end: vi.fn().mockReturnThis(),
			writeHead: vi.fn().mockReturnThis(),
			setHeader: vi.fn().mockReturnThis(),
			cookie: vi.fn().mockReturnThis(),
			clearCookie: vi.fn().mockReturnThis(),
		};
		return res as never;
	};

	/** The payload the one-hop cookie carries, percent-encoded as a browser sends it. */
	const oauthCookie = (token: string, expiresAt: number) =>
		`n8n-chat-oauth=${encodeURIComponent(JSON.stringify({ t: token, e: expiresAt }))}`;

	beforeEach(() => {
		vi.clearAllMocks();
		mockContext.getResponseObject.mockReturnValue(mockRes());
		mockContext.logger = { warn: vi.fn() } as never;
	});

	it('starts the AS flow on a fresh request with no cookie', async () => {
		mockContext.getRequestObject.mockReturnValue({
			query: {},
			headers: {},
			originalUrl: '/webhook/abc/chat',
		} as never);
		mockContext.beginN8nOAuth2Flow.mockResolvedValue('https://as.example.com/authorize');

		const result = await establishChatSessionIdentity(mockContext, resourceUrl);

		expect(result).toBeNull();
		expect(mockContext.beginN8nOAuth2Flow).toHaveBeenCalledWith(resourceUrl);
		expect(mockContext.getResponseObject().writeHead).toHaveBeenCalledWith(302, {
			Location: 'https://as.example.com/authorize',
		});
	});

	it('completes the AS callback, hands both cookies off, and preserves the page query across the redirect', async () => {
		mockContext.getRequestObject.mockReturnValue({
			query: { code: 'auth-code', state: 'flow-state', foo: 'bar' },
			headers: {},
			originalUrl: '/webhook/abc/chat?code=auth-code&state=flow-state&foo=bar',
		} as never);
		mockContext.completeN8nOAuth2Flow.mockResolvedValue({
			valid: true,
			token: 'as-token',
			refreshToken: 'refresh-token',
			expiresIn: 3600,
			user,
		});

		const result = await establishChatSessionIdentity(mockContext, resourceUrl);

		expect(result).toBeNull();
		expect(mockContext.completeN8nOAuth2Flow).toHaveBeenCalledWith('auth-code', 'flow-state');
		expect(mockContext.getResponseObject().cookie).toHaveBeenCalledWith(
			'n8n-chat-oauth',
			expect.stringContaining('as-token'),
			expect.objectContaining({ httpOnly: true }),
		);
		// The refresh token gets its own long-lived httpOnly cookie; nothing else
		// carries it, so it never reaches a document.
		expect(mockContext.getResponseObject().cookie).toHaveBeenCalledWith(
			'n8n-chat-oauth-refresh',
			'refresh-token',
			expect.objectContaining({ httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 }),
		);
		// Redirects to the plain top-level URL — never to the inner-frame URL, which
		// would render editor-ui/the AS callback inside the sandboxed frame.
		expect(mockContext.getResponseObject().writeHead).toHaveBeenCalledWith(302, {
			Location: '/webhook/abc/chat?foo=bar',
		});
	});

	it('restarts the flow when the callback is invalid', async () => {
		mockContext.getRequestObject.mockReturnValue({
			query: { code: 'auth-code', state: 'stale-state' },
			headers: {},
			originalUrl: '/webhook/abc/chat?code=auth-code&state=stale-state',
		} as never);
		mockContext.completeN8nOAuth2Flow.mockResolvedValue({ valid: false, reason: 'expired' });
		mockContext.beginN8nOAuth2Flow.mockResolvedValue('https://as.example.com/authorize');

		const result = await establishChatSessionIdentity(mockContext, resourceUrl);

		expect(result).toBeNull();
		expect(mockContext.beginN8nOAuth2Flow).toHaveBeenCalledWith(resourceUrl);
	});

	it('confirms readiness from the one-hop cookie without clearing it, leaving it for the frame', async () => {
		const expiresAt = Date.now() + 3_600_000;
		mockContext.getRequestObject.mockReturnValue({
			query: {},
			headers: { cookie: oauthCookie('as-token', expiresAt) },
			originalUrl: '/webhook/abc/chat',
		} as never);
		mockContext.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user });

		const result = await establishChatSessionIdentity(mockContext, resourceUrl);

		expect(result).toMatchObject({ visitor: user, authToken: 'as-token' });
		// Converted from the cookie's absolute expiry here, on the clock that wrote it,
		// so no server timestamp reaches the shell.
		expect(result?.expiresIn).toBeGreaterThan(3590);
		expect(result?.expiresIn).toBeLessThanOrEqual(3600);
		expect(mockContext.validateN8nOAuth2Token).toHaveBeenCalledWith('as-token', resourceUrl);
		expect(mockContext.establishTriggerIdentity).toHaveBeenCalledWith(
			'as-token',
			resourceUrl,
			user.id,
		);
		expect(mockContext.getResponseObject().clearCookie).not.toHaveBeenCalled();
		expect(mockContext.refreshN8nOAuth2Flow).not.toHaveBeenCalled();
	});

	it('restarts the flow when the one-hop cookie fails to validate', async () => {
		mockContext.getRequestObject.mockReturnValue({
			query: {},
			headers: { cookie: oauthCookie('stale-token', Date.now() + 3_600_000) },
			originalUrl: '/webhook/abc/chat',
		} as never);
		mockContext.validateN8nOAuth2Token.mockResolvedValue({ valid: false, reason: 'invalid_token' });
		mockContext.beginN8nOAuth2Flow.mockResolvedValue('https://as.example.com/authorize');

		const result = await establishChatSessionIdentity(mockContext, resourceUrl);

		expect(result).toBeNull();
		expect(mockContext.beginN8nOAuth2Flow).toHaveBeenCalledWith(resourceUrl);
	});

	// A reload mid-conversation: the 60-second one-hop cookie is long gone, but the
	// grant behind the refresh cookie is still live, so rotating beats a full round
	// trip back through the AS.
	it('refreshes from the refresh cookie when the one-hop cookie has expired', async () => {
		mockContext.getRequestObject.mockReturnValue({
			query: {},
			headers: { cookie: 'n8n-chat-oauth-refresh=refresh-token' },
			originalUrl: '/webhook/abc/chat',
		} as never);
		mockContext.refreshN8nOAuth2Flow.mockResolvedValue({
			valid: true,
			token: 'fresh-token',
			refreshToken: 'rotated-token',
			expiresIn: 3600,
		});
		mockContext.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user });

		const result = await establishChatSessionIdentity(mockContext, resourceUrl);

		expect(mockContext.refreshN8nOAuth2Flow).toHaveBeenCalledWith('refresh-token', resourceUrl);
		// The AS's own duration, handed on untouched — the shell schedules off its own clock.
		expect(result).toEqual({ visitor: user, authToken: 'fresh-token', expiresIn: 3600 });
		expect(mockContext.beginN8nOAuth2Flow).not.toHaveBeenCalled();
		// A refresh result names no user, so the fresh token is validated to recover the
		// visitor the connect panel is rendered for.
		expect(mockContext.establishTriggerIdentity).toHaveBeenCalledWith(
			'fresh-token',
			resourceUrl,
			user.id,
		);
		// Both cookies are rewritten: the frame's next GET needs the new access token,
		// and the rotated refresh token replaces the one just consumed.
		expect(mockContext.getResponseObject().cookie).toHaveBeenCalledWith(
			'n8n-chat-oauth',
			expect.stringContaining('fresh-token'),
			expect.objectContaining({ httpOnly: true }),
		);
		expect(mockContext.getResponseObject().cookie).toHaveBeenCalledWith(
			'n8n-chat-oauth-refresh',
			'rotated-token',
			expect.objectContaining({ httpOnly: true }),
		);
	});

	it('restarts the flow when the refresh cookie is refused', async () => {
		mockContext.getRequestObject.mockReturnValue({
			query: {},
			headers: { cookie: 'n8n-chat-oauth-refresh=consumed-token' },
			originalUrl: '/webhook/abc/chat',
		} as never);
		mockContext.refreshN8nOAuth2Flow.mockResolvedValue({
			valid: false,
			reason: 'invalid_grant',
		});
		mockContext.beginN8nOAuth2Flow.mockResolvedValue('https://as.example.com/authorize');

		const result = await establishChatSessionIdentity(mockContext, resourceUrl);

		expect(result).toBeNull();
		expect(mockContext.beginN8nOAuth2Flow).toHaveBeenCalledWith(resourceUrl);
	});

	// Nothing ever clears the refresh cookie, so a cookie the AS has finished with has
	// to heal itself. It does: the refresh fails, the visitor is sent through the AS,
	// and the callback writes a live token over the dead one.
	it('overwrites a stale refresh cookie rather than needing it cleared', async () => {
		mockContext.getRequestObject.mockReturnValue({
			query: {},
			headers: { cookie: 'n8n-chat-oauth-refresh=long-dead-token' },
			originalUrl: '/webhook/abc/chat',
		} as never);
		mockContext.refreshN8nOAuth2Flow.mockResolvedValue({ valid: false, reason: 'invalid_grant' });
		mockContext.beginN8nOAuth2Flow.mockResolvedValue('https://as.example.com/authorize');

		expect(await establishChatSessionIdentity(mockContext, resourceUrl)).toBeNull();
		expect(mockContext.getResponseObject().clearCookie).not.toHaveBeenCalled();
		expect(mockContext.getResponseObject().writeHead).toHaveBeenCalledWith(302, {
			Location: 'https://as.example.com/authorize',
		});

		// The AS auto-approves against the visitor's existing consent, so this leg is
		// silent, and its callback replaces the dead cookie.
		mockContext.getResponseObject.mockReturnValue(mockRes());
		mockContext.getRequestObject.mockReturnValue({
			query: { code: 'auth-code', state: 'flow-state' },
			headers: { cookie: 'n8n-chat-oauth-refresh=long-dead-token' },
			originalUrl: '/webhook/abc/chat?code=auth-code&state=flow-state',
		} as never);
		mockContext.completeN8nOAuth2Flow.mockResolvedValue({
			valid: true,
			token: 'as-token',
			refreshToken: 'brand-new-refresh-token',
			expiresIn: 3600,
			user,
		});

		expect(await establishChatSessionIdentity(mockContext, resourceUrl)).toBeNull();
		expect(mockContext.getResponseObject().cookie).toHaveBeenCalledWith(
			'n8n-chat-oauth-refresh',
			'brand-new-refresh-token',
			expect.objectContaining({ httpOnly: true }),
		);
		expect(mockContext.getResponseObject().clearCookie).not.toHaveBeenCalled();
	});

	it('reports denial without restarting the flow', async () => {
		mockContext.getRequestObject.mockReturnValue({
			query: { error: 'access_denied' },
			headers: {},
			originalUrl: '/webhook/abc/chat?error=access_denied',
		} as never);

		const result = await establishChatSessionIdentity(mockContext, resourceUrl);

		expect(result).toBeNull();
		expect(mockContext.getResponseObject().status).toHaveBeenCalledWith(403);
		expect(mockContext.beginN8nOAuth2Flow).not.toHaveBeenCalled();
	});
});

describe('handleChatTokenRefresh', () => {
	const mockContext = mock<IWebhookFunctions>();
	const resourceUrl = 'http://localhost:5678/webhook/abc/chat';

	const mockRes = () => {
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
			end: vi.fn().mockReturnThis(),
			setHeader: vi.fn().mockReturnThis(),
			cookie: vi.fn().mockReturnThis(),
			clearCookie: vi.fn().mockReturnThis(),
		};
		return res as never;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockContext.getResponseObject.mockReturnValue(mockRes());
		mockContext.logger = { warn: vi.fn() } as never;
	});

	it('rotates the grant and returns only the access token and its lifetime', async () => {
		mockContext.getRequestObject.mockReturnValue({
			headers: { cookie: 'n8n-chat-oauth-refresh=refresh-token' },
		} as never);
		mockContext.refreshN8nOAuth2Flow.mockResolvedValue({
			valid: true,
			token: 'fresh-token',
			refreshToken: 'rotated-token',
			expiresIn: 3600,
		});

		await handleChatTokenRefresh(mockContext, resourceUrl);

		const res = mockContext.getResponseObject();
		expect(mockContext.refreshN8nOAuth2Flow).toHaveBeenCalledWith('refresh-token', resourceUrl);
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({ token: 'fresh-token', expiresIn: 3600 });
		// The rotated refresh token stays in its httpOnly cookie and never reaches the page.
		expect(res.json).not.toHaveBeenCalledWith(
			expect.objectContaining({ refreshToken: expect.anything() }),
		);
		expect(res.cookie).toHaveBeenCalledWith(
			'n8n-chat-oauth-refresh',
			'rotated-token',
			expect.objectContaining({ httpOnly: true }),
		);
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
	});

	it('answers 401 without calling the AS when there is no refresh cookie', async () => {
		mockContext.getRequestObject.mockReturnValue({ headers: {} } as never);

		await handleChatTokenRefresh(mockContext, resourceUrl);

		expect(mockContext.refreshN8nOAuth2Flow).not.toHaveBeenCalled();
		expect(mockContext.getResponseObject().status).toHaveBeenCalledWith(401);
		expect(mockContext.getResponseObject().json).toHaveBeenCalledWith({ error: 'invalid_grant' });
	});

	// A token a concurrent refresh already consumed loses the AS's atomic rotation
	// race. The page must be told to stop — but the cookie belongs to the winner by
	// then, so clearing it would erase a live grant.
	it('answers 401 without touching the refresh cookie when the AS refuses the token', async () => {
		mockContext.getRequestObject.mockReturnValue({
			headers: { cookie: 'n8n-chat-oauth-refresh=consumed-token' },
		} as never);
		mockContext.refreshN8nOAuth2Flow.mockResolvedValue({
			valid: false,
			reason: 'invalid_grant',
		});

		await handleChatTokenRefresh(mockContext, resourceUrl);

		const res = mockContext.getResponseObject();
		expect(res.clearCookie).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: 'invalid_grant' });
	});

	// Two tabs on one chat page share the single cookie slot on that path. The loser
	// must leave the winner's rotated token alone: it is the only copy of the grant.
	it('leaves a cookie a concurrent shell just rotated intact', async () => {
		mockContext.getRequestObject.mockReturnValue({
			headers: { cookie: 'n8n-chat-oauth-refresh=rotated-by-the-winner' },
		} as never);
		mockContext.refreshN8nOAuth2Flow.mockResolvedValueOnce({
			valid: false,
			reason: 'invalid_grant',
		});

		await handleChatTokenRefresh(mockContext, resourceUrl);

		const loserRes = mockContext.getResponseObject();
		expect(loserRes.status).toHaveBeenCalledWith(401);
		expect(loserRes.clearCookie).not.toHaveBeenCalled();

		// The loser's 5s retry now presents the same cookie, which the winner rotated.
		mockContext.getResponseObject.mockReturnValue(mockRes());
		mockContext.refreshN8nOAuth2Flow.mockResolvedValueOnce({
			valid: true,
			token: 'fresh-token',
			refreshToken: 'rotated-again',
			expiresIn: 3600,
		});

		await handleChatTokenRefresh(mockContext, resourceUrl);

		const retryRes = mockContext.getResponseObject();
		expect(retryRes.status).toHaveBeenCalledWith(200);
		expect(retryRes.json).toHaveBeenCalledWith({ token: 'fresh-token', expiresIn: 3600 });
		expect(retryRes.clearCookie).not.toHaveBeenCalled();
	});

	it('answers 401 rather than throwing when the AS call itself fails', async () => {
		mockContext.getRequestObject.mockReturnValue({
			headers: { cookie: 'n8n-chat-oauth-refresh=refresh-token' },
		} as never);
		mockContext.refreshN8nOAuth2Flow.mockRejectedValue(new Error('AS unreachable'));

		await expect(handleChatTokenRefresh(mockContext, resourceUrl)).resolves.toBeUndefined();

		const res = mockContext.getResponseObject();
		expect(res.status).toHaveBeenCalledWith(401);
		// A transient AS failure says nothing about the grant, so the cookie stays.
		expect(res.clearCookie).not.toHaveBeenCalled();
	});
});

describe('resolveInnerFrameIdentity', () => {
	const mockContext = mock<IWebhookFunctions>();
	const resourceUrl = 'http://localhost:5678/webhook/abc/chat';
	const user = {
		id: 'user-1',
		email: 'visitor@example.com',
		firstName: 'Vi',
		lastName: 'Sitor',
	};

	const mockRes = () => {
		const res = {
			clearCookie: vi.fn().mockReturnThis(),
		};
		return res as never;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockContext.getResponseObject.mockReturnValue(mockRes());
	});

	/** The payload the one-hop cookie carries, percent-encoded as a browser sends it. */
	const oauthCookie = (token: string) =>
		`n8n-chat-oauth=${encodeURIComponent(JSON.stringify({ t: token, e: Date.now() + 3_600_000 }))}`;

	it('resolves the visitor from the one-hop cookie and clears it', async () => {
		mockContext.getRequestObject.mockReturnValue({
			headers: { cookie: oauthCookie('as-token') },
		} as never);
		mockContext.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user });

		const result = await resolveInnerFrameIdentity(mockContext, resourceUrl);

		expect(result).toEqual({ visitor: user, authToken: 'as-token' });
		expect(mockContext.validateN8nOAuth2Token).toHaveBeenCalledWith('as-token', resourceUrl);
		expect(mockContext.getResponseObject().clearCookie).toHaveBeenCalledWith(
			'n8n-chat-oauth',
			expect.objectContaining({ httpOnly: true }),
		);
	});

	// Every later refresh the shell asks for is authenticated by the refresh cookie,
	// so this render must leave it alone.
	it('leaves the refresh cookie in place', async () => {
		mockContext.getRequestObject.mockReturnValue({
			headers: { cookie: `${oauthCookie('as-token')}; n8n-chat-oauth-refresh=refresh-token` },
		} as never);
		mockContext.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user });

		await resolveInnerFrameIdentity(mockContext, resourceUrl);

		expect(mockContext.getResponseObject().clearCookie).not.toHaveBeenCalledWith(
			'n8n-chat-oauth-refresh',
			expect.anything(),
		);
	});

	it('returns null, without starting a new flow, when there is no cookie', async () => {
		mockContext.getRequestObject.mockReturnValue({ headers: {} } as never);

		const result = await resolveInnerFrameIdentity(mockContext, resourceUrl);

		expect(result).toBeNull();
		expect(mockContext.beginN8nOAuth2Flow).not.toHaveBeenCalled();
	});

	it('returns null, without starting a new flow, when the cookie fails to validate', async () => {
		mockContext.getRequestObject.mockReturnValue({
			headers: { cookie: oauthCookie('stale-token') },
		} as never);
		mockContext.validateN8nOAuth2Token.mockResolvedValue({ valid: false, reason: 'invalid_token' });

		const result = await resolveInnerFrameIdentity(mockContext, resourceUrl);

		expect(result).toBeNull();
		expect(mockContext.beginN8nOAuth2Flow).not.toHaveBeenCalled();
	});
});
