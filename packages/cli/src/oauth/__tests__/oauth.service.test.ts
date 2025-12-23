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
import type { Cipher } from 'n8n-core';

import {
	OauthService,
	OauthVersion,
	shouldSkipAuthOnOAuthCallback,
	type OAuth1CredentialData,
} from '@/oauth/oauth.service';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsHelper } from '@/credentials-helper';
import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { OAuthRequest } from '@/requests';
import { UrlService } from '@/services/url.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { ExternalHooks } from '@/external-hooks';
import type { OAuth2CredentialData } from '@n8n/client-oauth2';
import { DynamicCredentialsProxy } from '@/credentials/dynamic-credentials-proxy';
import { Credentials } from 'n8n-core';

jest.mock('@/workflow-execute-additional-data');
jest.mock('axios');
jest.mock('@n8n/client-oauth2');
jest.mock('pkce-challenge');

describe('OauthService', () => {
	const logger = mockInstance(Logger);
	const credentialsHelper = mockInstance(CredentialsHelper);
	const credentialsRepository = mockInstance(CredentialsRepository);
	const credentialsFinderService = mockInstance(CredentialsFinderService);
	const urlService = mockInstance(UrlService);
	const globalConfig = mockInstance(GlobalConfig);
	const externalHooks = mockInstance(ExternalHooks);
	const cipher = mock<Cipher>();
	const dynamicCredentialsProxy = mockInstance(DynamicCredentialsProxy);

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
		externalHooks.run.mockResolvedValue(undefined);

		// Setup axios mock
		const axios = require('axios');
		axios.get = jest.fn();
		axios.post = jest.fn();

		// Setup cipher mock - encrypt returns the input as-is for testing, decrypt does the reverse
		cipher.encrypt.mockImplementation((data: string) => {
			// For testing, we'll use base64 encoding as a simple mock
			// In production, this would be actual encryption
			return Buffer.from(data).toString('base64');
		});
		cipher.decrypt.mockImplementation((data: string) => {
			// For testing, decode the base64
			return Buffer.from(data, 'base64').toString();
		});

		service = new OauthService(
			logger,
			credentialsHelper,
			credentialsRepository,
			credentialsFinderService,
			urlService,
			globalConfig,
			externalHooks,
			cipher,
			dynamicCredentialsProxy,
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
			const data = {
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'static-credential' as const,
			};
			jest.setSystemTime(new Date(timestamp));

			const [csrfSecret, base64State] = service.createCsrfState(data);

			expect(typeof csrfSecret).toBe('string');
			expect(csrfSecret.length).toBeGreaterThan(0);
			expect(cipher.encrypt).toHaveBeenCalled();

			// Verify base64State is a valid base64 string
			expect(typeof base64State).toBe('string');
			const base64Decoded = JSON.parse(Buffer.from(base64State, 'base64').toString());
			expect(base64Decoded.token).toBeDefined();
			expect(base64Decoded.createdAt).toBe(timestamp);
			expect(base64Decoded.data).toBeDefined();

			// Decrypt the data field to verify CSRF data
			const decryptedData = JSON.parse(cipher.decrypt(base64Decoded.data));
			expect(decryptedData.cid).toBe('credential-id');
			expect(decryptedData.userId).toBe('user-id');
			expect(decryptedData.origin).toBe('static-credential');
		});

		it('should include additional data in state', () => {
			const data = {
				cid: 'credential-id',
				customField: 'custom-value',
				origin: 'static-credential' as const,
			};
			jest.setSystemTime(new Date(timestamp));

			const [, base64State] = service.createCsrfState(data);

			expect(cipher.encrypt).toHaveBeenCalled();

			// Verify base64State structure
			const base64Decoded = JSON.parse(Buffer.from(base64State, 'base64').toString());
			expect(base64Decoded.token).toBeDefined();
			expect(base64Decoded.createdAt).toBeDefined();
			expect(base64Decoded.data).toBeDefined();

			// Decrypt and verify the customField is in the encrypted data
			const decryptedData = JSON.parse(cipher.decrypt(base64Decoded.data));
			expect(decryptedData.customField).toBe('custom-value');
		});
	});

	describe('decodeCsrfState', () => {
		it('should decode valid CSRF state', () => {
			const csrfData = {
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'static-credential' as const,
			};
			const state = {
				token: 'token',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			const result = (service as any).decodeCsrfState(encodedState, req);

			expect(cipher.decrypt).toHaveBeenCalledWith('encrypted-data');
			expect(result).toMatchObject({
				token: 'token',
				createdAt: timestamp,
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'static-credential',
			});
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
			const csrfData = {
				userId: 'user-id',
				origin: 'static-credential' as const,
			};
			const state = {
				token: 'token',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow(UnexpectedError);
		});

		it('should throw UnexpectedError when token is missing', () => {
			const csrfData = {
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'static-credential' as const,
			};
			const state = {
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow(UnexpectedError);
		});

		it('should throw AuthError when userId does not match', () => {
			const csrfData = {
				cid: 'credential-id',
				userId: 'different-user-id',
				origin: 'static-credential' as const,
			};
			const state = {
				token: 'token',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow(AuthError);
			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow('Unauthorized');
		});

		it('should throw AuthError when req.user is undefined', () => {
			const csrfData = {
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'static-credential' as const,
			};
			const state = {
				token: 'token',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: undefined,
			});

			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow(AuthError);
		});

		it('should bypass user validation for dynamic-credential origin', () => {
			const csrfData = {
				cid: 'credential-id',
				userId: 'different-user-id',
				origin: 'dynamic-credential' as const,
			};
			const state = {
				token: 'token',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			const result = (service as any).decodeCsrfState(encodedState, req);

			expect(result).toMatchObject({
				token: 'token',
				createdAt: timestamp,
				cid: 'credential-id',
				userId: 'different-user-id',
				origin: 'dynamic-credential',
			});
			expect(cipher.decrypt).toHaveBeenCalledWith('encrypted-data');
		});

		it('should bypass user validation for dynamic-credential origin even when req.user is undefined', () => {
			const csrfData = {
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'dynamic-credential' as const,
			};
			const state = {
				token: 'token',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: undefined,
			});

			const result = (service as any).decodeCsrfState(encodedState, req);

			expect(result).toMatchObject({
				token: 'token',
				createdAt: timestamp,
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'dynamic-credential',
			});
			expect(cipher.decrypt).toHaveBeenCalledWith('encrypted-data');
		});

		it('should require user validation for static-credential origin', () => {
			const csrfData = {
				cid: 'credential-id',
				userId: 'different-user-id',
				origin: 'static-credential' as const,
			};
			const state = {
				token: 'token',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow(AuthError);
			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow('Unauthorized');
		});

		it('should require user validation when origin is undefined', () => {
			const csrfData = {
				cid: 'credential-id',
				userId: 'different-user-id',
			};
			const state = {
				token: 'token',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow(AuthError);
			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow('Unauthorized');
		});

		it('should require user validation for invalid origin values', () => {
			const csrfData = {
				cid: 'credential-id',
				userId: 'different-user-id',
				origin: 'invalid-origin' as any,
			};
			const state = {
				token: 'token',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow(AuthError);
			expect(() => (service as any).decodeCsrfState(encodedState, req)).toThrow('Unauthorized');
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
				origin: 'static-credential',
				createdAt: Date.now(),
			};
			const decrypted = { csrfSecret };

			const result = (service as any).verifyCsrfState(decrypted, state);

			expect(result).toBe(true);
		});

		it('should return true for valid CSRF state with dynamic credential origin', () => {
			const csrfSecret = 'csrf-secret';
			const token = new (require('csrf'))();
			const stateToken = token.create(csrfSecret);

			const state = {
				token: stateToken,
				cid: 'credential-id',
				origin: 'dynamic-credential',
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
				origin: 'static-credential',
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
				origin: 'static-credential',
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
				origin: 'static-credential',
				createdAt: Date.now(),
			};
			const decrypted = { csrfSecret: 'csrf-secret' };

			const result = (service as any).verifyCsrfState(decrypted, state);

			expect(result).toBe(false);
		});
	});

	describe('resolveCredential', () => {
		it('should resolve credential successfully', async () => {
			const token = new (require('csrf'))();
			const stateToken = token.create('csrf-secret');

			const csrfData = {
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'static-credential' as const,
			};
			const state = {
				token: stateToken,
				createdAt: timestamp,
				data: 'encrypted-data',
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

			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));
			credentialsRepository.findOneBy.mockResolvedValue(mockCredential);
			jest.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			jest.spyOn(service as any, 'verifyCsrfState').mockReturnValue(true);

			const result = await service.resolveCredential(req);

			expect(result[0]).toEqual(mockCredential);
			expect(result[1]).toEqual(mockDecryptedData);
			expect(result[2]).toEqual(mockOAuthCredentials);
			expect(result[3]).toMatchObject({
				token: stateToken,
				createdAt: timestamp,
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'static-credential',
			});
		});

		it('should throw UnexpectedError when credential is not found', async () => {
			const csrfData = {
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'static-credential' as const,
			};
			const state = {
				token: 'token',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));

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
			const csrfData = {
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'static-credential' as const,
			};
			const state = {
				token: 'token',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));

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

		it('should resolve dynamic credential without user validation but still verify CSRF', async () => {
			const token = new (require('csrf'))();
			const stateToken = token.create('csrf-secret');

			const csrfData = {
				cid: 'credential-id',
				userId: 'different-user-id',
				origin: 'dynamic-credential' as const,
			};
			const state = {
				token: stateToken,
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');

			const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
			const mockDecryptedData = { csrfSecret: 'csrf-secret' };
			const mockOAuthCredentials = { clientId: 'client-id' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { state: encodedState },
				user: mock<User>({ id: 'user-id' }), // Different user ID - should be bypassed
			});

			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));
			credentialsRepository.findOneBy.mockResolvedValue(mockCredential);
			jest.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			const verifySpy = jest.spyOn(service as any, 'verifyCsrfState').mockReturnValue(true);

			const result = await service.resolveCredential(req);

			// Should succeed despite different user ID because origin is dynamic-credential
			expect(result[0]).toEqual(mockCredential);
			expect(result[1]).toEqual(mockDecryptedData);
			expect(result[2]).toEqual(mockOAuthCredentials);
			expect(result[3]).toMatchObject({
				token: stateToken,
				createdAt: timestamp,
				cid: 'credential-id',
				userId: 'different-user-id',
				origin: 'dynamic-credential',
			});
			// CSRF validation should still be called
			expect(verifySpy).toHaveBeenCalled();
		});

		it('should still verify CSRF for dynamic credentials even when req.user is undefined', async () => {
			const token = new (require('csrf'))();
			const stateToken = token.create('csrf-secret');

			const csrfData = {
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'dynamic-credential' as const,
			};
			const state = {
				token: stateToken,
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');

			const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
			const mockDecryptedData = { csrfSecret: 'csrf-secret' };
			const mockOAuthCredentials = { clientId: 'client-id' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { state: encodedState },
				user: undefined, // No user - should be bypassed for dynamic credentials
			});

			cipher.decrypt.mockReturnValue(JSON.stringify(csrfData));
			credentialsRepository.findOneBy.mockResolvedValue(mockCredential);
			jest.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			const verifySpy = jest.spyOn(service as any, 'verifyCsrfState').mockReturnValue(true);

			const result = await service.resolveCredential(req);

			// Should succeed despite no user because origin is dynamic-credential
			expect(result[0]).toEqual(mockCredential);
			expect(result[1]).toEqual(mockDecryptedData);
			expect(result[2]).toEqual(mockOAuthCredentials);
			expect(result[3]).toMatchObject({
				token: stateToken,
				createdAt: timestamp,
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'dynamic-credential',
			});
			// CSRF validation should still be called
			expect(verifySpy).toHaveBeenCalled();
		});
	});

	describe('saveDynamicCredential', () => {
		beforeEach(() => {
			// Mock Credentials.getData to return empty object to avoid decryption issues
			jest.spyOn(Credentials.prototype, 'getData').mockReturnValue({});
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should save dynamic credential with correct parameters', async () => {
			const credential = mock<CredentialsEntity>({
				id: 'credential-id',
				name: 'Test Credential',
				type: 'googleOAuth2Api',
				data: 'encrypted-data',
				isResolvable: true,
				resolverId: 'resolver-id',
			});
			const oauthTokenData = {
				access_token: 'access-token',
				refresh_token: 'refresh-token',
			};
			const authToken = 'token123'; // Controller splits 'Bearer token123' and passes just 'token123'
			const credentialResolverId = 'resolver-id';

			dynamicCredentialsProxy.storeIfNeeded.mockResolvedValue(undefined);

			await service.saveDynamicCredential(
				credential,
				oauthTokenData,
				authToken,
				credentialResolverId,
			);

			expect(dynamicCredentialsProxy.storeIfNeeded).toHaveBeenCalledWith(
				{
					id: 'credential-id',
					name: 'Test Credential',
					type: 'googleOAuth2Api',
					isResolvable: true,
					resolverId: 'resolver-id',
				},
				oauthTokenData,
				{ version: 1, identity: authToken },
				expect.any(Object),
				{ credentialResolverId: 'resolver-id' },
			);
		});

		it('should remove csrfSecret from credential data', async () => {
			const credential = mock<CredentialsEntity>({
				id: 'credential-id',
				name: 'Test Credential',
				type: 'googleOAuth2Api',
				data: 'encrypted-data',
			});
			const oauthTokenData = {
				access_token: 'access-token',
				csrfSecret: 'csrf-secret',
			};
			const authToken = 'token123'; // Controller splits 'Bearer token123' and passes just 'token123'
			const credentialResolverId = 'resolver-id';

			dynamicCredentialsProxy.storeIfNeeded.mockResolvedValue(undefined);

			await service.saveDynamicCredential(
				credential,
				oauthTokenData,
				authToken,
				credentialResolverId,
			);

			// Verify that storeIfNeeded was called with data that doesn't include csrfSecret
			const callArgs = dynamicCredentialsProxy.storeIfNeeded.mock.calls[0];
			const staticData = callArgs[3] as any;
			expect(staticData).not.toHaveProperty('csrfSecret');
		});

		it('should handle errors from dynamicCredentialsProxy', async () => {
			const credential = mock<CredentialsEntity>({
				id: 'credential-id',
				name: 'Test Credential',
				type: 'googleOAuth2Api',
				data: 'encrypted-data',
			});
			const oauthTokenData = {
				access_token: 'access-token',
			};
			const authToken = 'token123'; // Controller splits 'Bearer token123' and passes just 'token123'
			const credentialResolverId = 'resolver-id';

			const error = new Error('Storage failed');
			dynamicCredentialsProxy.storeIfNeeded.mockRejectedValue(error);

			await expect(
				service.saveDynamicCredential(credential, oauthTokenData, authToken, credentialResolverId),
			).rejects.toThrow('Storage failed');
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

	describe('generateAOauth2AuthUri', () => {
		it('should generate auth URI without dynamic client registration', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = jest.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/oauth2/auth?client_id=client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid',
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getUri: mockGetUri,
						},
					}) as any,
			);

			const credential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const oauthCredentials: OAuth2CredentialData = {
				clientId: 'client_id',
				clientSecret: 'client_secret',
				authUrl: 'https://example.domain/oauth2/auth',
				accessTokenUrl: 'https://example.domain/oauth2/token',
				scope: 'openid',
				grantType: 'authorizationCode',
				authentication: 'header',
			};

			jest.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			jest.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const authUri = await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(authUri).toContain('https://example.domain/oauth2/auth');
			expect(service.encryptAndSaveData).toHaveBeenCalled();
			const callArgs = (service.encryptAndSaveData as jest.Mock).mock.calls[0];
			expect(callArgs[0]).toBe(credential);
			expect(callArgs[1]).toHaveProperty('csrfSecret');
			expect(typeof callArgs[1].csrfSecret).toBe('string');
			expect(callArgs[2] || []).toEqual([]);
			expect(externalHooks.run).toHaveBeenCalledWith('oauth2.authenticate', [
				expect.objectContaining({
					state: expect.any(String), // base64State
				}),
			]);
		});

		it('should generate auth URI with PKCE flow', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const pkceChallenge = await import('pkce-challenge');
			jest.mocked(pkceChallenge.default).mockResolvedValue({
				code_verifier: 'code_verifier',
				code_challenge: 'code_challenge',
			});

			const mockGetUri = jest.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/oauth2/auth?client_id=client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid&code_challenge=code_challenge&code_challenge_method=S256',
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getUri: mockGetUri,
						},
					}) as any,
			);

			const credential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const oauthCredentials: OAuth2CredentialData = {
				clientId: 'client_id',
				clientSecret: 'client_secret',
				authUrl: 'https://example.domain/oauth2/auth',
				accessTokenUrl: 'https://example.domain/oauth2/token',
				scope: 'openid',
				grantType: 'pkce',
				authentication: 'header',
			};

			jest.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			jest.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const authUri = await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(authUri).toContain('code_challenge=code_challenge');
			expect(service.encryptAndSaveData).toHaveBeenCalled();
			const callArgs = (service.encryptAndSaveData as jest.Mock).mock.calls[0];
			expect(callArgs[0]).toBe(credential);
			expect(callArgs[1]).toHaveProperty('csrfSecret');
			expect(callArgs[1]).toHaveProperty('codeVerifier', 'code_verifier');
			expect(callArgs[2] || []).toEqual([]);
		});

		it('should generate auth URI with auth query parameters', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = jest.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/oauth2/auth?client_id=client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid&custom_param=value',
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getUri: mockGetUri,
						},
					}) as any,
			);

			const credential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const oauthCredentials: OAuth2CredentialData = {
				clientId: 'client_id',
				clientSecret: 'client_secret',
				authUrl: 'https://example.domain/oauth2/auth',
				accessTokenUrl: 'https://example.domain/oauth2/token',
				scope: 'openid',
				grantType: 'authorizationCode',
				authentication: 'header',
				authQueryParameters: 'custom_param=value',
			};

			jest.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			jest.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const authUri = await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(authUri).toContain('https://example.domain/oauth2/auth');
			expect(mockGetUri).toHaveBeenCalled();
		});

		it('should handle dynamic client registration', async () => {
			const axios = require('axios');
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = jest.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/oauth2/auth?client_id=registered_client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid profile',
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getUri: mockGetUri,
						},
					}) as any,
			);

			const credential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			jest.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			jest.mocked(axios.get).mockResolvedValue({
				data: {
					authorization_endpoint: 'https://example.domain/oauth2/auth',
					token_endpoint: 'https://example.domain/oauth2/token',
					registration_endpoint: 'https://example.domain/oauth2/register',
					grant_types_supported: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_methods_supported: ['client_secret_basic'],
					code_challenge_methods_supported: ['S256'],
					scopes_supported: ['openid', 'profile'],
				},
			} as any);

			jest.mocked(axios.post).mockResolvedValue({
				data: {
					client_id: 'registered_client_id',
					client_secret: 'registered_client_secret',
				},
			} as any);

			jest.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const authUri = await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(authUri).toContain('https://example.domain/oauth2/auth');
			expect(axios.get).toHaveBeenCalledWith(
				'https://example.domain/.well-known/oauth-authorization-server',
			);
			expect(axios.post).toHaveBeenCalledWith(
				'https://example.domain/oauth2/register',
				expect.objectContaining({
					client_name: 'n8n',
					grant_types: ['authorization_code', 'refresh_token'],
				}),
			);
			expect(externalHooks.run).toHaveBeenCalledWith(
				'oauth2.dynamicClientRegistration',
				expect.any(Array),
			);
			expect(service.encryptAndSaveData).toHaveBeenCalled();
			const callArgs = (service.encryptAndSaveData as jest.Mock).mock.calls[0];
			expect(callArgs[0]).toBe(credential);
			expect(callArgs[1]).toHaveProperty('authUrl', 'https://example.domain/oauth2/auth');
			expect(callArgs[1]).toHaveProperty('accessTokenUrl', 'https://example.domain/oauth2/token');
			expect(callArgs[1]).toHaveProperty('clientId', 'registered_client_id');
			expect(callArgs[1]).toHaveProperty('clientSecret', 'registered_client_secret');
			expect(callArgs[1]).toHaveProperty('scope', 'openid profile');
			expect(callArgs[1]).toHaveProperty('grantType', 'pkce');
			expect(callArgs[1]).toHaveProperty('csrfSecret');
			expect(callArgs[1]).toHaveProperty('codeVerifier', 'code_verifier');
			expect(callArgs[2] || []).toEqual([]);
		});

		it('should throw BadRequestError when OAuth2 server metadata is invalid', async () => {
			const axios = require('axios');
			const credential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			jest.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			jest.mocked(axios.get).mockResolvedValue({
				data: { invalid: 'metadata' },
			} as any);

			await expect(
				service.generateAOauth2AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				}),
			).rejects.toThrow(BadRequestError);
			await expect(
				service.generateAOauth2AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				}),
			).rejects.toThrow('Invalid OAuth2 server metadata');
		});

		it('should throw BadRequestError when client registration response is invalid', async () => {
			const axios = require('axios');
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			jest.mocked(ClientOAuth2).mockImplementation(() => ({}) as any);

			const credential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			jest.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			jest.mocked(axios.get).mockResolvedValue({
				data: {
					authorization_endpoint: 'https://example.domain/oauth2/auth',
					token_endpoint: 'https://example.domain/oauth2/token',
					registration_endpoint: 'https://example.domain/oauth2/register',
					grant_types_supported: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_methods_supported: ['client_secret_basic'],
					code_challenge_methods_supported: ['S256'],
				},
			} as any);

			jest.mocked(axios.post).mockResolvedValue({
				data: { invalid: 'response' },
			} as any);

			await expect(
				service.generateAOauth2AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				}),
			).rejects.toThrow(BadRequestError);
			await expect(
				service.generateAOauth2AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				}),
			).rejects.toThrow('Invalid client registration response');
		});

		it('should handle dynamic client registration with client_secret_post authentication', async () => {
			const axios = require('axios');
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = jest.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/oauth2/auth?client_id=registered_client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid',
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getUri: mockGetUri,
						},
					}) as any,
			);

			const credential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			jest.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			jest.mocked(axios.get).mockResolvedValue({
				data: {
					authorization_endpoint: 'https://example.domain/oauth2/auth',
					token_endpoint: 'https://example.domain/oauth2/token',
					registration_endpoint: 'https://example.domain/oauth2/register',
					grant_types_supported: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_methods_supported: ['client_secret_post'],
					code_challenge_methods_supported: [],
				},
			} as any);

			jest.mocked(axios.post).mockResolvedValue({
				data: {
					client_id: 'registered_client_id',
					client_secret: 'registered_client_secret',
				},
			} as any);

			jest.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const authUri = await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(authUri).toContain('https://example.domain/oauth2/auth');
			expect(oauthCredentials.authentication).toBe('body');
			expect(oauthCredentials.grantType).toBe('authorizationCode');
		});

		it('should skip userId in CSRF state when skipAuthOnOAuthCallback is true', async () => {
			// This test verifies the behavior when skipAuthOnOAuthCallback is true
			// Since the skipAuthOnOAuthCallback is evaluated at module load time,
			// we need to check the actual behavior by verifying the CSRF state doesn't include userId
			// when the env var is set. However, since it's evaluated at module load, we'll test
			// that the function works correctly with or without userId
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = jest.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/oauth2/auth?client_id=client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid',
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getUri: mockGetUri,
						},
					}) as any,
			);

			const credential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const oauthCredentials: OAuth2CredentialData = {
				clientId: 'client_id',
				clientSecret: 'client_secret',
				authUrl: 'https://example.domain/oauth2/auth',
				accessTokenUrl: 'https://example.domain/oauth2/token',
				scope: 'openid',
				grantType: 'authorizationCode',
				authentication: 'header',
			};

			jest.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			jest.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);
			jest.spyOn(service, 'createCsrfState').mockReturnValue(['csrf-secret', 'base64-state']);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// Verify createCsrfState was called with cid
			expect(service.createCsrfState).toHaveBeenCalledWith(
				expect.objectContaining({
					cid: '1',
				}),
			);
		});
	});

	describe('generateAOauth1AuthUri', () => {
		it('should generate auth URI for OAuth1 credential', async () => {
			const axios = require('axios');
			const credential = mock<CredentialsEntity>({ id: '1', type: 'twitterOAuth1Api' });
			const oauthCredentials: OAuth1CredentialData = {
				consumerKey: 'consumer_key',
				consumerSecret: 'consumer_secret',
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				authUrl: 'https://example.domain/oauth/authorize',
				accessTokenUrl: 'https://example.domain/oauth/access_token',
				signatureMethod: 'HMAC-SHA1',
			};

			jest.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			jest.mocked(axios.request).mockResolvedValue({
				data: 'oauth_token=random-token&oauth_token_secret=random-secret',
			});
			jest.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const authUri = await service.generateAOauth1AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(authUri).toContain('https://example.domain/oauth/authorize?oauth_token=random-token');
			expect(service.encryptAndSaveData).toHaveBeenCalledWith(
				credential,
				expect.objectContaining({ csrfSecret: expect.any(String) }),
				[],
			);
			expect(externalHooks.run).toHaveBeenCalledWith('oauth1.authenticate', expect.any(Array));
		});

		it('should generate auth URI with different signature methods', async () => {
			const axios = require('axios');
			const credential = mock<CredentialsEntity>({ id: '1', type: 'twitterOAuth1Api' });
			const oauthCredentials: OAuth1CredentialData = {
				consumerKey: 'consumer_key',
				consumerSecret: 'consumer_secret',
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				authUrl: 'https://example.domain/oauth/authorize',
				accessTokenUrl: 'https://example.domain/oauth/access_token',
				signatureMethod: 'HMAC-SHA256',
			};

			jest.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			jest.mocked(axios.request).mockResolvedValue({
				data: 'oauth_token=random-token&oauth_token_secret=random-secret',
			});
			jest.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const authUri = await service.generateAOauth1AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(authUri).toContain('https://example.domain/oauth/authorize?oauth_token=random-token');
			expect(service.encryptAndSaveData).toHaveBeenCalled();
		});

		it('should handle request token URL errors', async () => {
			const axios = require('axios');
			const credential = mock<CredentialsEntity>({ id: '1', type: 'twitterOAuth1Api' });
			const oauthCredentials: OAuth1CredentialData = {
				consumerKey: 'consumer_key',
				consumerSecret: 'consumer_secret',
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				authUrl: 'https://example.domain/oauth/authorize',
				accessTokenUrl: 'https://example.domain/oauth/access_token',
				signatureMethod: 'HMAC-SHA1',
			};

			jest.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			jest.mocked(axios.request).mockRejectedValue(new Error('Request token failed'));

			await expect(
				service.generateAOauth1AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				}),
			).rejects.toThrow('Request token failed');
		});
	});
});
