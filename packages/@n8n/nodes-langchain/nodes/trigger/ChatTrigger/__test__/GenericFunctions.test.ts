import { mock } from 'jest-mock-extended';
import type { ICredentialDataDecryptedObject, IWebhookFunctions } from 'n8n-workflow';

import { ChatTriggerAuthorizationError } from '../error';
import { validateAuth } from '../GenericFunctions';

describe('validateAuth', () => {
	const mockContext = mock<IWebhookFunctions>();

	beforeEach(() => {
		jest.clearAllMocks();
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
			mockContext.validateCookieAuth.mockResolvedValue(undefined);

			await expect(validateAuth(mockContext)).resolves.toBeUndefined();
			expect(mockContext.validateCookieAuth).toHaveBeenCalledWith('valid.jwt.token');
		});

		it('should pass when cookie has other cookies alongside n8n-auth', async () => {
			mockContext.getWebhookName.mockReturnValue('default');
			mockContext.getHeaderData.mockReturnValue({
				cookie: 'other=value; n8n-auth=valid.jwt.token; another=thing',
			});
			mockContext.validateCookieAuth.mockResolvedValue(undefined);

			await expect(validateAuth(mockContext)).resolves.toBeUndefined();
			expect(mockContext.validateCookieAuth).toHaveBeenCalledWith('valid.jwt.token');
		});
	});
});
