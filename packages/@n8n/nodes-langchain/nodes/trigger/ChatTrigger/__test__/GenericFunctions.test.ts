import { Container } from '@n8n/di';
import type { ICredentialDataDecryptedObject, INode, IWebhookFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { generateChatUserAuthToken } from '../auth-token';
import { ChatTriggerAuthorizationError } from '../error';
import { validateAuth } from '../GenericFunctions';

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
		// the document has no origin, so `SameSite=Lax` never sends it.
		describe('x-auth-token from the sandboxed frame', () => {
			const node = {
				id: 'node-1',
				name: 'Chat Trigger',
				type: '@n8n/n8n-nodes-langchain.chatTrigger',
				typeVersion: 1.4,
				webhookId: 'webhook-1',
			} as INode;

			beforeEach(() => {
				vi.mocked(Container.get).mockReturnValue({ hmacSignatureSecret: 'test-secret' } as never);
				mockContext.getWebhookName.mockReturnValue('default');
				mockContext.getNode.mockReturnValue(node);
				mockContext.getNodeParameter.calledWith('mode', 'hostedChat').mockReturnValue('hostedChat');
				vi.stubEnv('N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2', 'true');
			});

			afterEach(() => {
				vi.unstubAllEnvs();
			});

			it('should pass with a token minted for this node', async () => {
				mockContext.getHeaderData.mockReturnValue({
					'x-auth-token': generateChatUserAuthToken(node, {
						id: 'user-1',
						email: 'user@example.com',
						firstName: 'Test',
						lastName: 'User',
					}),
				});

				await expect(validateAuth(mockContext)).resolves.toBeUndefined();
				expect(mockContext.validateCookieAuth).not.toHaveBeenCalled();
			});

			it('should throw 401 for a token it did not mint', async () => {
				mockContext.getHeaderData.mockReturnValue({ 'x-auth-token': 'not.a.token' });

				await expect(validateAuth(mockContext)).rejects.toMatchObject({
					responseCode: 401,
					message: 'Invalid authentication token',
				});
			});

			// The header only means anything on the split page, so with the flag off it
			// must not become a second way in.
			it('should ignore the header when the flag is off', async () => {
				vi.stubEnv('N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2', 'false');
				mockContext.getHeaderData.mockReturnValue({
					'x-auth-token': generateChatUserAuthToken(node, {
						id: 'user-1',
						email: 'user@example.com',
						firstName: 'Test',
						lastName: 'User',
					}),
				});

				await expect(validateAuth(mockContext)).rejects.toMatchObject({
					responseCode: 401,
					message: 'User not authenticated!',
				});
			});

			// Embedded (`webhook`) mode has no page to mint or carry this token, so a
			// call to it must keep working the same way it always has (the plain
			// session-cookie check) even if a hostedChat-minted token is replayed —
			// e.g. after switching a node's mode from hostedChat to webhook.
			it('falls back to the cookie check when mode is webhook, even with a valid token', async () => {
				mockContext.getNodeParameter.calledWith('mode', 'hostedChat').mockReturnValue('webhook');
				mockContext.getHeaderData.mockReturnValue({
					'x-auth-token': generateChatUserAuthToken(node, {
						id: 'user-1',
						email: 'user@example.com',
						firstName: 'Test',
						lastName: 'User',
					}),
				});

				await expect(validateAuth(mockContext)).rejects.toMatchObject({
					responseCode: 401,
					message: 'User not authenticated!',
				});
			});

			it('still passes via the cookie check in webhook mode when a valid token is also present', async () => {
				mockContext.getNodeParameter.calledWith('mode', 'hostedChat').mockReturnValue('webhook');
				mockContext.getHeaderData.mockReturnValue({
					'x-auth-token': generateChatUserAuthToken(node, {
						id: 'user-1',
						email: 'user@example.com',
						firstName: 'Test',
						lastName: 'User',
					}),
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
