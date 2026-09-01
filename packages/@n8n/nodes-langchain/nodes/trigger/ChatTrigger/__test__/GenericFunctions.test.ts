import type { ICredentialDataDecryptedObject, IWebhookFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ChatTriggerAuthorizationError } from '../error';
import {
	establishChatSessionIdentity,
	resolveInnerFrameIdentity,
	validateAuth,
} from '../GenericFunctions';

describe('validateAuth', () => {
	const mockContext = mock<IWebhookFunctions>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('authentication = none', () => {
		it('should pass without error', async () => {
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

		it('should pass with correct credentials', async () => {
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

		it('should skip validation for setup webhook', async () => {
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
			mockContext.validateCookieAuth.mockResolvedValue({
				id: 'user-1',
				email: 'user@example.com',
				firstName: 'Test',
				lastName: 'User',
			});

			await expect(validateAuth(mockContext)).resolves.toBeUndefined();
			expect(mockContext.validateCookieAuth).toHaveBeenCalledWith('valid.jwt.token');
		});

		it('should pass when cookie has other cookies alongside n8n-auth', async () => {
			mockContext.getWebhookName.mockReturnValue('default');
			mockContext.getHeaderData.mockReturnValue({
				cookie: 'other=value; n8n-auth=valid.jwt.token; another=thing',
			});
			mockContext.validateCookieAuth.mockResolvedValue({
				id: 'user-1',
				email: 'user@example.com',
				firstName: 'Test',
				lastName: 'User',
			});

			await expect(validateAuth(mockContext)).resolves.toBeUndefined();
			expect(mockContext.validateCookieAuth).toHaveBeenCalledWith('valid.jwt.token');
		});

		// Messages sent from the sandboxed chat frame can't carry the session cookie:
		// the document has no origin, so `SameSite=Lax` never sends it. The frame
		// carries an AS-issued token instead, verified — and used to seed the run's
		// identity — through the shared trigger-identity pipeline.
		describe('x-auth-token from the sandboxed frame', () => {
			const resourceUrl = 'http://localhost:5678/webhook/abc/chat';
			const user = {
				id: 'user-1',
				email: 'user@example.com',
				firstName: 'Test',
				lastName: 'User',
			};

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
				mockContext.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user });

				await expect(validateAuth(mockContext)).resolves.toBeUndefined();

				expect(mockContext.validateN8nOAuth2Token).toHaveBeenCalledWith('as-token', resourceUrl);
				expect(mockContext.establishTriggerIdentity).toHaveBeenCalledWith(
					'as-token',
					resourceUrl,
					user.id,
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
				mockContext.validateCookieAuth.mockResolvedValue({
					id: 'user-1',
					email: 'user@example.com',
					firstName: 'Test',
					lastName: 'User',
				});

				await expect(validateAuth(mockContext)).resolves.toBeUndefined();
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
			end: vi.fn().mockReturnThis(),
			writeHead: vi.fn().mockReturnThis(),
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

	it('completes the AS callback, hands the token off via a one-hop cookie, and redirects to the clean shell URL', async () => {
		mockContext.getRequestObject.mockReturnValue({
			query: { code: 'auth-code', state: 'flow-state' },
			headers: {},
			originalUrl: '/webhook/abc/chat?code=auth-code&state=flow-state',
		} as never);
		mockContext.completeN8nOAuth2Flow.mockResolvedValue({ valid: true, token: 'as-token', user });

		const result = await establishChatSessionIdentity(mockContext, resourceUrl);

		expect(result).toBeNull();
		expect(mockContext.completeN8nOAuth2Flow).toHaveBeenCalledWith('auth-code', 'flow-state');
		expect(mockContext.getResponseObject().cookie).toHaveBeenCalledWith(
			'n8n-chat-oauth',
			'as-token',
			expect.objectContaining({ httpOnly: true }),
		);
		// Redirects to the plain top-level URL — never to the inner-frame URL, which
		// would render editor-ui/the AS callback inside the sandboxed frame.
		expect(mockContext.getResponseObject().writeHead).toHaveBeenCalledWith(302, {
			Location: '/webhook/abc/chat',
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
		mockContext.getRequestObject.mockReturnValue({
			query: {},
			headers: { cookie: 'n8n-chat-oauth=as-token' },
			originalUrl: '/webhook/abc/chat',
		} as never);
		mockContext.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user });

		const result = await establishChatSessionIdentity(mockContext, resourceUrl);

		expect(result).toEqual({ visitor: user, authToken: 'as-token' });
		expect(mockContext.validateN8nOAuth2Token).toHaveBeenCalledWith('as-token', resourceUrl);
		expect(mockContext.establishTriggerIdentity).toHaveBeenCalledWith(
			'as-token',
			resourceUrl,
			user.id,
		);
		expect(mockContext.getResponseObject().clearCookie).not.toHaveBeenCalled();
	});

	it('restarts the flow when the one-hop cookie fails to validate', async () => {
		mockContext.getRequestObject.mockReturnValue({
			query: {},
			headers: { cookie: 'n8n-chat-oauth=stale-token' },
			originalUrl: '/webhook/abc/chat',
		} as never);
		mockContext.validateN8nOAuth2Token.mockResolvedValue({ valid: false, reason: 'invalid_token' });
		mockContext.beginN8nOAuth2Flow.mockResolvedValue('https://as.example.com/authorize');

		const result = await establishChatSessionIdentity(mockContext, resourceUrl);

		expect(result).toBeNull();
		expect(mockContext.beginN8nOAuth2Flow).toHaveBeenCalledWith(resourceUrl);
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

	it('resolves the visitor from the one-hop cookie and clears it', async () => {
		mockContext.getRequestObject.mockReturnValue({
			headers: { cookie: 'n8n-chat-oauth=as-token' },
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

	it('returns null, without starting a new flow, when there is no cookie', async () => {
		mockContext.getRequestObject.mockReturnValue({ headers: {} } as never);

		const result = await resolveInnerFrameIdentity(mockContext, resourceUrl);

		expect(result).toBeNull();
		expect(mockContext.beginN8nOAuth2Flow).not.toHaveBeenCalled();
	});

	it('returns null, without starting a new flow, when the cookie fails to validate', async () => {
		mockContext.getRequestObject.mockReturnValue({
			headers: { cookie: 'n8n-chat-oauth=stale-token' },
		} as never);
		mockContext.validateN8nOAuth2Token.mockResolvedValue({ valid: false, reason: 'invalid_token' });

		const result = await resolveInnerFrameIdentity(mockContext, resourceUrl);

		expect(result).toBeNull();
		expect(mockContext.beginN8nOAuth2Flow).not.toHaveBeenCalled();
	});
});
