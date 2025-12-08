import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, CredentialsEntity, ICredentialsDb, User } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { OauthService, OauthVersion, shouldSkipAuthOnOAuthCallback } from '@/oauth/oauth.service';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsHelper } from '@/credentials-helper';
import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { OAuthRequest } from '@/requests';
import { UrlService } from '@/services/url.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

jest.mock('@/workflow-execute-additional-data');

describe('OauthService', () => {
	const logger = mockInstance(Logger);
	const credentialsHelper = mockInstance(CredentialsHelper);
	const credentialsRepository = mockInstance(CredentialsRepository);
	const credentialsFinderService = mockInstance(CredentialsFinderService);
	const urlService = mockInstance(UrlService);
	const globalConfig = mockInstance(GlobalConfig);

	let service: OauthService;

	const timestamp = 1706750625678;
	jest.useFakeTimers({ advanceTimers: true });

	beforeEach(() => {
		jest.setSystemTime(new Date(timestamp));
		jest.clearAllMocks();

		globalConfig.endpoints = { rest: 'rest' } as any;
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');
		jest
			.mocked(WorkflowExecuteAdditionalData.getBase)
			.mockResolvedValue(mock<IWorkflowExecuteAdditionalData>());

		service = new OauthService(
			logger,
			credentialsHelper,
			credentialsRepository,
			credentialsFinderService,
			urlService,
			globalConfig,
		);
	});

	describe('shouldSkipAuthOnOAuthCallback', () => {
		it('should return false when env var is not set', () => {
			delete process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK;
			expect(shouldSkipAuthOnOAuthCallback()).toBe(false);
		});

		it('should return false when env var is "false"', () => {
			process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK = 'false';
			expect(shouldSkipAuthOnOAuthCallback()).toBe(false);
		});

		it('should return true when env var is "true"', () => {
			process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK = 'true';
			expect(shouldSkipAuthOnOAuthCallback()).toBe(true);
		});

		it('should return true when env var is "TRUE" (case insensitive)', () => {
			process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK = 'TRUE';
			expect(shouldSkipAuthOnOAuthCallback()).toBe(true);
		});
	});

	describe('getBaseUrl', () => {
		it('should return correct URL for OAuth1', () => {
			const url = service.getBaseUrl(OauthVersion.V1);
			expect(url).toBe('http://localhost:5678/rest/oauth1-credential');
			expect(urlService.getInstanceBaseUrl).toHaveBeenCalled();
		});

		it('should return correct URL for OAuth2', () => {
			const url = service.getBaseUrl(OauthVersion.V2);
			expect(url).toBe('http://localhost:5678/rest/oauth2-credential');
		});
	});

	describe('getCredential', () => {
		it('should throw BadRequestError when credential ID is missing', async () => {
			const req = {
				query: {},
				user: mock<User>({ id: '123' }),
			} as unknown as OAuthRequest.OAuth2Credential.Auth;

			Object.defineProperty(req.query, 'id', {
				value: undefined,
				writable: true,
				enumerable: true,
			});

			const promise = service.getCredential(req);
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow('Required credential ID is missing');
		});

		it('should throw NotFoundError when credential is not found', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({
				query: { id: 'credential-id' },
				user: mock<User>({ id: '123' }),
			});

			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			await expect(service.getCredential(req)).rejects.toThrow(NotFoundError);
			expect(logger.error).toHaveBeenCalledWith(
				'OAuth credential authorization failed because the current user does not have the correct permissions',
				{ userId: '123' },
			);
		});

		it('should return credential when found', async () => {
			const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({
				query: { id: 'credential-id' },
				user: mock<User>({ id: '123' }),
			});

			credentialsFinderService.findCredentialForUser.mockResolvedValue(mockCredential);

			const result = await service.getCredential(req);

			expect(result).toBe(mockCredential);
			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				'credential-id',
				req.user,
				['credential:read'],
			);
		});
	});

	describe('getAdditionalData', () => {
		it('should return workflow execute additional data', async () => {
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();
			jest.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);

			const result = await (service as any).getAdditionalData();

			expect(result).toBe(mockAdditionalData);
			expect(WorkflowExecuteAdditionalData.getBase).toHaveBeenCalled();
		});
	});

	describe('getDecryptedDataForAuthUri', () => {
		it('should call getDecryptedData with raw=false', async () => {
			const credential = mock<ICredentialsDb>({ id: '1', type: 'test' });
			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const mockDecryptedData = { clientId: 'test' };

			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);

			const result = await (service as any).getDecryptedDataForAuthUri(credential, additionalData);

			expect(result).toBe(mockDecryptedData);
			expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
				additionalData,
				credential,
				credential.type,
				'internal',
				undefined,
				false,
			);
		});
	});

	describe('getDecryptedDataForCallback', () => {
		it('should call getDecryptedData with raw=true', async () => {
			const credential = mock<ICredentialsDb>({ id: '1', type: 'test' });
			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const mockDecryptedData = { csrfSecret: 'secret' };

			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);

			const result = await (service as any).getDecryptedDataForCallback(credential, additionalData);

			expect(result).toBe(mockDecryptedData);
			expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
				additionalData,
				credential,
				credential.type,
				'internal',
				undefined,
				true,
			);
		});
	});

	describe('applyDefaultsAndOverwrites', () => {
		it('should apply defaults and overwrites', async () => {
			const credential = mock<ICredentialsDb>({ id: '1', type: 'test' });
			const decryptedData = { clientId: 'test' };
			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			const mockResult = { clientId: 'test', clientSecret: 'secret' };

			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockResult);

			const result = await (service as any).applyDefaultsAndOverwrites(
				credential,
				decryptedData,
				additionalData,
			);

			expect(result).toBe(mockResult);
			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				additionalData,
				decryptedData,
				credential,
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});
	});

	describe('encryptAndSaveData', () => {
		it('should encrypt and save data to repository', async () => {
			const { Cipher } = await import('n8n-core');
			const cipher = Container.get(Cipher);
			const encryptedData = cipher.encrypt({ existing: 'data' });

			const credential = mock<ICredentialsDb>({
				id: '1',
				type: 'test',
				data: encryptedData,
			});
			const toUpdate = { clientId: 'new-id' };
			const toDelete = ['oldField'];

			await service.encryptAndSaveData(credential, toUpdate, toDelete);

			expect(credentialsRepository.update).toHaveBeenCalledWith('1', {
				id: '1',
				name: expect.anything(),
				type: 'test',
				data: expect.any(String),
				updatedAt: expect.any(Date),
			});
		});

		it('should use empty array for toDelete when not provided', async () => {
			const { Cipher } = await import('n8n-core');
			const cipher = Container.get(Cipher);
			const encryptedData = cipher.encrypt({ existing: 'data' });

			const credential = mock<ICredentialsDb>({
				id: '1',
				type: 'test',
				data: encryptedData,
			});
			const toUpdate = { clientId: 'new-id' };

			await service.encryptAndSaveData(credential, toUpdate);

			expect(credentialsRepository.update).toHaveBeenCalledWith('1', {
				id: '1',
				name: expect.anything(),
				type: 'test',
				data: expect.any(String),
				updatedAt: expect.any(Date),
			});
		});
	});

	describe('getCredentialWithoutUser', () => {
		it('should return credential from repository', async () => {
			const mockCredential = mock<ICredentialsDb>({ id: '1' });
			credentialsRepository.findOneBy.mockResolvedValue(mockCredential as any);

			const result = await (service as any).getCredentialWithoutUser('1');

			expect(result).toBe(mockCredential);
			expect(credentialsRepository.findOneBy).toHaveBeenCalledWith({ id: '1' });
		});

		it('should return null when credential not found', async () => {
			credentialsRepository.findOneBy.mockResolvedValue(null);

			const result = await (service as any).getCredentialWithoutUser('1');

			expect(result).toBeNull();
		});
	});

	describe('createCsrfState', () => {
		it('should create CSRF state with correct structure', () => {
			const data = { cid: 'credential-id', userId: 'user-id' };
			jest.setSystemTime(new Date(timestamp));

			const [csrfSecret, encodedState] = service.createCsrfState(data);

			expect(typeof csrfSecret).toBe('string');
			expect(csrfSecret.length).toBeGreaterThan(0);

			const decoded = JSON.parse(Buffer.from(encodedState, 'base64').toString());
			expect(decoded.cid).toBe('credential-id');
			expect(decoded.userId).toBe('user-id');
			expect(decoded.token).toBeDefined();
			expect(decoded.createdAt).toBe(timestamp);
		});

		it('should include additional data in state', () => {
			const data = { cid: 'credential-id', customField: 'custom-value' };
			jest.setSystemTime(new Date(timestamp));

			const [, encodedState] = service.createCsrfState(data);

			const decoded = JSON.parse(Buffer.from(encodedState, 'base64').toString());
			expect(decoded.customField).toBe('custom-value');
		});
	});

	describe('decodeCsrfState', () => {
		it('should decode valid CSRF state', () => {
			const state = {
				token: 'token',
				cid: 'credential-id',
				userId: 'user-id',
				createdAt: timestamp,
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			const result = (service as any).decodeCsrfState(encodedState, req);

			expect(result).toEqual(state);
		});

		it('should throw error when state format is invalid', () => {
			const invalidState = 'not-base64-json';
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			expect(() => (service as any).decodeCsrfState(invalidState, req)).toThrow(
				'Invalid state format',
			);
		});

		it('should throw UnexpectedError when cid is missing', () => {
			const state = {
				token: 'token',
				createdAt: timestamp,
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow(UnexpectedError);
		});

		it('should throw UnexpectedError when token is missing', () => {
			const state = {
				cid: 'credential-id',
				createdAt: timestamp,
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow(UnexpectedError);
		});

		it('should throw AuthError when userId does not match', () => {
			const state = {
				token: 'token',
				cid: 'credential-id',
				userId: 'different-user-id',
				createdAt: timestamp,
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow(AuthError);
			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow('Unauthorized');
		});

		it('should throw AuthError when req.user is undefined', () => {
			const state = {
				token: 'token',
				cid: 'credential-id',
				userId: 'user-id',
				createdAt: timestamp,
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			const req = mock<AuthenticatedRequest>({
				user: undefined,
			});

			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow(AuthError);
		});
	});

	describe('verifyCsrfState', () => {
		it('should return true for valid CSRF state', () => {
			const csrfSecret = 'csrf-secret';
			const token = new (require('csrf'))();
			const stateToken = token.create(csrfSecret);

			const state = {
				token: stateToken,
				cid: 'credential-id',
				createdAt: Date.now(),
			};
			const decrypted = { csrfSecret };

			const result = (service as any).verifyCsrfState(decrypted, state);

			expect(result).toBe(true);
		});

		it('should return false when CSRF state is expired', () => {
			const csrfSecret = 'csrf-secret';
			const token = new (require('csrf'))();
			const stateToken = token.create(csrfSecret);

			const expiredTime = Date.now() - 6 * Time.minutes.toMilliseconds;
			const state = {
				token: stateToken,
				cid: 'credential-id',
				createdAt: expiredTime,
			};
			const decrypted = { csrfSecret };

			const result = (service as any).verifyCsrfState(decrypted, state);

			expect(result).toBe(false);
		});

		it('should return false when csrfSecret is missing', () => {
			const token = new (require('csrf'))();
			const csrfSecret = 'csrf-secret';
			const stateToken = token.create(csrfSecret);

			const state = {
				token: stateToken,
				cid: 'credential-id',
				createdAt: Date.now(),
			};
			const decrypted = {};

			const result = (service as any).verifyCsrfState(decrypted, state);

			expect(result).toBe(false);
		});

		it('should return false when token verification fails', () => {
			const state = {
				token: 'invalid-token',
				cid: 'credential-id',
				createdAt: Date.now(),
			};
			const decrypted = { csrfSecret: 'csrf-secret' };

			const result = (service as any).verifyCsrfState(decrypted, state);

			expect(result).toBe(false);
		});
	});

	describe('resolveCredential', () => {
		it('should resolve credential successfully', async () => {
			const state = {
				token: 'token',
				cid: 'credential-id',
				userId: 'user-id',
				createdAt: timestamp,
			};

			const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
			const mockDecryptedData = { csrfSecret: 'csrf-secret' };
			const mockOAuthCredentials = { clientId: 'client-id' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			const token = new (require('csrf'))();
			const stateToken = token.create('csrf-secret');
			state.token = stateToken;

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { state: Buffer.from(JSON.stringify(state)).toString('base64') },
				user: mock<User>({ id: 'user-id' }),
			});

			credentialsRepository.findOneBy.mockResolvedValue(mockCredential);
			jest.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			jest.spyOn(service as any, 'verifyCsrfState').mockReturnValue(true);

			const result = await service.resolveCredential(req);

			expect(result).toEqual([mockCredential, mockDecryptedData, mockOAuthCredentials]);
		});

		it('should throw UnexpectedError when credential is not found', async () => {
			const state = {
				token: 'token',
				cid: 'credential-id',
				userId: 'user-id',
				createdAt: timestamp,
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { state: encodedState },
				user: mock<User>({ id: 'user-id' }),
			});

			credentialsRepository.findOneBy.mockResolvedValue(null);

			await expect(service.resolveCredential(req)).rejects.toThrow(UnexpectedError);
			await expect(service.resolveCredential(req)).rejects.toThrow(
				'OAuth callback failed because of insufficient permissions',
			);
		});

		it('should throw UnexpectedError when CSRF state is invalid', async () => {
			const state = {
				token: 'token',
				cid: 'credential-id',
				userId: 'user-id',
				createdAt: timestamp,
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');

			const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
			const mockDecryptedData = { csrfSecret: 'csrf-secret' };
			const mockOAuthCredentials = { clientId: 'client-id' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { state: encodedState },
				user: mock<User>({ id: 'user-id' }),
			});

			credentialsRepository.findOneBy.mockResolvedValue(mockCredential);
			jest.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			jest.spyOn(service as any, 'verifyCsrfState').mockReturnValue(false);

			await expect(service.resolveCredential(req)).rejects.toThrow(UnexpectedError);
			await expect(service.resolveCredential(req)).rejects.toThrow(
				'The OAuth callback state is invalid!',
			);
		});
	});

	describe('renderCallbackError', () => {
		it('should render error page with message', () => {
			const res = mock<Response>();
			const message = 'Test error message';

			service.renderCallbackError(res, message);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: { message },
			});
		});

		it('should render error page with message and reason', () => {
			const res = mock<Response>();
			const message = 'Test error message';
			const reason = 'Test reason';

			service.renderCallbackError(res, message, reason);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: { message, reason },
			});
		});
	});

	describe('getOAuthCredentials', () => {
		it('should return OAuth credentials', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'testOAuth2Api',
			});
			const mockDecryptedData = { clientId: 'client-id' };
			const mockOAuthCredentials = { clientId: 'client-id', clientSecret: 'secret' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			jest.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			const result = await service.getOAuthCredentials(credential);

			expect(result).toBe(mockOAuthCredentials);
		});

		it('should delete scope for non-generic OAuth2 credentials', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'testOAuth2Api',
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'old-scope' };
			const mockOAuthCredentials = { clientId: 'client-id' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			jest.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id' },
				credential,
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});

		it('should not delete scope for generic OAuth2 credentials with editable scope', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'oAuth2Api',
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'old-scope' };
			const mockOAuthCredentials = { clientId: 'client-id', scope: 'old-scope' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			jest.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id', scope: 'old-scope' },
				credential,
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});

		it('should not delete scope for non-OAuth2 credentials', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'testApi',
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'old-scope' };
			const mockOAuthCredentials = { clientId: 'client-id', scope: 'old-scope' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			jest.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id', scope: 'old-scope' },
				credential,
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});
	});
});
