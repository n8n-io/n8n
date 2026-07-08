import { Logger } from '@n8n/backend-common';
import { OutboundHttp, SsrfProtectionService, type HttpRequestClient } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import type { OAuth2CredentialData } from '@n8n/client-oauth2';
import { GlobalConfig, SsrfProtectionConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { AuthenticatedRequest, CredentialsEntity, ICredentialsDb, User } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import type { Request, Response } from 'express';
import type { Cipher } from 'n8n-core';
import { Credentials } from 'n8n-core';
import type { IHttpRequestOptions, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { DynamicCredentialsProxy } from '@/credentials/dynamic-credentials-proxy';
import { CredentialsHelper } from '@/credentials-helper';
import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { OAuthBrowserBindingService } from '@/oauth/oauth-browser-binding.service';
import { OAuthJweServiceProxy } from '@/oauth/oauth-jwe-service.proxy';
import {
	InvalidTargetError,
	InvalidOAuthUrlError,
	OauthService,
	OauthVersion,
	shouldSkipAuthOnOAuthCallback,
	type CreateCsrfStateData,
	type OAuth1CredentialData,
} from '@/oauth/oauth.service';
import type { OAuthRequest } from '@/requests';
import { CacheService } from '@/services/cache/cache.service';
import { UrlService } from '@/services/url.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

vi.mock('@/workflow-execute-additional-data');
vi.mock('@n8n/client-oauth2', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/client-oauth2')>();
	return { ...actual, ClientOAuth2: vi.fn() };
});
vi.mock('pkce-challenge');

/**
 * The service issues every outbound call through a single
 * `OutboundHttp.requests().request(options)`. These per-verb mocks let each test
 * stub responses the way tests used to with `httpClientMock.get/post/request`; the adapter
 * below routes the single `request(...)` to the matching one and re-shapes the
 * result to what each callsite expects.
 */
const httpClientMock = {
	// GET = OAuth2 discovery (calls 1 & 2). Resolve `{ data }` for a 200, or
	// `{ data, statusCode }` to simulate a resolved non-200 the discovery loop
	// should skip; reject to simulate a blocked/throwing URL it should also skip.
	get: vi.fn(),
	// POST + JSON = dynamic client registration (call 3). Resolve `{ data }`.
	post: vi.fn(),
	// POST + text = OAuth1 token exchanges (calls 4 & 5). Resolve `{ data: string }`.
	request: vi.fn(),
};

const requestMock = vi.fn(async (options: IHttpRequestOptions) => {
	if (options.method === 'GET') {
		const { data, statusCode } = await httpClientMock.get(options.url, options);
		return { statusCode: statusCode ?? 200, body: data, headers: {} };
	}
	if (options.method === 'POST' && options.encoding === 'text') {
		const { data } = await httpClientMock.request(options);
		return data;
	}
	const { data } = await httpClientMock.post(options.url, options.body);
	return data;
});

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
	const authService = mockInstance(AuthService);
	const oauthJweServiceProxy = mockInstance(OAuthJweServiceProxy);
	const browserBindingService = mockInstance(OAuthBrowserBindingService);
	const eventService = mockInstance(EventService);
	const cacheService = mockInstance(CacheService);
	const outboundHttp = mockInstance(OutboundHttp);
	const ssrfProtectionService = mockInstance(SsrfProtectionService);
	const ssrfProtectionConfig = mockInstance(SsrfProtectionConfig);

	let service: OauthService;

	const timestamp = 1706750625678;
	vi.useFakeTimers({ shouldAdvanceTime: true });

	beforeEach(() => {
		vi.setSystemTime(new Date(timestamp));
		vi.clearAllMocks();
		// clearAllMocks() does not reset implementations set via mockResolvedValue, so
		// pin the per-flow cache to "empty" by default. Tests that exercise the cache
		// path opt in explicitly; the rest fall back to the legacy URL-encoded state.
		cacheService.get.mockResolvedValue(undefined);
		credentialsHelper.getCredentialsProperties.mockReturnValue([]);

		globalConfig.endpoints = { rest: 'rest' } as any;
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');
		vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);
		externalHooks.run.mockResolvedValue(undefined);

		// Reset the per-verb HTTP mocks (impl + return values) so nothing leaks
		// between tests, then wire the single request() entry point of the client.
		httpClientMock.get.mockReset();
		httpClientMock.post.mockReset();
		httpClientMock.request.mockReset();
		outboundHttp.requests.mockReturnValue(
			mock<HttpRequestClient>({ request: requestMock as unknown as HttpRequestClient['request'] }),
		);

		cipher.encryptV2.mockImplementation(async (data: string | object) => {
			const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
			return Buffer.from(plaintext).toString('base64');
		});
		cipher.decryptV2.mockImplementation(async (data: string) => {
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
			authService,
			oauthJweServiceProxy,
			browserBindingService,
			eventService,
			cacheService,
			outboundHttp,
			ssrfProtectionService,
			ssrfProtectionConfig,
		);
	});

	describe('constructor', () => {
		it('builds its HTTP client with the injected SSRF protection service and a default timeout', () => {
			// Guards the intent that outbound OAuth calls run with SSRF protection
			// enabled per the configured env vars, rather than relying on the implicit
			// `requests()` default, and that the shared request timeout is applied once
			// on the client instead of being repeated per call.
			expect(outboundHttp.requests).toHaveBeenCalledWith({
				ssrf: ssrfProtectionService,
				timeout: expect.any(Number),
			});
		});
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

	describe('extractCallbackErrorReason', () => {
		it('should return the stringified body when the error has one', () => {
			const error = Object.assign(new Error('request failed'), {
				body: { error: 'invalid_grant' },
			});

			expect(service.extractCallbackErrorReason(error)).toBe('{"error":"invalid_grant"}');
		});

		it('should surface the wrapped cause chain when there is no body', () => {
			const inner = new Error('Unauthorized');
			const root = new Error('resolver rejected the identity', { cause: inner });
			const wrapper = new Error('Failed to store dynamic credentials data for "Google Drive"', {
				cause: root,
			});

			// The wrapper message is rendered as the heading; the reason surfaces the cause chain.
			expect(service.extractCallbackErrorReason(wrapper)).toBe(
				'resolver rejected the identity: Unauthorized',
			);
		});

		it('should return undefined when there is neither a body nor a cause', () => {
			expect(service.extractCallbackErrorReason(new Error('boom'))).toBeUndefined();
		});
	});

	describe('getCredentialForAuthFlow', () => {
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

			const promise = service.getCredentialForAuthFlow(req);
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow('Required credential ID is missing');
		});

		it('should throw NotFoundError when credential is not found', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({
				query: { id: 'credential-id' },
				user: mock<User>({ id: '123' }),
			});

			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			await expect(service.getCredentialForAuthFlow(req)).rejects.toThrow(NotFoundError);
			expect(logger.error).toHaveBeenCalledWith(
				'OAuth credential authorization failed because the current user does not have the correct permissions',
				{ userId: '123', credentialId: 'credential-id' },
			);
		});

		it('should require credential:update scope for shared/static credentials', async () => {
			const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({
				query: { id: 'credential-id' },
				user: mock<User>({ id: '123' }),
			});

			credentialsFinderService.findCredentialById.mockResolvedValue(
				mock<CredentialsEntity>({ id: 'credential-id', isResolvable: false }),
			);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(mockCredential);

			const result = await service.getCredentialForAuthFlow(req);

			expect(result).toBe(mockCredential);
			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				'credential-id',
				req.user,
				['credential:update'],
			);
		});

		it('should require credential:connect scope for private (resolvable) credentials', async () => {
			const mockCredential = mock<CredentialsEntity>({ id: 'credential-id', isResolvable: true });
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({
				query: { id: 'credential-id' },
				user: mock<User>({ id: '123' }),
			});

			credentialsFinderService.findCredentialById.mockResolvedValue(mockCredential);
			credentialsFinderService.findCredentialForUser.mockResolvedValue(mockCredential);

			const result = await service.getCredentialForAuthFlow(req);

			expect(result).toBe(mockCredential);
			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				'credential-id',
				req.user,
				['credential:connect'],
			);
		});
	});

	describe('getAdditionalData', () => {
		it('should return workflow execute additional data', async () => {
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();
			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);

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
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});
	});

	describe('encryptAndSaveData', () => {
		beforeEach(() => {
			vi.spyOn(Credentials.prototype, 'getData').mockResolvedValue({});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should encrypt and save data to repository', async () => {
			const encryptedData = await cipher.encryptV2({ existing: 'data' });

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
			const encryptedData = await cipher.encryptV2({ existing: 'data' });

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
		it('should create CSRF state with only the signed token and timestamp', async () => {
			vi.setSystemTime(new Date(timestamp));

			const [csrfSecret, base64State, stateToken] = await service.createCsrfState();

			expect(typeof csrfSecret).toBe('string');
			expect(csrfSecret.length).toBeGreaterThan(0);
			expect(typeof stateToken).toBe('string');
			expect(stateToken.length).toBeGreaterThan(0);

			// Verify base64State is a valid base64 string
			expect(typeof base64State).toBe('string');
			const base64Decoded = JSON.parse(Buffer.from(base64State, 'base64').toString());
			expect(base64Decoded.token).toBe(stateToken);
			expect(base64Decoded.createdAt).toBe(timestamp);
		});

		it('does not embed the CSRF payload in the URL state', async () => {
			const [, base64State] = await service.createCsrfState();

			// The payload now lives server-side in the per-flow cache, so the state
			// carries no encrypted blob and never touches the cipher.
			expect(cipher.encryptV2).not.toHaveBeenCalled();
			const base64Decoded = JSON.parse(Buffer.from(base64State, 'base64').toString());
			expect(base64Decoded.data).toBeUndefined();
		});
	});

	describe('decodeCsrfState', () => {
		// Auth logic: dynamic credentials (origin === 'dynamic-credential') always skip user validation.
		// Static credentials: skip user validation only when N8N_SKIP_AUTH_ON_OAUTH_CALLBACK is true
		// (e.g. embed/iframe); otherwise req.user.id must match decryptedState.userId (BOLA prevention).
		// skipAuthOnOAuthCallback is read at module load, so the "skip for static" path is not tested here.

		it('should decode valid CSRF state', async () => {
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
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
			credentialsFinderService.findCredentialForUser.mockResolvedValue(mockCredential);
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			const [decodedState, credential] = await (service as any).decodeCsrfState(encodedState, req);

			expect(cipher.decryptV2).toHaveBeenCalledWith('encrypted-data');
			expect(decodedState).toMatchObject({
				token: 'token',
				createdAt: timestamp,
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'static-credential',
			});
			expect(credential).toBe(mockCredential);
			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				'credential-id',
				req.user,
				['credential:update'],
			);
		});

		it('reads the CSRF payload from the per-flow cache when the URL state carries no blob', async () => {
			const csrfData = {
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'static-credential' as const,
			};
			// New-style state: token + timestamp only, no encrypted `data` in the URL.
			const state = { token: 'token', createdAt: timestamp };
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cacheService.get.mockResolvedValue({ csrfSecret: 'secret', stateData: csrfData });
			const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
			credentialsFinderService.findCredentialForUser.mockResolvedValue(mockCredential);
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			const [decodedState, credential] = await (service as any).decodeCsrfState(encodedState, req);

			// Payload came from the cache, so the cipher is never consulted.
			expect(cipher.decryptV2).not.toHaveBeenCalled();
			expect(cacheService.get).toHaveBeenCalledWith('oauth:flow:token');
			expect(decodedState).toMatchObject({
				token: 'token',
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'static-credential',
			});
			expect(credential).toBe(mockCredential);
		});

		it('should throw error when state format is invalid', async () => {
			const invalidState = 'not-base64-json';
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			await expect((service as any).decodeCsrfState(invalidState, req)).rejects.toThrow(
				'Invalid state format',
			);
		});

		it('should throw UnexpectedError when cid is missing', async () => {
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
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(
				UnexpectedError,
			);
		});

		it('should throw UnexpectedError when token is missing', async () => {
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
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(
				UnexpectedError,
			);
		});

		it('should throw AuthError when userId does not match', async () => {
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
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(AuthError);
			await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(
				'Unauthorized',
			);
		});

		it('should throw AuthError when req.user is undefined', async () => {
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
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: undefined,
			});

			await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(AuthError);
		});

		it('should succeed for dynamic-credential origin when userId matches req.user.id', async () => {
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
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
			credentialsRepository.findOneBy.mockResolvedValue(mockCredential as any);
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			const [decodedState, credential] = await (service as any).decodeCsrfState(encodedState, req);

			expect(decodedState).toMatchObject({
				token: 'token',
				createdAt: timestamp,
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'dynamic-credential',
			});
			expect(credential).toBe(mockCredential);
			expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
		});

		it('should throw AuthError for dynamic-credential origin when userId does not match req.user.id', async () => {
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
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(AuthError);
			await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(
				'Unauthorized',
			);
		});

		it('should bypass user validation for dynamic-credential origin when req.user is undefined', async () => {
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
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
			credentialsRepository.findOneBy.mockResolvedValue(mockCredential as any);
			const req = mock<AuthenticatedRequest>({
				user: undefined,
			});

			const [decodedState, credential] = await (service as any).decodeCsrfState(encodedState, req);

			expect(decodedState).toMatchObject({
				token: 'token',
				createdAt: timestamp,
				cid: 'credential-id',
				userId: 'user-id',
				origin: 'dynamic-credential',
			});
			expect(credential).toBe(mockCredential);
			expect(cipher.decryptV2).toHaveBeenCalledWith('encrypted-data');
		});

		it('should bypass user validation for dynamic-credential origin when state has no userId (external flow)', async () => {
			const csrfData = {
				cid: 'credential-id',
				origin: 'dynamic-credential' as const,
				// no userId — state created by dynamic-credentials.controller (external/Keycloak flow)
			};
			const state = {
				token: 'token',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
			credentialsRepository.findOneBy.mockResolvedValue(mockCredential as any);
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			const [decodedState, credential] = await (service as any).decodeCsrfState(encodedState, req);

			expect(decodedState).toMatchObject({
				cid: 'credential-id',
				origin: 'dynamic-credential',
			});
			expect(credential).toBe(mockCredential);
			expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
		});

		it('should require user validation for static-credential origin', async () => {
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
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(AuthError);
			await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(
				'Unauthorized',
			);
		});

		it('should require user validation when origin is undefined', async () => {
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
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(AuthError);
			await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(
				'Unauthorized',
			);
		});

		it('should require user validation for invalid origin values', async () => {
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
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			const req = mock<AuthenticatedRequest>({
				user: mock<User>({ id: 'user-id' }),
			});

			await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(AuthError);
			await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(
				'Unauthorized',
			);
		});

		describe('browser binding', () => {
			const buildEncodedState = (csrfData: object) => {
				const state = { token: 'token', createdAt: timestamp, data: 'encrypted-data' };
				cipher.decryptV2.mockResolvedValueOnce(JSON.stringify(csrfData));
				return Buffer.from(JSON.stringify(state)).toString('base64');
			};

			it('calls verifyBinding when state carries a bindingHash', async () => {
				const encodedState = buildEncodedState({
					cid: 'credential-id',
					userId: 'user-id',
					origin: 'static-credential',
					bindingHash: 'hash-from-initiate',
				});
				browserBindingService.verifyBinding.mockReturnValueOnce({ ok: true });
				const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
				credentialsFinderService.findCredentialForUser.mockResolvedValue(mockCredential);
				const req = mock<AuthenticatedRequest>({ user: mock<User>({ id: 'user-id' }) });

				await (service as any).decodeCsrfState(encodedState, req);

				expect(browserBindingService.verifyBinding).toHaveBeenCalledWith(req, 'hash-from-initiate');
				expect(eventService.emit).not.toHaveBeenCalled();
			});

			it('skips verification when state has no bindingHash (pre-feature flow)', async () => {
				const encodedState = buildEncodedState({
					cid: 'credential-id',
					userId: 'user-id',
					origin: 'static-credential',
				});
				const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
				credentialsFinderService.findCredentialForUser.mockResolvedValue(mockCredential);
				const req = mock<AuthenticatedRequest>({ user: mock<User>({ id: 'user-id' }) });

				await (service as any).decodeCsrfState(encodedState, req);

				expect(browserBindingService.verifyBinding).not.toHaveBeenCalled();
			});

			it('verifies binding before any origin-specific branch (dynamic-credential)', async () => {
				const encodedState = buildEncodedState({
					cid: 'credential-id',
					origin: 'dynamic-credential',
					bindingHash: 'dynamic-hash',
				});
				browserBindingService.verifyBinding.mockReturnValueOnce({ ok: true });
				credentialsRepository.findOneBy.mockResolvedValueOnce(
					mock<CredentialsEntity>({ id: 'credential-id' }),
				);
				const req = mock<AuthenticatedRequest>({ user: undefined as any });

				await (service as any).decodeCsrfState(encodedState, req);

				expect(browserBindingService.verifyBinding).toHaveBeenCalledWith(req, 'dynamic-hash');
			});

			it('throws AuthError and emits rejection event on hash mismatch', async () => {
				const encodedState = buildEncodedState({
					cid: 'credential-id',
					userId: 'user-id',
					origin: 'static-credential',
					bindingHash: 'expected-hash',
				});
				browserBindingService.verifyBinding.mockReturnValueOnce({
					ok: false,
					reason: 'hash-mismatch',
				});
				const req = mock<AuthenticatedRequest>({ user: mock<User>({ id: 'user-id' }) });

				await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(
					AuthError,
				);
				expect(eventService.emit).toHaveBeenCalledWith('oauth-callback-binding-rejected', {
					reason: 'hash-mismatch',
					credentialId: 'credential-id',
					origin: 'static-credential',
				});
			});

			it('emits rejection event with cookie-missing reason for dynamic-credential', async () => {
				const encodedState = buildEncodedState({
					cid: 'credential-id',
					origin: 'dynamic-credential',
					bindingHash: 'expected-hash',
				});
				browserBindingService.verifyBinding.mockReturnValueOnce({
					ok: false,
					reason: 'cookie-missing',
				});
				const req = mock<AuthenticatedRequest>({ user: undefined as any });

				await expect((service as any).decodeCsrfState(encodedState, req)).rejects.toThrow(
					AuthError,
				);
				expect(eventService.emit).toHaveBeenCalledWith('oauth-callback-binding-rejected', {
					reason: 'cookie-missing',
					credentialId: 'credential-id',
					origin: 'dynamic-credential',
				});
			});
		});
	});

	describe('buildCsrfStateData', () => {
		it('returns static-credential data when credential is not resolvable', async () => {
			const credential = mock<CredentialsEntity>({ id: 'cred-1', isResolvable: false });
			const req = mock<OAuthRequest.OAuth1Credential.Auth>({ user: mock<User>({ id: 'user-1' }) });

			const result = await service.buildCsrfStateData(credential, req);

			expect(result).toEqual({ cid: 'cred-1', origin: 'static-credential', userId: 'user-1' });
			expect(dynamicCredentialsProxy.getSystemResolverId).not.toHaveBeenCalled();
		});

		it('returns static-credential data when credential is resolvable but no system resolver is configured', async () => {
			const credential = mock<CredentialsEntity>({ id: 'cred-1', isResolvable: true });
			const req = mock<OAuthRequest.OAuth1Credential.Auth>({ user: mock<User>({ id: 'user-1' }) });
			dynamicCredentialsProxy.getSystemResolverId.mockReturnValueOnce(null);

			const result = await service.buildCsrfStateData(credential, req);

			expect(result).toEqual({ cid: 'cred-1', origin: 'static-credential', userId: 'user-1' });
		});

		it('returns static-credential data when credential is resolvable, resolver exists, but cookie token is missing', async () => {
			const credential = mock<CredentialsEntity>({ id: 'cred-1', isResolvable: true });
			const req = mock<OAuthRequest.OAuth1Credential.Auth>({ user: mock<User>({ id: 'user-1' }) });
			dynamicCredentialsProxy.getSystemResolverId.mockReturnValueOnce('system-resolver');
			authService.getCookieToken.mockReturnValueOnce(undefined);

			const result = await service.buildCsrfStateData(credential, req);

			expect(result).toEqual({ cid: 'cred-1', origin: 'static-credential', userId: 'user-1' });
		});

		it('returns dynamic-credential data when credential is resolvable, resolver exists, and cookie token is present', async () => {
			const credential = mock<CredentialsEntity>({ id: 'cred-1', isResolvable: true });
			const req = mock<OAuthRequest.OAuth1Credential.Auth>({ user: mock<User>({ id: 'user-1' }) });
			dynamicCredentialsProxy.getSystemResolverId.mockReturnValueOnce('system-resolver');
			authService.getCookieToken.mockReturnValueOnce('jwt-token');

			const result = await service.buildCsrfStateData(credential, req);

			expect(result).toEqual({
				cid: 'cred-1',
				origin: 'dynamic-credential',
				userId: 'user-1',
				credentialResolverId: 'system-resolver',
				authorizationHeader: 'Bearer jwt-token',
				authMetadata: { source: 'manual-execution' },
			});
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
			const flowState = { csrfSecret };

			const result = (service as any).verifyCsrfState(flowState, state);

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
			const flowState = { csrfSecret };

			const result = (service as any).verifyCsrfState(flowState, state);

			expect(result).toBe(true);
		});

		it('does not gate on createdAt — expiry is enforced by the cache TTL, not here', () => {
			// Expiry now lives at the cache layer (TTL = MAX_CSRF_AGE): an expired flow is
			// evicted and reaches verifyCsrfState as `undefined`. So given a present flowState,
			// a stale createdAt is no longer a rejection reason at this layer. The real expiry
			// path is covered by the cache-miss test below + the storeOauthFlowState TTL test.
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
			const flowState = { csrfSecret };

			const result = (service as any).verifyCsrfState(flowState, state);

			expect(result).toBe(true);
		});

		it('should return false when flowState is undefined (cache miss / replay)', () => {
			const token = new (require('csrf'))();
			const csrfSecret = 'csrf-secret';
			const stateToken = token.create(csrfSecret);

			const state = {
				token: stateToken,
				cid: 'credential-id',
				origin: 'static-credential',
				createdAt: Date.now(),
			};

			const result = (service as any).verifyCsrfState(undefined, state);

			expect(result).toBe(false);
		});

		it('should return false when token verification fails', () => {
			const state = {
				token: 'invalid-token',
				cid: 'credential-id',
				origin: 'static-credential',
				createdAt: Date.now(),
			};
			const flowState = { csrfSecret: 'csrf-secret' };

			const result = (service as any).verifyCsrfState(flowState, state);

			expect(result).toBe(false);
		});
	});

	describe('storeOauthFlowState / consumeOauthFlowState', () => {
		it('stores the flow state in the cache under the token key with MAX_CSRF_AGE TTL', async () => {
			await service.storeOauthFlowState('the-token', {
				csrfSecret: 'csrf-secret',
				codeVerifier: 'code-verifier',
			});

			expect(cacheService.set).toHaveBeenCalledWith(
				'oauth:flow:the-token',
				{ csrfSecret: 'csrf-secret', codeVerifier: 'code-verifier' },
				5 * Time.minutes.toMilliseconds,
			);
		});

		it('reads then deletes the flow state on consume (replay protection)', async () => {
			cacheService.get.mockResolvedValue({ csrfSecret: 'csrf-secret' });

			const result = await service.consumeOauthFlowState('the-token');

			expect(cacheService.get).toHaveBeenCalledWith('oauth:flow:the-token');
			expect(cacheService.delete).toHaveBeenCalledWith('oauth:flow:the-token');
			expect(result).toEqual({ csrfSecret: 'csrf-secret' });
		});

		it('returns undefined and does not delete when cache misses', async () => {
			cacheService.get.mockResolvedValue(undefined);

			const result = await service.consumeOauthFlowState('the-token');

			expect(result).toBeUndefined();
			expect(cacheService.delete).not.toHaveBeenCalled();
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
			const mockDecryptedData = { someField: 'value' };
			const mockOAuthCredentials = { clientId: 'client-id' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { state: encodedState },
				user: mock<User>({ id: 'user-id' }),
			});

			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			credentialsFinderService.findCredentialForUser.mockResolvedValue(mockCredential);
			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);
			cacheService.get.mockResolvedValue({
				csrfSecret: 'csrf-secret',
				codeVerifier: 'code-verifier',
			});

			vi.spyOn(service as any, 'verifyCsrfState').mockReturnValue(true);

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
			// Flow state read from cache and consumed (replay protection)
			expect(result[4]).toEqual({ csrfSecret: 'csrf-secret', codeVerifier: 'code-verifier' });
			expect(cacheService.delete).toHaveBeenCalledWith(`oauth:flow:${stateToken}`);
		});

		it('should reject the callback when the flow state is missing (replay / unknown state)', async () => {
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
			const mockDecryptedData = {};
			const mockOAuthCredentials = { clientId: 'client-id' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { state: encodedState },
				user: mock<User>({ id: 'user-id' }),
			});

			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			credentialsFinderService.findCredentialForUser.mockResolvedValue(mockCredential);
			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);
			cacheService.get.mockResolvedValue(undefined);

			await expect(service.resolveCredential(req)).rejects.toThrow(
				'The OAuth callback state is invalid!',
			);
		});

		it('should throw NotFoundError when credential is not found', async () => {
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
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { state: encodedState },
				user: mock<User>({ id: 'user-id' }),
			});

			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			await expect(service.resolveCredential(req)).rejects.toThrow(NotFoundError);
			await expect(service.resolveCredential(req)).rejects.toThrow('Credential not found');
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
			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));

			const mockCredential = mock<CredentialsEntity>({ id: 'credential-id' });
			const mockDecryptedData = { csrfSecret: 'csrf-secret' };
			const mockOAuthCredentials = { clientId: 'client-id' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { state: encodedState },
				user: mock<User>({ id: 'user-id' }),
			});

			credentialsFinderService.findCredentialForUser.mockResolvedValue(mockCredential);
			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			vi.spyOn(service as any, 'verifyCsrfState').mockReturnValue(false);

			await expect(service.resolveCredential(req)).rejects.toThrow(UnexpectedError);
			await expect(service.resolveCredential(req)).rejects.toThrow(
				'The OAuth callback state is invalid!',
			);
		});

		it('should resolve dynamic credential and verify CSRF when userId matches', async () => {
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
				user: mock<User>({ id: 'user-id' }),
			});

			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			credentialsRepository.findOneBy.mockResolvedValue(mockCredential);
			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);
			cacheService.get.mockResolvedValue({ csrfSecret: 'csrf-secret' });

			const verifySpy = vi.spyOn(service as any, 'verifyCsrfState').mockReturnValue(true);

			const result = await service.resolveCredential(req);

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
			expect(verifySpy).toHaveBeenCalled();
		});

		it('should reject dynamic credential callback when userId does not match req.user.id', async () => {
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

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { state: encodedState },
				user: mock<User>({ id: 'user-id' }),
			});

			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));

			await expect(service.resolveCredential(req)).rejects.toThrow(AuthError);
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

			cipher.decryptV2.mockResolvedValue(JSON.stringify(csrfData));
			credentialsRepository.findOneBy.mockResolvedValue(mockCredential);
			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);
			cacheService.get.mockResolvedValue({ csrfSecret: 'csrf-secret' });

			const verifySpy = vi.spyOn(service as any, 'verifyCsrfState').mockReturnValue(true);

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
			vi.spyOn(Credentials.prototype, 'getData').mockResolvedValue({});
		});

		afterEach(() => {
			vi.restoreAllMocks();
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
				{ version: 1, identity: authToken, metadata: {} },
				expect.any(Object),
				{ credentialResolverId: 'resolver-id' },
			);
		});

		it('should not persist csrfSecret on the credential when given oauth token data', async () => {
			const credential = mock<CredentialsEntity>({
				id: 'credential-id',
				name: 'Test Credential',
				type: 'googleOAuth2Api',
				data: 'encrypted-data',
			});
			// csrfSecret no longer lives on credential.data — the only path that used to
			// strip it on save is gone. This test guards that we still never persist it
			// even if some caller mistakenly includes it.
			const oauthTokenData = {
				access_token: 'access-token',
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

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
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

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id' },
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
				isManaged: false,
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'old-scope' };
			const mockOAuthCredentials = { clientId: 'client-id', scope: 'old-scope' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id', scope: 'old-scope' },
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});

		it.each(['facebookGraphApiOAuth2Api', 'facebookGraphAppOAuth2Api'])(
			'should not delete scope for %s credentials',
			async (credentialType) => {
				const credential = mock<CredentialsEntity>({
					id: '1',
					type: credentialType,
					isManaged: false,
				});
				const mockDecryptedData = { clientId: 'client-id', scope: 'custom-scope' };
				const mockOAuthCredentials = { clientId: 'client-id', scope: 'custom-scope' };
				const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

				vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
				credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
				credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

				await service.getOAuthCredentials(credential);

				expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
					mockAdditionalData,
					{ clientId: 'client-id', scope: 'custom-scope' },
					credentialType,
					'internal',
					undefined,
					undefined,
				);
			},
		);
		it('should not delete scope for wordpressOAuth2Api credentials', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'wordpressOAuth2Api',
				isManaged: false,
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'custom-scope' };
			const mockOAuthCredentials = { clientId: 'client-id', scope: 'custom-scope' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id', scope: 'custom-scope' },
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});

		it('should not delete scope for googleSheetsOAuth2Api credentials', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleSheetsOAuth2Api',
				isManaged: false,
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'custom-scope' };
			const mockOAuthCredentials = { clientId: 'client-id', scope: 'custom-scope' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id', scope: 'custom-scope' },
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});

		it('should not delete scope for googleCalendarOAuth2Api credentials', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleCalendarOAuth2Api',
				isManaged: false,
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'custom-scope' };
			const mockOAuthCredentials = { clientId: 'client-id', scope: 'custom-scope' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id', scope: 'custom-scope' },
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});

		it('should not delete scope for googleCloudStorageOAuth2Api credentials', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleCloudStorageOAuth2Api',
				isManaged: false,
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'custom-scope' };
			const mockOAuthCredentials = { clientId: 'client-id', scope: 'custom-scope' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id', scope: 'custom-scope' },
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});

		it('should not delete scope for zendeskOAuth2Api credentials', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'zendeskOAuth2Api',
				isManaged: false,
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'custom-scope' };
			const mockOAuthCredentials = { clientId: 'client-id', scope: 'custom-scope' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id', scope: 'custom-scope' },
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

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id', scope: 'old-scope' },
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});

		it('should not delete scope when the credential inherits an editable scope property', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'customOAuth2Api',
				isManaged: false,
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'custom-scope' };
			const mockOAuthCredentials = { clientId: 'client-id', scope: 'custom-scope' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{ displayName: 'Scope', name: 'scope', type: 'string', default: '' },
			]);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id', scope: 'custom-scope' },
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});

		it('should delete scope when the credential overrides the inherited scope as hidden', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'gmailOAuth2',
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'stale-scope' };
			const mockOAuthCredentials = { clientId: 'client-id' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{ displayName: 'Scope', name: 'scope', type: 'hidden', default: 'default-scope' },
			]);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id' },
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});

		it('should delete scope when getCredentialsProperties throws', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'unknownOAuth2Api',
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'stale-scope' };
			const mockOAuthCredentials = { clientId: 'client-id' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);
			credentialsHelper.getCredentialsProperties.mockImplementation(() => {
				throw new Error('Unknown credential type');
			});

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id' },
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});

		it('should delete scope for managed credentials of a generic editable-scope type', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleOAuth2Api',
				isManaged: true,
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'custom-scope' };
			const mockOAuthCredentials = { clientId: 'client-id' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id' },
				credential.type,
				'internal',
				undefined,
				undefined,
			);
		});

		it('should delete scope for managed credentials that inherit an editable scope property', async () => {
			const credential = mock<CredentialsEntity>({
				id: '1',
				type: 'customOAuth2Api',
				isManaged: true,
			});
			const mockDecryptedData = { clientId: 'client-id', scope: 'custom-scope' };
			const mockOAuthCredentials = { clientId: 'client-id' };
			const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();

			vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(mockAdditionalData);
			credentialsHelper.getDecrypted.mockResolvedValue(mockDecryptedData);
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(mockOAuthCredentials);
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{ displayName: 'Scope', name: 'scope', type: 'string', default: '' },
			]);

			await service.getOAuthCredentials(credential);

			expect(credentialsHelper.applyDefaultsAndOverwrites).toHaveBeenCalledWith(
				mockAdditionalData,
				{ clientId: 'client-id' },
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
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/oauth2/auth?client_id=client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: {
						getUri: mockGetUri,
					},
				} as any;
			});

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

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const generateAOuth2AuthUriBound = service.generateAOauth2AuthUri.bind(service);
			const authUri = await generateAOuth2AuthUriBound(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(authUri).toContain('https://example.domain/oauth2/auth');
			// CSRF/PKCE state must not be persisted to the credential; it lives in the cache.
			expect(service.encryptAndSaveData).not.toHaveBeenCalled();
			expect(cacheService.set).toHaveBeenCalledWith(
				expect.stringMatching(/^oauth:flow:/),
				expect.objectContaining({ csrfSecret: expect.any(String) }),
				expect.any(Number),
			);
			expect(externalHooks.run).toHaveBeenCalledWith('oauth2.authenticate', [
				expect.objectContaining({
					state: expect.any(String), // base64State
				}),
			]);

			// Reject javascript: and data: protocols in OAuth2 URLs (XSS)
			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue({
				...oauthCredentials,
				authUrl: "javascript:alert('Hacked')//",
			});
			const promiseJs = generateAOuth2AuthUriBound(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});
			await expect(promiseJs).rejects.toThrow(BadRequestError);
			await expect(promiseJs).rejects.toThrow(/OAuth url must use HTTP or HTTPS protocol/);

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue({
				...oauthCredentials,
				accessTokenUrl: 'data:text/html,<script>alert(1)</script>',
			});
			const promiseData = generateAOuth2AuthUriBound(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});
			await expect(promiseData).rejects.toThrow(BadRequestError);
			await expect(promiseData).rejects.toThrow(/OAuth url must use HTTP or HTTPS protocol/);
		});

		it('should generate auth URI with PKCE flow', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const pkceChallenge = await import('pkce-challenge');
			vi.mocked(pkceChallenge.default).mockResolvedValue({
				code_verifier: 'code_verifier',
				code_challenge: 'code_challenge',
			});

			const mockGetUri = vi.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/oauth2/auth?client_id=client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid&code_challenge=code_challenge&code_challenge_method=S256',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: {
						getUri: mockGetUri,
					},
				} as any;
			});

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

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const authUri = await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(authUri).toContain('code_challenge=code_challenge');
			// CSRF + PKCE state both go to the cache, not to the credential
			expect(service.encryptAndSaveData).not.toHaveBeenCalled();
			expect(cacheService.set).toHaveBeenCalledWith(
				expect.stringMatching(/^oauth:flow:/),
				expect.objectContaining({
					csrfSecret: expect.any(String),
					codeVerifier: 'code_verifier',
				}),
				expect.any(Number),
			);
		});

		it('should generate auth URI with auth query parameters', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/oauth2/auth?client_id=client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid&custom_param=value',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: {
						getUri: mockGetUri,
					},
				} as any;
			});

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

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const authUri = await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(authUri).toContain('https://example.domain/oauth2/auth');
			expect(mockGetUri).toHaveBeenCalled();
		});

		it('should merge authQueryParameters into the authorize URL query', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');

			// Capture the options passed into the ClientOAuth2 constructor to prove the service
			// parses authQueryParameters and sets oAuthOptions.query from it.
			let capturedOptions: { query?: Record<string, string> } | undefined;
			vi.mocked(ClientOAuth2).mockImplementation(function (options) {
				capturedOptions = options as { query?: Record<string, string> };
				return {
					code: {
						getUri: () => ({
							toString: () => 'https://example.domain/oauth2/auth?response_type=code',
						}),
					},
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'microsoftOutlookOAuth2Api' });
			const oauthCredentials: OAuth2CredentialData = {
				clientId: 'client_id',
				clientSecret: 'client_secret',
				authUrl: 'https://example.domain/oauth2/auth',
				accessTokenUrl: 'https://example.domain/oauth2/token',
				scope: 'openid',
				grantType: 'authorizationCode',
				authentication: 'header',
				authQueryParameters: 'response_mode=query&prompt=select_account',
			};

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(capturedOptions?.query).toEqual({
				response_mode: 'query',
				prompt: 'select_account',
			});
		});

		it('should not set query when credentials have no authQueryParameters', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');

			let capturedOptions: { query?: Record<string, string> } | undefined;
			vi.mocked(ClientOAuth2).mockImplementation(function (options) {
				capturedOptions = options as { query?: Record<string, string> };
				return {
					code: {
						getUri: () => ({
							toString: () => 'https://example.domain/oauth2/auth?response_type=code',
						}),
					},
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'microsoftOutlookOAuth2Api' });
			const oauthCredentials: OAuth2CredentialData = {
				clientId: 'client_id',
				clientSecret: 'client_secret',
				authUrl: 'https://example.domain/oauth2/auth',
				accessTokenUrl: 'https://example.domain/oauth2/token',
				scope: 'openid',
				grantType: 'authorizationCode',
				authentication: 'header',
			};

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(capturedOptions?.query).toBeUndefined();
		});

		it('should handle dynamic client registration with root-level server URL', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/oauth2/auth?client_id=registered_client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid profile',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: {
						getUri: mockGetUri,
					},
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.mocked(httpClientMock.get).mockResolvedValue({
				data: {
					authorization_endpoint: 'https://example.domain/oauth2/auth',
					token_endpoint: 'https://example.domain/oauth2/token',
					registration_endpoint: 'https://example.domain/oauth2/register',
					grant_types_supported: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_methods_supported: ['none', 'client_secret_basic'],
					code_challenge_methods_supported: ['S256'],
					scopes_supported: ['openid', 'profile'],
				},
			} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: {
					client_id: 'registered_client_id',
					client_secret: 'registered_client_secret',
				},
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const authUri = await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(authUri).toContain('https://example.domain/oauth2/auth');
			expect(httpClientMock.get).toHaveBeenCalledWith(
				'https://example.domain/.well-known/oauth-authorization-server',
				expect.any(Object),
			);
			expect(httpClientMock.post).toHaveBeenCalledWith(
				'https://example.domain/oauth2/register',
				expect.objectContaining({
					client_name: 'n8n',
					grant_types: ['authorization_code', 'refresh_token'],
				}),
			);
			// JWE fields are only added behind both feature gates (flag + jweEnabled).
			const dcrPayload = httpClientMock.post.mock.calls[0][1];
			expect(dcrPayload).not.toHaveProperty('jwks_uri');
			expect(dcrPayload).not.toHaveProperty('id_token_encrypted_response_alg');
			expect(dcrPayload).not.toHaveProperty('id_token_encrypted_response_enc');
			expect(externalHooks.run).toHaveBeenCalledWith(
				'oauth2.dynamicClientRegistration',
				expect.any(Array),
			);
			// DCR-driven fields still get persisted to the credential, but CSRF/PKCE do not.
			expect(service.encryptAndSaveData).toHaveBeenCalled();
			const callArgs = (service.encryptAndSaveData as Mock).mock.calls[0];
			expect(callArgs[0]).toBe(credential);
			expect(callArgs[1]).toHaveProperty('authUrl', 'https://example.domain/oauth2/auth');
			expect(callArgs[1]).toHaveProperty('accessTokenUrl', 'https://example.domain/oauth2/token');
			expect(callArgs[1]).toHaveProperty('clientId', 'registered_client_id');
			expect(callArgs[1]).toHaveProperty('clientSecret', 'registered_client_secret');
			expect(callArgs[1]).toHaveProperty('scope', 'openid profile');
			expect(callArgs[1]).toHaveProperty('grantType', 'pkce');
			expect(callArgs[1]).not.toHaveProperty('csrfSecret');
			expect(callArgs[1]).not.toHaveProperty('codeVerifier');
			expect(cacheService.set).toHaveBeenCalledWith(
				expect.stringMatching(/^oauth:flow:/),
				expect.objectContaining({
					csrfSecret: expect.any(String),
					codeVerifier: 'code_verifier',
				}),
				expect.any(Number),
			);
		});

		it('should throw BadRequestError when OAuth2 server metadata is invalid', async () => {
			const credential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.mocked(httpClientMock.get).mockResolvedValue({
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
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.mocked(httpClientMock.get).mockResolvedValue({
				data: {
					authorization_endpoint: 'https://example.domain/oauth2/auth',
					token_endpoint: 'https://example.domain/oauth2/token',
					registration_endpoint: 'https://example.domain/oauth2/register',
					grant_types_supported: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_methods_supported: ['client_secret_basic'],
					code_challenge_methods_supported: ['S256'],
				},
			} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
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
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/oauth2/auth?client_id=registered_client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: {
						getUri: mockGetUri,
					},
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.mocked(httpClientMock.get).mockResolvedValue({
				data: {
					authorization_endpoint: 'https://example.domain/oauth2/auth',
					token_endpoint: 'https://example.domain/oauth2/token',
					registration_endpoint: 'https://example.domain/oauth2/register',
					grant_types_supported: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_methods_supported: ['client_secret_post'],
					code_challenge_methods_supported: [],
				},
			} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: {
					client_id: 'registered_client_id',
					client_secret: 'registered_client_secret',
				},
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

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
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/oauth2/auth?client_id=client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: {
						getUri: mockGetUri,
					},
				} as any;
			});

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

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);
			vi.spyOn(service, 'createCsrfState').mockResolvedValue([
				'csrf-secret',
				'base64-state',
				'state-token',
			]);
			const storeOauthFlowState = vi
				.spyOn(service, 'storeOauthFlowState')
				.mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// The CSRF payload (incl. cid) is stashed server-side in the per-flow
			// cache instead of being encrypted into the state URL parameter.
			expect(storeOauthFlowState).toHaveBeenCalledWith(
				'state-token',
				expect.objectContaining({
					stateData: expect.objectContaining({ cid: '1' }),
				}),
			);
		});

		describe('browser binding', () => {
			it('does not apply binding when called without req/res', async () => {
				const credential = mock<CredentialsEntity>({ id: '1', type: 'genericOAuth2Api' });
				const oauthCredentials: OAuth2CredentialData = {
					clientId: 'client-id',
					authUrl: 'https://example.domain/oauth/authorize',
					accessTokenUrl: 'https://example.domain/oauth/token',
				} as OAuth2CredentialData;

				vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
				vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);
				vi.spyOn(service, 'createCsrfState').mockResolvedValue([
					'csrf-secret',
					'base64-state',
					'state-token',
				]);
				browserBindingService.isEnabled.mockReturnValue(true);

				const csrfData: CreateCsrfStateData = {
					cid: credential.id,
					origin: 'static-credential',
				};
				await service.generateAOauth2AuthUri(credential, csrfData);

				expect(browserBindingService.ensureBindingCookie).not.toHaveBeenCalled();
				expect(csrfData.bindingHash).toBeUndefined();
			});

			it('does not apply binding when the feature flag is off', async () => {
				const credential = mock<CredentialsEntity>({ id: '1', type: 'genericOAuth2Api' });
				const oauthCredentials: OAuth2CredentialData = {
					clientId: 'client-id',
					authUrl: 'https://example.domain/oauth/authorize',
					accessTokenUrl: 'https://example.domain/oauth/token',
				} as OAuth2CredentialData;

				vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
				vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);
				vi.spyOn(service, 'createCsrfState').mockResolvedValue([
					'csrf-secret',
					'base64-state',
					'state-token',
				]);
				browserBindingService.isEnabled.mockReturnValue(false);

				const csrfData: CreateCsrfStateData = {
					cid: credential.id,
					origin: 'static-credential',
				};
				const req = mock<Request>();
				const res = mock<Response>();
				await service.generateAOauth2AuthUri(credential, csrfData, req, res);

				expect(browserBindingService.ensureBindingCookie).not.toHaveBeenCalled();
				expect(csrfData.bindingHash).toBeUndefined();
			});

			it('applies bindingHash when flag is on and req/res are provided', async () => {
				const credential = mock<CredentialsEntity>({ id: '1', type: 'genericOAuth2Api' });
				const oauthCredentials: OAuth2CredentialData = {
					clientId: 'client-id',
					authUrl: 'https://example.domain/oauth/authorize',
					accessTokenUrl: 'https://example.domain/oauth/token',
				} as OAuth2CredentialData;

				vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
				vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);
				vi.spyOn(service, 'createCsrfState').mockResolvedValue([
					'csrf-secret',
					'base64-state',
					'state-token',
				]);
				browserBindingService.isEnabled.mockReturnValue(true);
				browserBindingService.ensureBindingCookie.mockReturnValue('nonce-value');
				browserBindingService.computeHash.mockReturnValue('hash-value');

				const csrfData: CreateCsrfStateData = {
					cid: credential.id,
					origin: 'static-credential',
				};
				const req = mock<Request>();
				const res = mock<Response>();
				await service.generateAOauth2AuthUri(credential, csrfData, req, res);

				expect(browserBindingService.ensureBindingCookie).toHaveBeenCalledWith(req, res);
				expect(browserBindingService.computeHash).toHaveBeenCalledWith('nonce-value');
				expect(csrfData.bindingHash).toBe('hash-value');
			});
		});
	});

	describe('generateAOauth2AuthUri with DCR and RFC 8414 compliance', () => {
		it('should insert .well-known between host and path per RFC 8414', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/authorize?client_id=registered_client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: {
						getUri: mockGetUri,
					},
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain/issuer1',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.mocked(httpClientMock.get).mockResolvedValue({
				data: {
					authorization_endpoint: 'https://example.domain/issuer1/authorize',
					token_endpoint: 'https://example.domain/issuer1/token',
					registration_endpoint: 'https://example.domain/issuer1/register',
					grant_types_supported: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_methods_supported: ['client_secret_basic'],
					code_challenge_methods_supported: ['S256'],
					scopes_supported: ['openid', 'profile'],
				},
			} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: {
					client_id: 'registered_client_id',
					client_secret: 'registered_client_secret',
				},
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// Verify RFC 8414: .well-known inserted between host and path
			expect(httpClientMock.get).toHaveBeenCalledWith(
				'https://example.domain/.well-known/oauth-authorization-server/issuer1',
				expect.any(Object),
			);
		});

		it('should handle root-level issuer URLs (no path)', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/authorize?client_id=test_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: {
						getUri: mockGetUri,
					},
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.mocked(httpClientMock.get).mockResolvedValue({
				data: {
					authorization_endpoint: 'https://example.domain/authorize',
					token_endpoint: 'https://example.domain/token',
					registration_endpoint: 'https://example.domain/register',
					grant_types_supported: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_methods_supported: ['client_secret_basic'],
					code_challenge_methods_supported: ['S256'],
				},
			} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: {
					client_id: 'test_id',
					client_secret: 'test_secret',
				},
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// Root-level issuer: .well-known directly after origin
			expect(httpClientMock.get).toHaveBeenCalledWith(
				'https://example.domain/.well-known/oauth-authorization-server',
				expect.any(Object),
			);
		});

		it('should handle issuer URLs with trailing slashes', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () => 'https://example.domain/authorize?client_id=test_id',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: {
						getUri: mockGetUri,
					},
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain/issuer1/',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.mocked(httpClientMock.get).mockResolvedValue({
				data: {
					authorization_endpoint: 'https://example.domain/authorize',
					token_endpoint: 'https://example.domain/token',
					registration_endpoint: 'https://example.domain/register',
					grant_types_supported: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_methods_supported: ['client_secret_basic'],
					code_challenge_methods_supported: ['S256'],
				},
			} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'test_id', client_secret: 'test_secret' },
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// Should strip trailing slash: /issuer1/ becomes /issuer1
			expect(httpClientMock.get).toHaveBeenCalledWith(
				'https://example.domain/.well-known/oauth-authorization-server/issuer1',
				expect.any(Object),
			);
		});

		it('should handle multi-segment paths correctly', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () => 'https://oauth.example.com/authorize?client_id=test_id',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: {
						getUri: mockGetUri,
					},
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://oauth.example.com/tenant/auth/provider',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.mocked(httpClientMock.get).mockResolvedValue({
				data: {
					authorization_endpoint: 'https://oauth.example.com/tenant/auth/provider/authorize',
					token_endpoint: 'https://oauth.example.com/tenant/auth/provider/token',
					registration_endpoint: 'https://oauth.example.com/tenant/auth/provider/register',
					grant_types_supported: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_methods_supported: ['client_secret_basic'],
					code_challenge_methods_supported: ['S256'],
				},
			} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'test_id', client_secret: 'test_secret' },
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// Multi-segment path per RFC 8414
			expect(httpClientMock.get).toHaveBeenCalledWith(
				'https://oauth.example.com/.well-known/oauth-authorization-server/tenant/auth/provider',
				expect.any(Object),
			);
		});

		it('should fall back to OpenID Connect path insertion when RFC 8414 fails', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () => 'https://example.domain/authorize?client_id=test_id',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: {
						getUri: mockGetUri,
					},
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain/issuer1',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			// Protected resource discovery fails (both calls)
			// Then RFC 8414 fails, OpenID Connect succeeds
			vi.mocked(httpClientMock.get)
				.mockRejectedValueOnce(new Error('404 Not Found')) // protected resource path-specific
				.mockRejectedValueOnce(new Error('404 Not Found')) // protected resource root
				.mockRejectedValueOnce(new Error('404 Not Found')) // RFC 8414
				.mockResolvedValueOnce({
					data: {
						authorization_endpoint: 'https://example.domain/issuer1/authorize',
						token_endpoint: 'https://example.domain/issuer1/token',
						registration_endpoint: 'https://example.domain/issuer1/register',
						grant_types_supported: ['authorization_code', 'refresh_token'],
						token_endpoint_auth_methods_supported: ['client_secret_basic'],
						code_challenge_methods_supported: ['S256'],
					},
				} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'test_id', client_secret: 'test_secret' },
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// Verify it tried protected resource discovery, then fell back to auth server discovery
			expect(httpClientMock.get).toHaveBeenCalledTimes(4);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				3, // After 2 protected resource calls
				'https://example.domain/.well-known/oauth-authorization-server/issuer1',
				expect.any(Object),
			);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				4, // OpenID Connect path insertion succeeds
				'https://example.domain/.well-known/openid-configuration/issuer1',
				expect.any(Object),
			);
		});

		it('should fall back to OpenID Connect path appending when first two fail', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () => 'https://example.domain/authorize?client_id=test_id',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: {
						getUri: mockGetUri,
					},
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain/issuer1',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			// Protected resource discovery fails, then RFC 8414 and OpenID Connect path insertion fail, path appending succeeds
			vi.mocked(httpClientMock.get)
				.mockRejectedValueOnce(new Error('404 Not Found')) // protected resource path-specific
				.mockRejectedValueOnce(new Error('404 Not Found')) // protected resource root
				.mockRejectedValueOnce(new Error('404 Not Found')) // RFC 8414
				.mockRejectedValueOnce(new Error('404 Not Found')) // OpenID Connect path insertion
				.mockResolvedValueOnce({
					data: {
						authorization_endpoint: 'https://example.domain/issuer1/authorize',
						token_endpoint: 'https://example.domain/issuer1/token',
						registration_endpoint: 'https://example.domain/issuer1/register',
						grant_types_supported: ['authorization_code', 'refresh_token'],
						token_endpoint_auth_methods_supported: ['client_secret_basic'],
						code_challenge_methods_supported: ['S256'],
					},
				} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'test_id', client_secret: 'test_secret' },
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// Verify all endpoints were tried (2 protected resource + 3 auth server)
			expect(httpClientMock.get).toHaveBeenCalledTimes(5);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				3, // After 2 protected resource calls
				'https://example.domain/.well-known/oauth-authorization-server/issuer1',
				expect.any(Object),
			);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				4,
				'https://example.domain/.well-known/openid-configuration/issuer1',
				expect.any(Object),
			);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				5, // OpenID Connect path appending succeeds
				'https://example.domain/issuer1/.well-known/openid-configuration',
				expect.any(Object),
			);
		});

		it('should fall back to origin-only discovery when path-aware variants fail (Atlassian MCP)', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () => 'https://mcp.atlassian.com/authorize?client_id=test_id',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: { getUri: mockGetUri },
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'mcpOAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://mcp.atlassian.com/v1/mcp',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			vi.mocked(httpClientMock.get)
				.mockRejectedValueOnce(new Error('404')) // protected resource path-specific
				.mockRejectedValueOnce(new Error('404')) // protected resource root
				.mockRejectedValueOnce(new Error('404')) // RFC 8414 path insertion
				.mockRejectedValueOnce(new Error('404')) // OpenID Connect path insertion
				.mockRejectedValueOnce(new Error('401')) // OpenID Connect path appending
				.mockResolvedValueOnce({
					data: {
						authorization_endpoint: 'https://mcp.atlassian.com/authorize',
						token_endpoint: 'https://mcp.atlassian.com/token',
						registration_endpoint: 'https://mcp.atlassian.com/register',
						grant_types_supported: ['authorization_code', 'refresh_token'],
						token_endpoint_auth_methods_supported: ['client_secret_basic'],
						code_challenge_methods_supported: ['S256'],
					},
				} as any); // origin-only fallback succeeds

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'test_id', client_secret: 'test_secret' },
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(httpClientMock.get).toHaveBeenCalledTimes(6);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				3,
				'https://mcp.atlassian.com/.well-known/oauth-authorization-server/v1/mcp',
				expect.any(Object),
			);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				4,
				'https://mcp.atlassian.com/.well-known/openid-configuration/v1/mcp',
				expect.any(Object),
			);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				5,
				'https://mcp.atlassian.com/v1/mcp/.well-known/openid-configuration',
				expect.any(Object),
			);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				6,
				'https://mcp.atlassian.com/.well-known/oauth-authorization-server',
				expect.any(Object),
			);
		});

		it('should throw error when all discovery endpoints fail', async () => {
			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain/issuer1',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			// All three endpoints fail
			vi.mocked(httpClientMock.get).mockRejectedValue(new Error('404 Not Found'));

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
			).rejects.toThrow('Failed to discover OAuth2 authorization server metadata');

			// Should have tried all endpoints (2 protected resource + 4 auth server per invocation)
			expect(httpClientMock.get).toHaveBeenCalledTimes(12); // 6 calls per invocation × 2 invocations
		});

		it('should discover authorization server via protected resource metadata (MCP flow)', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () => 'https://auth.example.com/authorize?client_id=test_id',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: { getUri: mockGetUri },
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://mcp.notion.com/mcp',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			// Protected resource discovery (path-specific fails, root succeeds)
			vi.mocked(httpClientMock.get)
				.mockRejectedValueOnce(new Error('404')) // path-specific protected resource
				.mockResolvedValueOnce({
					data: {
						authorization_servers: ['https://auth.example.com'],
					},
				} as any) // root protected resource ✅
				// Authorization server metadata discovery
				.mockResolvedValueOnce({
					data: {
						authorization_endpoint: 'https://auth.example.com/authorize',
						token_endpoint: 'https://auth.example.com/token',
						registration_endpoint: 'https://auth.example.com/register',
						grant_types_supported: ['authorization_code', 'refresh_token'],
						token_endpoint_auth_methods_supported: ['client_secret_basic'],
						code_challenge_methods_supported: ['S256'],
					},
				} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'test_id', client_secret: 'test_secret' },
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// Verify protected resource discovery was attempted
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				1,
				'https://mcp.notion.com/.well-known/oauth-protected-resource/mcp',
				expect.any(Object),
			);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				2,
				'https://mcp.notion.com/.well-known/oauth-protected-resource',
				expect.any(Object),
			);

			// Verify authorization server discovery used the extracted URL
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				3,
				'https://auth.example.com/.well-known/oauth-authorization-server',
				expect.any(Object),
			);
		});

		it('should fall back to direct authorization server discovery when protected resource fails', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () => 'https://example.domain/authorize?client_id=test_id',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: { getUri: mockGetUri },
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain/issuer1',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			// Protected resource discovery fails (both path-specific and root)
			vi.mocked(httpClientMock.get)
				.mockRejectedValueOnce(new Error('404')) // path-specific protected resource
				.mockRejectedValueOnce(new Error('404')) // root protected resource
				// Fall back to direct authorization server discovery
				.mockResolvedValueOnce({
					data: {
						authorization_endpoint: 'https://example.domain/issuer1/authorize',
						token_endpoint: 'https://example.domain/issuer1/token',
						registration_endpoint: 'https://example.domain/issuer1/register',
						grant_types_supported: ['authorization_code', 'refresh_token'],
						token_endpoint_auth_methods_supported: ['client_secret_basic'],
						code_challenge_methods_supported: ['S256'],
					},
				} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'test_id', client_secret: 'test_secret' },
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// Verify protected resource discovery was attempted (and failed)
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				1,
				'https://example.domain/.well-known/oauth-protected-resource/issuer1',
				expect.any(Object),
			);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				2,
				'https://example.domain/.well-known/oauth-protected-resource',
				expect.any(Object),
			);

			// Verify fallback to direct authorization server discovery
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				3,
				'https://example.domain/.well-known/oauth-authorization-server/issuer1',
				expect.any(Object),
			);
		});

		it('should skip discovery URLs that resolve with a non-200 status', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const pkceChallenge = await import('pkce-challenge');
			vi.mocked(pkceChallenge.default).mockResolvedValue({
				code_verifier: 'code_verifier',
				code_challenge: 'code_challenge',
			});
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () => 'https://example.domain/authorize?client_id=test_id',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: { getUri: mockGetUri },
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://example.domain/issuer1',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			// Protected resource discovery resolves with non-200 responses (e.g. a 204
			// or 404 body that didn't throw) - the loop must treat these as misses and
			// fall through, exactly like the rejected case.
			vi.mocked(httpClientMock.get)
				.mockResolvedValueOnce({ statusCode: 204, data: { ignored: true } } as any) // path-specific protected resource
				.mockResolvedValueOnce({ statusCode: 404, data: { ignored: true } } as any) // root protected resource
				// Fall back to direct authorization server discovery (200 succeeds)
				.mockResolvedValueOnce({
					data: {
						authorization_endpoint: 'https://example.domain/issuer1/authorize',
						token_endpoint: 'https://example.domain/issuer1/token',
						registration_endpoint: 'https://example.domain/issuer1/register',
						grant_types_supported: ['authorization_code', 'refresh_token'],
						token_endpoint_auth_methods_supported: ['client_secret_basic'],
						code_challenge_methods_supported: ['S256'],
					},
				} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'test_id', client_secret: 'test_secret' },
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// The two non-200 protected resource responses were skipped, and discovery
			// continued to the direct authorization server URL.
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				1,
				'https://example.domain/.well-known/oauth-protected-resource/issuer1',
				expect.any(Object),
			);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				2,
				'https://example.domain/.well-known/oauth-protected-resource',
				expect.any(Object),
			);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				3,
				'https://example.domain/.well-known/oauth-authorization-server/issuer1',
				expect.any(Object),
			);
		});

		it('should handle Smithery MCP server with path-specific protected resource discovery', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () => 'https://auth.smithery.ai/authorize?client_id=test_id',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: { getUri: mockGetUri },
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'mcpOAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://server.smithery.ai/@AnkitDigitalsherpa/weather_mcp',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			// Path-specific protected resource discovery succeeds
			vi.mocked(httpClientMock.get)
				.mockResolvedValueOnce({
					data: {
						authorization_servers: ['https://auth.smithery.ai/AnkitDigitalsherpa/weather_mcp'],
						resource: 'https://server.smithery.ai/@AnkitDigitalsherpa/weather_mcp',
					},
				} as any)
				// Authorization server metadata discovery
				.mockResolvedValueOnce({
					data: {
						authorization_endpoint:
							'https://auth.smithery.ai/AnkitDigitalsherpa/weather_mcp/authorize',
						token_endpoint: 'https://auth.smithery.ai/AnkitDigitalsherpa/weather_mcp/token',
						registration_endpoint:
							'https://auth.smithery.ai/AnkitDigitalsherpa/weather_mcp/register',
						grant_types_supported: ['authorization_code', 'refresh_token'],
						token_endpoint_auth_methods_supported: ['client_secret_basic'],
						code_challenge_methods_supported: ['S256'],
					},
				} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'test_id', client_secret: 'test_secret' },
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// Verify protected resource discovery (path-specific succeeded)
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				1,
				'https://server.smithery.ai/.well-known/oauth-protected-resource/@AnkitDigitalsherpa/weather_mcp',
				expect.any(Object),
			);

			// Verify authorization server discovery used extracted URL
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				2,
				'https://auth.smithery.ai/.well-known/oauth-authorization-server/AnkitDigitalsherpa/weather_mcp',
				expect.any(Object),
			);
		});

		it('should handle Notion MCP server with root protected resource discovery', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () => 'https://mcp.notion.com/authorize?client_id=test_id',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: { getUri: mockGetUri },
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'mcpOAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://mcp.notion.com/mcp',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			// Path-specific fails, root protected resource discovery succeeds
			vi.mocked(httpClientMock.get)
				.mockRejectedValueOnce(new Error('404')) // path-specific
				.mockResolvedValueOnce({
					data: {
						resource: 'https://mcp.notion.com',
						resource_name: 'Notion MCP (Beta)',
						resource_documentation: 'https://developers.notion.com/docs/mcp',
						authorization_servers: ['https://mcp.notion.com'],
						bearer_methods_supported: ['header'],
					},
				} as any)
				// Authorization server metadata discovery (root-level)
				.mockResolvedValueOnce({
					data: {
						authorization_endpoint: 'https://mcp.notion.com/authorize',
						token_endpoint: 'https://mcp.notion.com/token',
						registration_endpoint: 'https://mcp.notion.com/register',
						grant_types_supported: ['authorization_code', 'refresh_token'],
						token_endpoint_auth_methods_supported: ['client_secret_basic'],
						code_challenge_methods_supported: ['S256'],
					},
				} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'test_id', client_secret: 'test_secret' },
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// Verify protected resource discovery
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				1,
				'https://mcp.notion.com/.well-known/oauth-protected-resource/mcp',
				expect.any(Object),
			);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				2,
				'https://mcp.notion.com/.well-known/oauth-protected-resource',
				expect.any(Object),
			);

			// Verify authorization server discovery (root-level issuer)
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				3,
				'https://mcp.notion.com/.well-known/oauth-authorization-server',
				expect.any(Object),
			);
		});

		it('should handle VEED.io with fallback to authorization server discovery', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () => 'https://www.veed.io/authorize?client_id=test_id',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: { getUri: mockGetUri },
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://www.veed.io/api/v1/oauth2',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			// Protected resource discovery fails (not an MCP server)
			vi.mocked(httpClientMock.get)
				.mockRejectedValueOnce(new Error('404')) // path-specific protected resource
				.mockRejectedValueOnce(new Error('404')) // root protected resource
				// Fallback to authorization server discovery (RFC 8414 succeeds)
				.mockResolvedValueOnce({
					data: {
						authorization_endpoint: 'https://www.veed.io/api/v1/oauth2/authorize',
						token_endpoint: 'https://www.veed.io/api/v1/oauth2/token',
						registration_endpoint: 'https://www.veed.io/api/v1/oauth2/register',
						grant_types_supported: ['authorization_code', 'refresh_token'],
						token_endpoint_auth_methods_supported: ['client_secret_basic'],
						code_challenge_methods_supported: ['S256'],
					},
				} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'test_id', client_secret: 'test_secret' },
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// Verify protected resource discovery was attempted
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				1,
				'https://www.veed.io/.well-known/oauth-protected-resource/api/v1/oauth2',
				expect.any(Object),
			);
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				2,
				'https://www.veed.io/.well-known/oauth-protected-resource',
				expect.any(Object),
			);

			// Verify fallback to RFC 8414 authorization server discovery
			expect(httpClientMock.get).toHaveBeenNthCalledWith(
				3,
				'https://www.veed.io/.well-known/oauth-authorization-server/api/v1/oauth2',
				expect.any(Object),
			);
		});

		it('should reject malicious authorization server URL from protected resource (SSRF protection)', async () => {
			const credential = mock<CredentialsEntity>({ id: '1', type: 'mcpOAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://malicious-mcp.example.com/mcp',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			// Malicious protected resource returns javascript: protocol URL
			vi.mocked(httpClientMock.get).mockResolvedValue({
				data: {
					authorization_servers: ['javascript:alert(1)'],
					resource: 'https://malicious-mcp.example.com/mcp',
				},
			} as any);

			try {
				await service.generateAOauth2AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				});
				// Should not reach here
				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(BadRequestError);
				expect((error as Error).message).toContain('OAuth url must use HTTP or HTTPS protocol');
			}
		});

		it('should succeed when server advertises only authorization_code without refresh_token', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () => 'https://login.commonroom.io/authorize?client_id=test_id',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: { getUri: mockGetUri },
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'https://login.commonroom.io',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			// Server metadata omits refresh_token from grant_types_supported (Common Room pattern)
			vi.mocked(httpClientMock.get)
				.mockRejectedValueOnce(new Error('404')) // protected resource path-specific
				.mockRejectedValueOnce(new Error('404')) // protected resource root
				.mockResolvedValueOnce({
					data: {
						authorization_endpoint: 'https://login.commonroom.io/authorize',
						token_endpoint: 'https://login.commonroom.io/token',
						registration_endpoint: 'https://login.commonroom.io/register',
						grant_types_supported: ['authorization_code'], // no refresh_token
						token_endpoint_auth_methods_supported: ['client_secret_basic'],
						code_challenge_methods_supported: ['S256'],
					},
				} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'test_id', client_secret: 'test_secret' },
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			// Should not throw "No supported grant type and authentication method found"
			await expect(
				service.generateAOauth2AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				}),
			).resolves.toBeDefined();

			// The server advertises S256 but only client_secret_basic (no 'none'), so a
			// confidential authorization_code flow is selected rather than public-client PKCE.
			const callArgs = (service.encryptAndSaveData as Mock).mock.calls[0];
			expect(callArgs[1]).toHaveProperty('grantType', 'authorizationCode');
			expect(callArgs[1]).toHaveProperty('authentication', 'header');
		});

		it('should not produce double /.well-known/ paths when authorization server URL already contains /.well-known/', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = vi.fn().mockReturnValue({
				toString: () => 'https://example.domain/authorize?client_id=test_id',
			});
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: { getUri: mockGetUri },
				} as any;
			});

			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			// Simulate the fallback path where serverUrl itself is the MCP server URL,
			// protected resource discovery fails, and authorizationServerUrl ends up being
			// a .well-known URL (or the server URL resolves to one with a .well-known path).
			// We test by providing a serverUrl whose path starts with /.well-known/ directly.
			const oauthCredentials = {
				serverUrl: 'https://example.domain/.well-known/openid-configuration',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			// Protected resource discovery fails (both)
			vi.mocked(httpClientMock.get)
				.mockRejectedValueOnce(new Error('404')) // protected resource path-specific
				.mockRejectedValueOnce(new Error('404')) // protected resource root
				.mockResolvedValueOnce({
					data: {
						authorization_endpoint: 'https://example.domain/authorize',
						token_endpoint: 'https://example.domain/token',
						registration_endpoint: 'https://example.domain/register',
						grant_types_supported: ['authorization_code', 'refresh_token'],
						token_endpoint_auth_methods_supported: ['client_secret_basic'],
						code_challenge_methods_supported: ['S256'],
					},
				} as any);

			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'test_id', client_secret: 'test_secret' },
			} as any);

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			// Verify the discovery URL used is the root-level one (no double /.well-known/)
			const authServerDiscoveryCall = httpClientMock.get.mock.calls[2]; // after 2 protected resource calls
			expect(authServerDiscoveryCall[0]).not.toContain(
				'/.well-known/openid-configuration/.well-known/',
			);
			expect(authServerDiscoveryCall[0]).toBe(
				'https://example.domain/.well-known/oauth-authorization-server',
			);
		});

		it('should reject malicious serverUrl before making any requests (SSRF protection)', async () => {
			const credential = mock<CredentialsEntity>({ id: '1', type: 'mcpOAuth2Api' });
			const oauthCredentials = {
				serverUrl: 'file:///etc/passwd',
				useDynamicClientRegistration: true,
			} as OAuth2CredentialData;

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			try {
				await service.generateAOauth2AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				});
				// Should not reach here
				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(BadRequestError);
				expect((error as Error).message).toContain('OAuth url must use HTTP or HTTPS protocol');
			}
		});
	});

	describe('generateAOauth2AuthUri with DCR and JWE fields', () => {
		beforeEach(async () => {
			vi.mocked(httpClientMock.get).mockResolvedValue({
				data: {
					authorization_endpoint: 'https://example.domain/oauth2/auth',
					token_endpoint: 'https://example.domain/oauth2/token',
					registration_endpoint: 'https://example.domain/oauth2/register',
					grant_types_supported: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_methods_supported: ['client_secret_basic'],
					code_challenge_methods_supported: ['S256'],
					scopes_supported: ['openid'],
				},
			} as any);
			vi.mocked(httpClientMock.post).mockResolvedValue({
				data: { client_id: 'rid', client_secret: 'rs' },
			} as any);

			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return {
					code: {
						getUri: vi.fn().mockReturnValue({
							toString: () => 'https://example.domain/oauth2/auth?state=state',
						}),
					},
				} as any;
			});

			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);
		});

		async function runDcr(
			jweEnabled: boolean | undefined,
			inlineJwks: boolean | undefined = undefined,
		) {
			const credential = mock<CredentialsEntity>({ id: '1', type: 'oAuth2Api' });
			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue({
				serverUrl: 'https://example.domain',
				useDynamicClientRegistration: true,
				jweEnabled,
				inlineJwks,
			} as OAuth2CredentialData);

			await service.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			return httpClientMock.post.mock.calls[0][1];
		}

		it.each([
			['jweEnabled=false, inlineJwks=undefined', false, undefined],
			['jweEnabled=false, inlineJwks=true', false, true],
			['jweEnabled=undefined, inlineJwks=true', undefined, true],
		])(
			'skips the proxy entirely when the credential has not opted into JWE (%s)',
			async (_label, jweEnabled, inlineJwks) => {
				const payload = await runDcr(jweEnabled, inlineJwks);

				expect(oauthJweServiceProxy.getDcrJweFields).not.toHaveBeenCalled();
				expect(payload).not.toHaveProperty('jwks_uri');
				expect(payload).not.toHaveProperty('jwks');
				expect(payload).not.toHaveProperty('id_token_encrypted_response_alg');
				expect(payload).not.toHaveProperty('id_token_encrypted_response_enc');
			},
		);

		it('forwards inlineJwks to the proxy when the credential has opted in', async () => {
			oauthJweServiceProxy.getDcrJweFields.mockResolvedValue({});

			await runDcr(true, true);

			expect(oauthJweServiceProxy.getDcrJweFields).toHaveBeenCalledWith(true);
		});

		it('defaults inlineJwks to false when the credential leaves it unset', async () => {
			oauthJweServiceProxy.getDcrJweFields.mockResolvedValue({});

			await runDcr(true, undefined);

			expect(oauthJweServiceProxy.getDcrJweFields).toHaveBeenCalledWith(false);
		});

		it('includes jwks_uri (not jwks) when the proxy returns the URI shape', async () => {
			const fields = {
				jwks_uri: 'http://localhost:5678/rest/.well-known/jwks.json',
				id_token_encrypted_response_alg: 'RSA-OAEP-256',
			};
			oauthJweServiceProxy.getDcrJweFields.mockResolvedValue(fields);

			const payload = await runDcr(true, false);

			expect(payload).toMatchObject(fields);
			expect(payload).not.toHaveProperty('jwks');
			// We deliberately leave `enc` for the IdP to choose.
			expect(payload).not.toHaveProperty('id_token_encrypted_response_enc');
		});

		it('includes jwks (not jwks_uri) when the proxy returns the inline shape', async () => {
			const fields = {
				jwks: { keys: [{ kty: 'RSA', alg: 'RSA-OAEP-256', kid: 'kid-1', n: 'n', e: 'AQAB' }] },
				id_token_encrypted_response_alg: 'RSA-OAEP-256',
			};
			oauthJweServiceProxy.getDcrJweFields.mockResolvedValue(fields);

			const payload = await runDcr(true, true);

			expect(payload).toMatchObject(fields);
			expect(payload).not.toHaveProperty('jwks_uri');
		});

		it('propagates errors thrown by the proxy', async () => {
			oauthJweServiceProxy.getDcrJweFields.mockRejectedValue(
				new Error('OAuth JWE public key is missing an "alg" field'),
			);

			await expect(runDcr(true)).rejects.toThrow('OAuth JWE public key is missing an "alg" field');
		});
	});

	describe('RFC 8707 resource parameter support', () => {
		const credential = mock<CredentialsEntity>({ id: '1', type: 'mcpOAuth2Api' });

		const makeDcrCredentials = (
			overrides: Partial<OAuth2CredentialData> = {},
		): OAuth2CredentialData =>
			({
				clientId: '',
				clientSecret: '',
				authUrl: '',
				accessTokenUrl: '',
				scope: 'openid',
				grantType: 'authorizationCode',
				authentication: 'header',
				useDynamicClientRegistration: true,
				serverUrl: 'https://mcp.example.com/mcp',
				...overrides,
			}) as OAuth2CredentialData;

		const mockClientOAuth2UriFromOptions = async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			vi.mocked(ClientOAuth2).mockImplementation(function (options) {
				return {
					code: {
						getUri: () => ({
							toString: () => {
								const url = new URL(options.authorizationUri ?? '');
								if (options.resource) url.searchParams.set('resource', options.resource);
								if (options.state) url.searchParams.set('state', options.state);
								return url.toString();
							},
						}),
					},
				} as any;
			});
		};

		const mockSuccessfulAuthorizationServerDiscovery = () => {
			vi.mocked(httpClientMock.get).mockResolvedValueOnce({
				data: {
					authorization_endpoint: 'https://auth.example.com/oauth2/auth',
					token_endpoint: 'https://auth.example.com/oauth2/token',
					registration_endpoint: 'https://auth.example.com/oauth2/register',
					grant_types_supported: ['authorization_code'],
					token_endpoint_auth_methods_supported: ['client_secret_basic'],
					scopes_supported: ['openid'],
				},
			});
			vi.mocked(httpClientMock.post).mockResolvedValueOnce({
				data: {
					client_id: 'registered-client-id',
					client_secret: 'registered-client-secret',
				},
			});
		};

		describe('discoverAndResolveResource', () => {
			it('should throw InvalidOAuthUrlError when discovered authorization server URL is empty', async () => {
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: {
						authorization_servers: [''],
						resource: 'https://mcp.example.com',
					},
				});

				await expect(
					(service as any).discoverAndResolveResource(
						makeDcrCredentials(),
						{ cid: '1', origin: 'static-credential' } as any,
						'https://mcp.example.com',
					),
				).rejects.toThrow(InvalidOAuthUrlError);
			});

			it('should throw InvalidOAuthUrlError when discovered authorization server URL is rejected by OAuth URL validation', async () => {
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: {
						authorization_servers: ['ftp://127.0.0.1'],
						resource: 'https://mcp.example.com',
					},
				});

				await expect(
					(service as any).discoverAndResolveResource(
						makeDcrCredentials(),
						{ cid: '1', origin: 'static-credential' } as any,
						'https://mcp.example.com',
					),
				).rejects.toThrow(InvalidOAuthUrlError);
			});

			it('should keep the supplied authorization server when discovery fails and DCR is disabled', async () => {
				const oauthCredentials = makeDcrCredentials({
					useDynamicClientRegistration: false,
					resourceUrl: undefined,
				});
				const csrfData = { cid: '1', origin: 'static-credential' } as CreateCsrfStateData;
				const discoverSpy = vi
					.spyOn(service as any, 'discoverProtectedResourceMetadata')
					.mockRejectedValueOnce(new Error('not available'));

				const result = await (service as any).discoverAndResolveResource(
					oauthCredentials,
					csrfData,
					'https://auth.example.com',
				);

				expect(result).toEqual({
					authorizationServerUrl: 'https://auth.example.com',
					discoveredResource: undefined,
				});
				expect(oauthCredentials.resource).toBeUndefined();
				expect(csrfData.resource).toBeUndefined();
				discoverSpy.mockRestore();
			});

			it('should fall back to serverUrl as the authorization server when discovery fails and DCR is enabled', async () => {
				const oauthCredentials = makeDcrCredentials({
					serverUrl: 'https://auth.example.com/issuer',
					resourceUrl: undefined,
				});
				const csrfData = { cid: '1', origin: 'static-credential' } as CreateCsrfStateData;
				const discoverSpy = vi
					.spyOn(service as any, 'discoverProtectedResourceMetadata')
					.mockRejectedValueOnce(new Error('not available'));

				const result = await (service as any).discoverAndResolveResource(
					oauthCredentials,
					csrfData,
					'https://placeholder.example.com',
				);

				expect(result).toEqual({
					authorizationServerUrl: 'https://auth.example.com/issuer',
					discoveredResource: undefined,
				});
				expect(oauthCredentials.resource).toBeUndefined();
				expect(csrfData.resource).toBeUndefined();
				discoverSpy.mockRestore();
			});

			it('should store the resolved resource on the credential and CSRF state', async () => {
				const oauthCredentials = makeDcrCredentials({ resourceUrl: undefined });
				const csrfData = { cid: '1', origin: 'static-credential' } as CreateCsrfStateData;
				const discoverSpy = vi
					.spyOn(service as any, 'discoverProtectedResourceMetadata')
					.mockResolvedValueOnce({
						authorization_servers: ['https://auth.example.com'],
						resource: 'https://mcp.example.com/mcp',
					});

				await (service as any).discoverAndResolveResource(
					oauthCredentials,
					csrfData,
					'https://placeholder.example.com',
				);

				expect(oauthCredentials.resource).toBe('https://mcp.example.com/mcp');
				expect(csrfData.resource).toBe('https://mcp.example.com/mcp');
				discoverSpy.mockRestore();
			});
		});

		describe('performDynamicClientRegistration', () => {
			const makeMetadata = (overrides: Record<string, unknown> = {}) => ({
				authorization_endpoint: 'https://auth.example.com/oauth2/auth',
				token_endpoint: 'https://auth.example.com/oauth2/token',
				registration_endpoint: 'https://auth.example.com/oauth2/register',
				grant_types_supported: ['authorization_code'],
				token_endpoint_auth_methods_supported: ['client_secret_basic'],
				code_challenge_methods_supported: [],
				...overrides,
			});

			it('should register with the second discovery URL when the first one fails', async () => {
				const oauthCredentials = makeDcrCredentials();
				const toUpdate = {};

				vi.mocked(httpClientMock.get)
					.mockRejectedValueOnce(new Error('404'))
					.mockResolvedValueOnce({ data: makeMetadata() });
				vi.mocked(httpClientMock.post).mockResolvedValueOnce({
					data: { client_id: 'registered-client-id' },
				});

				await (service as any).performDynamicClientRegistration(
					oauthCredentials,
					'https://auth.example.com/issuer',
					toUpdate,
				);

				expect(httpClientMock.get).toHaveBeenNthCalledWith(
					1,
					'https://auth.example.com/.well-known/oauth-authorization-server/issuer',
					expect.any(Object),
				);
				expect(httpClientMock.get).toHaveBeenNthCalledWith(
					2,
					'https://auth.example.com/.well-known/openid-configuration/issuer',
					expect.any(Object),
				);
				expect(httpClientMock.post).toHaveBeenCalledWith(
					'https://auth.example.com/oauth2/register',
					expect.objectContaining({
						grant_types: ['authorization_code', 'refresh_token'],
						token_endpoint_auth_method: 'client_secret_basic',
					}),
				);
				expect(toUpdate).toEqual(
					expect.objectContaining({
						authUrl: 'https://auth.example.com/oauth2/auth',
						accessTokenUrl: 'https://auth.example.com/oauth2/token',
						clientId: 'registered-client-id',
						grantType: 'authorizationCode',
						authentication: 'header',
					}),
				);
				expect(toUpdate).not.toHaveProperty('clientSecret');
				expect(toUpdate).not.toHaveProperty('scope');
			});

			it.each([
				['header', 'client_secret_basic'],
				['body', 'client_secret_post'],
			] as const)(
				'should register client credentials flow using %s authentication',
				async (authentication, authMethod) => {
					const oauthCredentials = makeDcrCredentials();
					const toUpdate = {};

					vi.mocked(httpClientMock.get).mockResolvedValueOnce({
						data: makeMetadata({
							grant_types_supported: ['client_credentials'],
							token_endpoint_auth_methods_supported: [authMethod],
						}),
					});
					vi.mocked(httpClientMock.post).mockResolvedValueOnce({
						data: { client_id: 'registered-client-id', client_secret: 'registered-secret' },
					});

					await (service as any).performDynamicClientRegistration(
						oauthCredentials,
						'https://auth.example.com',
						toUpdate,
					);

					expect(oauthCredentials.grantType).toBe('clientCredentials');
					expect(oauthCredentials.authentication).toBe(authentication);
					expect(toUpdate).toEqual(
						expect.objectContaining({
							grantType: 'clientCredentials',
							authentication,
							clientId: 'registered-client-id',
							clientSecret: 'registered-secret',
						}),
					);
					expect(httpClientMock.post).toHaveBeenCalledWith(
						'https://auth.example.com/oauth2/register',
						expect.objectContaining({
							grant_types: ['client_credentials'],
							token_endpoint_auth_method: authMethod,
						}),
					);
				},
			);

			it('should default client credentials flow to header authentication when the server omits token_endpoint_auth_methods_supported', async () => {
				const oauthCredentials = makeDcrCredentials();
				const toUpdate = {};

				const metadata = makeMetadata({ grant_types_supported: ['client_credentials'] });
				delete (metadata as Record<string, unknown>).token_endpoint_auth_methods_supported;
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({ data: metadata });
				vi.mocked(httpClientMock.post).mockResolvedValueOnce({
					data: { client_id: 'registered-client-id', client_secret: 'registered-secret' },
				});

				await (service as any).performDynamicClientRegistration(
					oauthCredentials,
					'https://auth.example.com',
					toUpdate,
				);

				expect(oauthCredentials.grantType).toBe('clientCredentials');
				expect(oauthCredentials.authentication).toBe('header');
				expect(toUpdate).toEqual(
					expect.objectContaining({
						grantType: 'clientCredentials',
						authentication: 'header',
						clientId: 'registered-client-id',
						clientSecret: 'registered-secret',
					}),
				);
				expect(httpClientMock.post).toHaveBeenCalledWith(
					'https://auth.example.com/oauth2/register',
					expect.objectContaining({
						grant_types: ['client_credentials'],
						token_endpoint_auth_method: 'client_secret_basic',
					}),
				);
			});

			it('should default authorization code flow to header authentication when the server omits token_endpoint_auth_methods_supported', async () => {
				const oauthCredentials = makeDcrCredentials();
				const toUpdate = {};

				const metadata = makeMetadata({ grant_types_supported: ['authorization_code'] });
				delete (metadata as Record<string, unknown>).token_endpoint_auth_methods_supported;
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({ data: metadata });
				vi.mocked(httpClientMock.post).mockResolvedValueOnce({
					data: { client_id: 'registered-client-id', client_secret: 'registered-secret' },
				});

				await (service as any).performDynamicClientRegistration(
					oauthCredentials,
					'https://auth.example.com',
					toUpdate,
				);

				expect(oauthCredentials.grantType).toBe('authorizationCode');
				expect(oauthCredentials.authentication).toBe('header');
				expect(httpClientMock.post).toHaveBeenCalledWith(
					'https://auth.example.com/oauth2/register',
					expect.objectContaining({
						grant_types: ['authorization_code', 'refresh_token'],
						token_endpoint_auth_method: 'client_secret_basic',
					}),
				);
			});

			it('should throw when metadata does not advertise a supported grant/authentication combination', async () => {
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: makeMetadata({
						grant_types_supported: ['implicit'],
						token_endpoint_auth_methods_supported: ['none'],
					}),
				});

				await expect(
					(service as any).performDynamicClientRegistration(
						makeDcrCredentials(),
						'https://auth.example.com',
						{},
					),
				).rejects.toThrow('No supported grant type and authentication method found');
				expect(httpClientMock.post).not.toHaveBeenCalled();
			});

			describe('token_endpoint_auth_method negotiation with S256 support', () => {
				it.each([
					['body', 'client_secret_post'],
					['header', 'client_secret_basic'],
				] as const)(
					'should register %s authentication when the server advertises S256 but only %s',
					async (authentication, authMethod) => {
						const oauthCredentials = makeDcrCredentials();
						const toUpdate = {};

						vi.mocked(httpClientMock.get).mockResolvedValueOnce({
							data: makeMetadata({
								grant_types_supported: ['authorization_code'],
								token_endpoint_auth_methods_supported: [authMethod],
								code_challenge_methods_supported: ['S256'],
							}),
						});
						vi.mocked(httpClientMock.post).mockResolvedValueOnce({
							data: { client_id: 'registered-client-id', client_secret: 'registered-secret' },
						});

						await (service as any).performDynamicClientRegistration(
							oauthCredentials,
							'https://auth.example.com',
							toUpdate,
						);

						expect(oauthCredentials.grantType).toBe('authorizationCode');
						expect(oauthCredentials.authentication).toBe(authentication);
						expect(toUpdate).toEqual(
							expect.objectContaining({
								grantType: 'authorizationCode',
								authentication,
								clientId: 'registered-client-id',
								clientSecret: 'registered-secret',
							}),
						);
						expect(httpClientMock.post).toHaveBeenCalledWith(
							'https://auth.example.com/oauth2/register',
							expect.objectContaining({
								grant_types: ['authorization_code', 'refresh_token'],
								token_endpoint_auth_method: authMethod,
							}),
						);
					},
				);

				it('should register PKCE when the server supports both S256 and the none auth method', async () => {
					const oauthCredentials = makeDcrCredentials();
					const toUpdate = {};

					vi.mocked(httpClientMock.get).mockResolvedValueOnce({
						data: makeMetadata({
							grant_types_supported: ['authorization_code'],
							token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
							code_challenge_methods_supported: ['S256'],
						}),
					});
					vi.mocked(httpClientMock.post).mockResolvedValueOnce({
						data: { client_id: 'registered-client-id' },
					});

					await (service as any).performDynamicClientRegistration(
						oauthCredentials,
						'https://auth.example.com',
						toUpdate,
					);

					expect(oauthCredentials.grantType).toBe('pkce');
					expect(httpClientMock.post).toHaveBeenCalledWith(
						'https://auth.example.com/oauth2/register',
						expect.objectContaining({
							grant_types: ['authorization_code', 'refresh_token'],
							token_endpoint_auth_method: 'none',
						}),
					);
				});

				it('should register PKCE when the server supports S256 and omits token_endpoint_auth_methods_supported', async () => {
					const oauthCredentials = makeDcrCredentials();
					const toUpdate = {};

					const metadata = makeMetadata({
						grant_types_supported: ['authorization_code'],
						code_challenge_methods_supported: ['S256'],
					});
					delete (metadata as Record<string, unknown>).token_endpoint_auth_methods_supported;
					vi.mocked(httpClientMock.get).mockResolvedValueOnce({ data: metadata });
					vi.mocked(httpClientMock.post).mockResolvedValueOnce({
						data: { client_id: 'registered-client-id' },
					});

					await (service as any).performDynamicClientRegistration(
						oauthCredentials,
						'https://auth.example.com',
						toUpdate,
					);

					expect(oauthCredentials.grantType).toBe('pkce');
					expect(httpClientMock.post).toHaveBeenCalledWith(
						'https://auth.example.com/oauth2/register',
						expect.objectContaining({
							token_endpoint_auth_method: 'none',
						}),
					);
				});

				it('should fall back to PKCE when the server supports S256 but only advertises unrecognized auth methods', async () => {
					const oauthCredentials = makeDcrCredentials();
					const toUpdate = {};

					vi.mocked(httpClientMock.get).mockResolvedValueOnce({
						data: makeMetadata({
							grant_types_supported: ['authorization_code'],
							token_endpoint_auth_methods_supported: ['private_key_jwt'],
							code_challenge_methods_supported: ['S256'],
						}),
					});
					vi.mocked(httpClientMock.post).mockResolvedValueOnce({
						data: { client_id: 'registered-client-id' },
					});

					await (service as any).performDynamicClientRegistration(
						oauthCredentials,
						'https://auth.example.com',
						toUpdate,
					);

					expect(oauthCredentials.grantType).toBe('pkce');
					expect(httpClientMock.post).toHaveBeenCalledWith(
						'https://auth.example.com/oauth2/register',
						expect.objectContaining({
							grant_types: ['authorization_code', 'refresh_token'],
							token_endpoint_auth_method: 'none',
						}),
					);
				});
			});
		});

		describe('InvalidTargetError', () => {
			it('should expose OAuth invalid_target response metadata', () => {
				const error = new InvalidTargetError('Invalid resource');

				expect(error.name).toBe('InvalidTargetError');
				expect(error.errorCode).toBe(400);
				expect(error.httpStatusCode).toBe(400);
			});
		});

		describe('discoverProtectedResourceMetadata', () => {
			it('should return normalized resource from protected resource metadata', async () => {
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: {
						authorization_servers: ['https://auth.example.com'],
						resource: 'https://mcp.example.com/mcp///',
					},
				});

				const result = await (service as any).discoverProtectedResourceMetadata(
					'https://mcp.example.com/mcp',
				);

				expect(result).toEqual({
					authorization_servers: ['https://auth.example.com'],
					resource: 'https://mcp.example.com/mcp',
				});
			});

			it('should return undefined resource when metadata omits resource', async () => {
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: {
						authorization_servers: ['https://auth.example.com'],
					},
				});

				const result = await (service as any).discoverProtectedResourceMetadata(
					'https://mcp.example.com',
				);

				expect(result).toEqual({
					authorization_servers: ['https://auth.example.com'],
				});
				expect(result.resource).toBeUndefined();
			});

			it('should keep all advertised authorization servers while callers use the first one', async () => {
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: {
						authorization_servers: ['https://auth1.example.com', 'https://auth2.example.com'],
						resource: 'https://mcp.example.com',
					},
				});

				const result = await (service as any).discoverProtectedResourceMetadata(
					'https://mcp.example.com',
				);

				expect(result.authorization_servers).toEqual([
					'https://auth1.example.com',
					'https://auth2.example.com',
				]);
				expect(result.resource).toBe('https://mcp.example.com');
			});

			it('should throw when protected resource discovery fails for every candidate URL', async () => {
				vi.mocked(httpClientMock.get).mockRejectedValue(new Error('network unavailable'));

				await expect(
					(service as any).discoverProtectedResourceMetadata('https://mcp.example.com/mcp'),
				).rejects.toThrow('Failed to discover protected resource metadata');
			});

			it('should throw when authorization_servers is empty (regression guard)', async () => {
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: {
						authorization_servers: [],
						resource: 'https://mcp.example.com',
					},
				});

				await expect(
					(service as any).discoverProtectedResourceMetadata('https://mcp.example.com'),
				).rejects.toThrow('Failed to discover protected resource metadata');
			});
		});

		describe('outbound request mapping and SSRF (factory migration)', () => {
			it('maps protected-resource discovery to a GET with JSON and full response', async () => {
				httpClientMock.get.mockResolvedValueOnce({
					data: { authorization_servers: ['https://auth.example.com'] },
				});

				await (service as any).discoverProtectedResourceMetadata('https://mcp.example.com');

				expect(requestMock).toHaveBeenCalledWith(
					expect.objectContaining({
						url: 'https://mcp.example.com/.well-known/oauth-protected-resource',
						method: 'GET',
						json: true,
						returnFullResponse: true,
					}),
				);
			});

			it('maps dynamic client registration to a POST carrying a JSON body', async () => {
				httpClientMock.get.mockResolvedValueOnce({
					data: {
						authorization_endpoint: 'https://as.example.com/authorize',
						token_endpoint: 'https://as.example.com/token',
						registration_endpoint: 'https://as.example.com/register',
						grant_types_supported: ['authorization_code'],
						token_endpoint_auth_methods_supported: ['client_secret_basic'],
					},
				});
				httpClientMock.post.mockResolvedValueOnce({
					data: { client_id: 'cid', client_secret: 'secret' },
				});

				const oauthCredentials = { serverUrl: 'https://as.example.com' } as OAuth2CredentialData;
				await (service as any).performDynamicClientRegistration(
					oauthCredentials,
					'https://as.example.com',
					{},
				);

				expect(requestMock).toHaveBeenCalledWith(
					expect.objectContaining({
						url: 'https://as.example.com/register',
						method: 'POST',
						json: true,
						body: expect.objectContaining({ client_name: 'n8n' }),
					}),
				);
			});

			it('skips a discovery response whose status is not 200 and tries the next URL', async () => {
				// First candidate resolves with a non-200 (no rejection); the strict
				// statusCode === 200 check must reject it and fall through.
				requestMock.mockResolvedValueOnce({ statusCode: 204, body: {}, headers: {} });
				httpClientMock.get.mockResolvedValueOnce({
					data: { authorization_servers: ['https://auth.example.com'] },
				});

				const result = await (service as any).discoverProtectedResourceMetadata(
					'https://mcp.example.com/mcp',
				);

				expect(result.authorization_servers).toEqual(['https://auth.example.com']);
			});

			it('surfaces an SSRF-blocked discovery target as the normal "Failed to discover" path', async () => {
				httpClientMock.get.mockRejectedValue(
					new Error('Blocked by SSRF protection: 169.254.169.254'),
				);

				const promise = (service as any).discoverProtectedResourceMetadata(
					'https://mcp.example.com',
				);

				await expect(promise).rejects.toThrow(BadRequestError);
				await expect(promise).rejects.toThrow('Failed to discover protected resource metadata');
				// The raw SSRF error detail must not leak to the caller.
				await expect(promise).rejects.not.toThrow('169.254.169.254');
			});
		});

		describe('validateResourceUrlOrThrow', () => {
			it('should normalize valid resource URLs before returning them', () => {
				expect(
					(service as any).validateResourceUrlOrThrow(' https://mcp.example.com/mcp/// '),
				).toBe('https://mcp.example.com/mcp');
			});

			it('should reject malformed resource URLs with a generic invalid_target error', () => {
				expect(() => (service as any).validateResourceUrlOrThrow('not-a-url')).toThrow(
					InvalidTargetError,
				);
				expect(() => (service as any).validateResourceUrlOrThrow('not-a-url')).toThrow(
					'Invalid resource URL format.',
				);
			});

			it('should reject resource URLs blocked by OAuth URL validation', () => {
				expect(() => (service as any).validateResourceUrlOrThrow('ftp://127.0.0.1/mcp')).toThrow(
					InvalidTargetError,
				);
			});
		});

		describe('resolveResourceUrl', () => {
			it('should use discovered resource when no resource URL is supplied', () => {
				expect(
					(service as any).resolveResourceUrl(
						undefined,
						'https://mcp.example.com/mcp',
						'https://mcp.example.com/mcp',
					),
				).toBe('https://mcp.example.com/mcp');
			});

			it('should return undefined when neither supplied nor discovered resource is available', () => {
				expect(
					(service as any).resolveResourceUrl(undefined, undefined, 'https://mcp.example.com/mcp'),
				).toBeUndefined();
			});

			it('should accept supplied resource when it matches the discovered resource', () => {
				expect(
					(service as any).resolveResourceUrl(
						'https://mcp.example.com/mcp',
						'https://mcp.example.com/mcp',
						'https://mcp.example.com/mcp',
					),
				).toBe('https://mcp.example.com/mcp');
			});

			it('should reject supplied resource when it does not match the discovered resource', () => {
				expect(() =>
					(service as any).resolveResourceUrl(
						'https://mcp.example.com/other',
						'https://mcp.example.com/mcp',
						'https://mcp.example.com/mcp',
					),
				).toThrow(InvalidTargetError);
			});

			it('should accept supplied resource with matching origin when discovery has no resource', () => {
				expect(
					(service as any).resolveResourceUrl(
						'https://mcp.example.com/resource',
						undefined,
						'https://mcp.example.com/mcp',
					),
				).toBe('https://mcp.example.com/resource');
			});

			it('should reject supplied resource with mismatched origin when discovery has no resource', () => {
				expect(() =>
					(service as any).resolveResourceUrl(
						'https://other.example.com/resource',
						undefined,
						'https://mcp.example.com/mcp',
					),
				).toThrow('Resource URL origin must match the server URL origin.');
			});
		});

		describe('generateAOauth2AuthUri', () => {
			beforeEach(async () => {
				await mockClientOAuth2UriFromOptions();
				vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);
			});

			it('should include discovered resource in the authorize URL and CSRF state', async () => {
				vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(makeDcrCredentials());
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: {
						authorization_servers: ['https://auth.example.com'],
						resource: 'https://mcp.example.com/mcp///',
					},
				});
				mockSuccessfulAuthorizationServerDiscovery();

				const authUri = await service.generateAOauth2AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				});

				const url = new URL(authUri);
				expect(url.searchParams.get('resource')).toBe('https://mcp.example.com/mcp');
				// The resolved resource is stashed in the per-flow cache payload, not the URL state.
				expect(cacheService.set).toHaveBeenLastCalledWith(
					expect.any(String),
					expect.objectContaining({
						stateData: expect.objectContaining({ resource: 'https://mcp.example.com/mcp' }),
					}),
					expect.any(Number),
				);
			});

			it('should omit resource when discovery and credential input do not provide one', async () => {
				vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(makeDcrCredentials());
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: {
						authorization_servers: ['https://auth.example.com'],
					},
				});
				mockSuccessfulAuthorizationServerDiscovery();

				const authUri = await service.generateAOauth2AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				});

				expect(new URL(authUri).searchParams.has('resource')).toBe(false);
				const storedFlowState = vi.mocked(cacheService.set).mock.lastCall?.[1] as {
					stateData: Record<string, unknown>;
				};
				expect(storedFlowState.stateData.resource).toBeUndefined();
			});

			it('should include normalized user-supplied resource URL when it matches discovery', async () => {
				vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(
					makeDcrCredentials({
						resourceUrl: 'https://mcp.example.com/mcp///',
					} as Partial<OAuth2CredentialData>),
				);
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: {
						authorization_servers: ['https://auth.example.com'],
						resource: 'https://mcp.example.com/mcp',
					},
				});
				mockSuccessfulAuthorizationServerDiscovery();

				const authUri = await service.generateAOauth2AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				});

				expect(new URL(authUri).searchParams.get('resource')).toBe('https://mcp.example.com/mcp');
			});

			it('should reject user-supplied resource URL that differs from discovered resource', async () => {
				vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(
					makeDcrCredentials({
						resourceUrl: 'https://mcp.example.com/other',
					} as Partial<OAuth2CredentialData>),
				);
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: {
						authorization_servers: ['https://auth.example.com'],
						resource: 'https://mcp.example.com/mcp',
					},
				});

				await expect(
					service.generateAOauth2AuthUri(credential, {
						cid: credential.id,
						origin: 'static-credential',
						userId: 'user-id',
					}),
				).rejects.toThrow(InvalidTargetError);
			});

			it('should reject malformed user-supplied resource URL before generating authorize URL', async () => {
				vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(
					makeDcrCredentials({
						resourceUrl: 'not-a-url',
					} as Partial<OAuth2CredentialData>),
				);

				await expect(
					service.generateAOauth2AuthUri(credential, {
						cid: credential.id,
						origin: 'static-credential',
						userId: 'user-id',
					}),
				).rejects.toThrow('Invalid resource URL format.');
			});

			it('should use resourceUrl for static credentials (useDynamicClientRegistration: false)', async () => {
				vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(
					makeDcrCredentials({
						clientId: 'client-id',
						clientSecret: 'client-secret',
						authUrl: 'https://auth.example.com/oauth2/auth',
						accessTokenUrl: 'https://auth.example.com/oauth2/token',
						useDynamicClientRegistration: false,
						resourceUrl: 'https://mcp.example.com/mcp///',
					} as Partial<OAuth2CredentialData>),
				);
				vi.mocked(httpClientMock.get).mockRejectedValue(new Error('discovery unavailable'));

				const authUri = await service.generateAOauth2AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				});

				const url = new URL(authUri);
				expect(url.origin + url.pathname).toBe('https://auth.example.com/oauth2/auth');
				expect(url.searchParams.get('resource')).toBe('https://mcp.example.com/mcp');
				expect(cacheService.set).toHaveBeenLastCalledWith(
					expect.any(String),
					expect.objectContaining({
						stateData: expect.objectContaining({ resource: 'https://mcp.example.com/mcp' }),
					}),
					expect.any(Number),
				);
			});
		});

		describe('scope discovery from protected-resource metadata', () => {
			// Real-world shape captured from the Atlassian remote MCP server: the
			// protected-resource document (RFC 9728) advertises the scopes, while the
			// authorization-server metadata (RFC 8414) omits scopes_supported entirely.
			const ATLASSIAN_SERVER_URL = 'https://mcp.atlassian.com/v1/mcp/authv2';
			const ATLASSIAN_AUTH_SERVER = 'https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3';
			const RESOURCE_SCOPES = ['read:jira-work', 'search:confluence', 'offline_access'];

			const mockProtectedResourceDiscovery = (scopes?: string[]) => {
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: {
						resource: ATLASSIAN_SERVER_URL,
						authorization_servers: [ATLASSIAN_AUTH_SERVER],
						...(scopes ? { scopes_supported: scopes } : {}),
					},
				});
			};

			// Authorization-server metadata WITHOUT scopes_supported and WITHOUT
			// token_endpoint_auth_methods_supported, advertising S256 (→ PKCE).
			const mockAuthServerWithoutScopes = () => {
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: {
						issuer: 'https://auth.atlassian.com',
						authorization_endpoint: 'https://auth.atlassian.com/authorize',
						token_endpoint: 'https://auth.atlassian.com/oauth/token',
						registration_endpoint: 'https://auth.atlassian.com/dcr/register',
						grant_types_supported: ['authorization_code', 'refresh_token'],
						code_challenge_methods_supported: ['S256'],
					},
				});
				vi.mocked(httpClientMock.post).mockResolvedValueOnce({
					data: { client_id: 'registered-client-id' },
				});
			};

			const runAtlassianFlow = async (credentialOverrides: Partial<OAuth2CredentialData> = {}) => {
				const { ClientOAuth2 } = await import('@n8n/client-oauth2');
				const pkceChallenge = await import('pkce-challenge');
				vi.mocked(pkceChallenge.default).mockResolvedValue({
					code_verifier: 'code_verifier',
					code_challenge: 'code_challenge',
				});
				await mockClientOAuth2UriFromOptions();
				vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);
				vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(
					// Under DCR the `scope` field is hidden and defaults to '' — the user
					// cannot supply scopes, so the flow depends entirely on discovery.
					makeDcrCredentials({
						serverUrl: ATLASSIAN_SERVER_URL,
						scope: '',
						...credentialOverrides,
					}),
				);

				await service.generateAOauth2AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				});

				const registerPayload = httpClientMock.post.mock.calls[0][1];
				const clientOptions = vi.mocked(ClientOAuth2).mock.calls[0][0];
				const persisted = (service.encryptAndSaveData as Mock).mock.calls[0][1];
				return { registerPayload, clientOptions, persisted };
			};

			it('requests protected-resource scopes when the auth server omits scopes_supported', async () => {
				mockProtectedResourceDiscovery(RESOURCE_SCOPES);
				mockAuthServerWithoutScopes();

				const { registerPayload, clientOptions, persisted } = await runAtlassianFlow();

				// The auth server advertises S256 and omits token_endpoint_auth_methods_supported,
				// so the public-client PKCE grant is selected.
				expect(persisted.grantType).toBe('pkce');
				// The scopes advertised by the protected resource are registered and requested.
				expect(registerPayload.scope).toBe(RESOURCE_SCOPES.join(' '));
				expect(persisted.scope).toBe(RESOURCE_SCOPES.join(' '));
				// The authorize request carries the discovered scopes (space-delimited).
				expect(clientOptions.scopes?.join(clientOptions.scopesSeparator)).toBe(
					RESOURCE_SCOPES.join(' '),
				);
			});

			it('falls back to authorization-server scopes when the protected resource omits them', async () => {
				mockProtectedResourceDiscovery(); // no scopes_supported on the resource
				vi.mocked(httpClientMock.get).mockResolvedValueOnce({
					data: {
						issuer: 'https://auth.atlassian.com',
						authorization_endpoint: 'https://auth.atlassian.com/authorize',
						token_endpoint: 'https://auth.atlassian.com/oauth/token',
						registration_endpoint: 'https://auth.atlassian.com/dcr/register',
						grant_types_supported: ['authorization_code', 'refresh_token'],
						token_endpoint_auth_methods_supported: ['client_secret_basic'],
						scopes_supported: ['openid', 'profile'],
					},
				});
				vi.mocked(httpClientMock.post).mockResolvedValueOnce({
					data: { client_id: 'registered-client-id', client_secret: 'registered-client-secret' },
				});

				const { registerPayload, persisted } = await runAtlassianFlow();

				expect(registerPayload.scope).toBe('openid profile');
				expect(persisted.scope).toBe('openid profile');
			});
		});

		describe('convertCredentialToOptions', () => {
			it('should include resource when credential has resource set', () => {
				const options = (service as any).convertCredentialToOptions({
					clientId: 'client-id',
					clientSecret: 'client-secret',
					authUrl: 'https://auth.example.com/oauth2/auth',
					accessTokenUrl: 'https://auth.example.com/oauth2/token',
					resource: 'https://mcp.example.com/mcp',
				});

				expect(options).toEqual(
					expect.objectContaining({ resource: 'https://mcp.example.com/mcp' }),
				);
			});

			it('should not emit a concrete resource value when credential has no resource', () => {
				const options = (service as any).convertCredentialToOptions({
					clientId: 'client-id',
					clientSecret: 'client-secret',
					authUrl: 'https://auth.example.com/oauth2/auth',
					accessTokenUrl: 'https://auth.example.com/oauth2/token',
				});

				expect(options.resource).toBeUndefined();
			});
		});
	});

	describe('generateAOauth1AuthUri', () => {
		it('should generate auth URI for OAuth1 credential', async () => {
			const credential = mock<CredentialsEntity>({ id: '1', type: 'twitterOAuth1Api' });
			const oauthCredentials: OAuth1CredentialData = {
				consumerKey: 'consumer_key',
				consumerSecret: 'consumer_secret',
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				authUrl: 'https://example.domain/oauth/authorize',
				accessTokenUrl: 'https://example.domain/oauth/access_token',
				signatureMethod: 'HMAC-SHA1',
			};

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.mocked(httpClientMock.request).mockResolvedValue({
				data: 'oauth_token=random-token&oauth_token_secret=random-secret',
			});
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const authUri = await service.generateAOauth1AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(authUri).toContain('https://example.domain/oauth/authorize?oauth_token=random-token');
			// Neither csrfSecret nor the request-token secret may be persisted to the
			// credential — both live in the per-flow cache entry.
			expect(service.encryptAndSaveData).not.toHaveBeenCalled();
			expect(cacheService.set).toHaveBeenCalledWith(
				expect.stringMatching(/^oauth:flow:/),
				expect.objectContaining({
					csrfSecret: expect.any(String),
					oauthTokenSecret: 'random-secret',
				}),
				expect.any(Number),
			);
			expect(externalHooks.run).toHaveBeenCalledWith('oauth1.authenticate', expect.any(Array));
		});

		it('should reject javascript: protocol in OAuth1 URL (XSS)', async () => {
			const credential = mock<CredentialsEntity>({ id: '1', type: 'twitterOAuth1Api' });
			const oauthCredentials: OAuth1CredentialData = {
				consumerKey: 'consumer_key',
				consumerSecret: 'consumer_secret',
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				authUrl: "javascript:alert('Hacked')//",
				accessTokenUrl: 'https://example.domain/oauth/access_token',
				signatureMethod: 'HMAC-SHA1',
			};

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);

			const promise = service.generateAOauth1AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow(/OAuth url must use HTTP or HTTPS protocol/);
		});

		it('should generate auth URI with different signature methods', async () => {
			const credential = mock<CredentialsEntity>({ id: '1', type: 'twitterOAuth1Api' });
			const oauthCredentials: OAuth1CredentialData = {
				consumerKey: 'consumer_key',
				consumerSecret: 'consumer_secret',
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				authUrl: 'https://example.domain/oauth/authorize',
				accessTokenUrl: 'https://example.domain/oauth/access_token',
				signatureMethod: 'HMAC-SHA256',
			};

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.mocked(httpClientMock.request).mockResolvedValue({
				data: 'oauth_token=random-token&oauth_token_secret=random-secret',
			});
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const authUri = await service.generateAOauth1AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			expect(authUri).toContain('https://example.domain/oauth/authorize?oauth_token=random-token');
			expect(service.encryptAndSaveData).not.toHaveBeenCalled();
			expect(cacheService.set).toHaveBeenCalledWith(
				expect.stringMatching(/^oauth:flow:/),
				expect.objectContaining({ csrfSecret: expect.any(String) }),
				expect.any(Number),
			);
		});

		it('should handle request token URL errors', async () => {
			const credential = mock<CredentialsEntity>({ id: '1', type: 'twitterOAuth1Api' });
			const oauthCredentials: OAuth1CredentialData = {
				consumerKey: 'consumer_key',
				consumerSecret: 'consumer_secret',
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				authUrl: 'https://example.domain/oauth/authorize',
				accessTokenUrl: 'https://example.domain/oauth/access_token',
				signatureMethod: 'HMAC-SHA1',
			};

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.mocked(httpClientMock.request).mockRejectedValue(new Error('Request token failed'));

			await expect(
				service.generateAOauth1AuthUri(credential, {
					cid: credential.id,
					origin: 'static-credential',
					userId: 'user-id',
				}),
			).rejects.toThrow('Request token failed');
		});

		it('should preserve pre-existing query params on the authorization URL', async () => {
			const credential = mock<CredentialsEntity>({ id: '1', type: 'trelloOAuth1Api' });
			const oauthCredentials: OAuth1CredentialData = {
				consumerKey: 'consumer_key',
				consumerSecret: 'consumer_secret',
				requestTokenUrl: 'https://trello.com/1/OAuthGetRequestToken',
				authUrl:
					'https://trello.com/1/OAuthAuthorizeToken?scope=read,write,account&expiration=never&name=n8n',
				accessTokenUrl: 'https://trello.com/1/OAuthGetAccessToken',
				signatureMethod: 'HMAC-SHA1',
			};

			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue(oauthCredentials);
			vi.mocked(httpClientMock.request).mockResolvedValue({
				data: 'oauth_token=random-token&oauth_token_secret=random-secret',
			});
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const authUri = await service.generateAOauth1AuthUri(credential, {
				cid: credential.id,
				origin: 'static-credential',
				userId: 'user-id',
			});

			const parsed = new URL(authUri);
			expect(parsed.searchParams.get('scope')).toBe('read,write,account');
			expect(parsed.searchParams.get('expiration')).toBe('never');
			expect(parsed.searchParams.get('name')).toBe('n8n');
			expect(parsed.searchParams.get('oauth_token')).toBe('random-token');
		});
	});

	describe('getOAuth1AccessToken', () => {
		const oauthCredentials: OAuth1CredentialData = {
			consumerKey: 'consumer_key',
			consumerSecret: 'consumer_secret',
			requestTokenUrl: 'https://trello.com/1/OAuthGetRequestToken',
			authUrl: 'https://trello.com/1/OAuthAuthorizeToken',
			accessTokenUrl: 'https://trello.com/1/OAuthGetAccessToken',
			signatureMethod: 'HMAC-SHA1',
		};

		it('should send a signed request to the access token endpoint and parse the response', async () => {
			vi.mocked(httpClientMock.request).mockResolvedValue({
				data: 'oauth_token=access-token&oauth_token_secret=access-secret',
			});

			const result = await service.getOAuth1AccessToken(oauthCredentials, {
				oauthToken: 'request-token',
				oauthVerifier: 'verifier',
				oauthTokenSecret: 'request-secret',
			});

			expect(result).toEqual({
				oauth_token: 'access-token',
				oauth_token_secret: 'access-secret',
			});

			const requestConfig = vi.mocked(httpClientMock.request).mock.calls.at(-1)?.[0];
			expect(requestConfig.method).toBe('POST');
			expect(requestConfig.url).toBe('https://trello.com/1/OAuthGetAccessToken');
			// The request must carry an OAuth1 signature and the request token in the
			// Authorization header.
			expect(requestConfig.headers.Authorization).toMatch(/^OAuth /);
			expect(requestConfig.headers.Authorization).toContain('oauth_signature');
			expect(requestConfig.headers.Authorization).toContain('oauth_token');
			// The verifier travels in the form-encoded body.
			expect(requestConfig.headers['content-type']).toBe('application/x-www-form-urlencoded');
			expect(requestConfig.body).toBe('oauth_verifier=verifier');
			// OAuth1 responses are form-urlencoded strings, so the raw text body is
			// requested and JSON parsing is never enabled.
			expect(requestConfig.encoding).toBe('text');
			expect(requestConfig.json).toBeUndefined();
		});

		it('should throw when the access token endpoint returns a non-string response', async () => {
			vi.mocked(httpClientMock.request).mockResolvedValue({ data: { not: 'a string' } });

			await expect(
				service.getOAuth1AccessToken(oauthCredentials, {
					oauthToken: 'request-token',
					oauthVerifier: 'verifier',
					oauthTokenSecret: 'request-secret',
				}),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('extractAccountIdentifier', () => {
		it('returns email from direct token field', () => {
			expect(
				OauthService.extractAccountIdentifier({ email: 'user@example.com', access_token: 'tok' }),
			).toBe('user@example.com');
		});

		it('returns login from direct token field (GitHub-style)', () => {
			expect(OauthService.extractAccountIdentifier({ login: 'octocat', access_token: 'tok' })).toBe(
				'octocat',
			);
		});

		it('extracts email from JWT id_token', () => {
			const payload = { email: 'user@gmail.com', sub: '123' };
			const idToken = `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
			expect(OauthService.extractAccountIdentifier({ id_token: idToken })).toBe('user@gmail.com');
		});

		it('extracts preferred_username from JWT id_token when no email', () => {
			const payload = { preferred_username: 'admin@contoso.com', sub: '123' };
			const idToken = `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
			expect(OauthService.extractAccountIdentifier({ id_token: idToken })).toBe(
				'admin@contoso.com',
			);
		});

		it('returns undefined for token data without identifiers', () => {
			expect(
				OauthService.extractAccountIdentifier({ access_token: 'tok', refresh_token: 'ref' }),
			).toBeUndefined();
		});

		it('handles malformed JWT gracefully', () => {
			expect(OauthService.extractAccountIdentifier({ id_token: 'not.a.jwt' })).toBeUndefined();
		});

		it('prefers direct fields over id_token', () => {
			const payload = { email: 'jwt@example.com' };
			const idToken = `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;
			expect(
				OauthService.extractAccountIdentifier({ email: 'direct@example.com', id_token: idToken }),
			).toBe('direct@example.com');
		});
	});

	describe('refreshOAuth2CredentialById', () => {
		const credentialId = 'cred-123';
		const projectId = 'proj-456';

		function makeCredential(
			overrides: Partial<ICredentialsDb> = {},
		): ICredentialsDb & { isGlobal: boolean } {
			return {
				id: credentialId,
				isGlobal: false,
				shared: [],
				...overrides,
			} as unknown as ICredentialsDb & { isGlobal: boolean };
		}

		it('returns null when the credential is not found', async () => {
			credentialsRepository.findOne.mockResolvedValue(null);

			const result = await service.refreshOAuth2CredentialById(credentialId, projectId);

			expect(result).toBeNull();
		});

		it('returns null when the credential is not accessible to the given project', async () => {
			const credential = makeCredential({
				isGlobal: false,
				shared: [{ projectId: 'other-project' }] as never,
			});
			credentialsRepository.findOne.mockResolvedValue(credential as never);

			const result = await service.refreshOAuth2CredentialById(credentialId, projectId);

			expect(result).toBeNull();
		});

		it('grants access when the credential is global regardless of project', async () => {
			const credential = makeCredential({ isGlobal: true, shared: [] });
			credentialsRepository.findOne.mockResolvedValue(credential as never);
			// Returns null because there's no oauthTokenData — but the access check passed
			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue({
				clientId: 'id',
				clientSecret: 'secret',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				authentication: 'header',
			} as unknown as OAuth2CredentialData);

			const result = await service.refreshOAuth2CredentialById(credentialId, projectId);

			// Null because oauthTokenData is missing — not because of an access denial
			expect(result).toBeNull();
			expect(service.getOAuthCredentials).toHaveBeenCalled();
		});

		it('grants access when the project is a shared member', async () => {
			const credential = makeCredential({
				isGlobal: false,
				shared: [{ projectId }] as never,
			});
			credentialsRepository.findOne.mockResolvedValue(credential as never);
			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue({
				clientId: 'id',
				clientSecret: 'secret',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				authentication: 'header',
			} as unknown as OAuth2CredentialData);

			const result = await service.refreshOAuth2CredentialById(credentialId, projectId);

			// Access was granted — null because there's no oauthTokenData
			expect(result).toBeNull();
			expect(service.getOAuthCredentials).toHaveBeenCalled();
		});

		it('returns null when the credential has no stored oauthTokenData', async () => {
			credentialsRepository.findOne.mockResolvedValue(makeCredential({ isGlobal: true }) as never);
			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue({
				clientId: 'id',
				clientSecret: 'secret',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				authentication: 'header',
				// oauthTokenData intentionally absent
			} as unknown as OAuth2CredentialData);

			const result = await service.refreshOAuth2CredentialById(credentialId, projectId);

			expect(result).toBeNull();
		});

		it('refreshes the token with token.refresh() for authorizationCode grant and returns a Bearer header', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const refreshed = {
				data: { access_token: 'new-token', token_type: 'bearer' },
				accessToken: 'new-token',
			};
			const mockToken = { refresh: vi.fn().mockResolvedValue(refreshed), client: {} };
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return { createToken: vi.fn().mockReturnValue(mockToken) } as never;
			});

			credentialsRepository.findOne.mockResolvedValue(makeCredential({ isGlobal: true }) as never);
			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue({
				clientId: 'id',
				clientSecret: 'secret',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				authentication: 'header',
				oauthTokenData: {
					access_token: 'stale',
					refresh_token: 'refresh-tok',
					token_type: 'bearer',
				},
			} as unknown as OAuth2CredentialData);
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const result = await service.refreshOAuth2CredentialById(credentialId, projectId);

			expect(result).toEqual({ Authorization: 'Bearer new-token' });
			expect(mockToken.refresh).toHaveBeenCalledTimes(1);
		});

		it('builds the client with a certificate when certificate authentication is selected', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			let capturedOptions: unknown;
			const refreshed = {
				data: { access_token: 'new-token', token_type: 'bearer' },
				accessToken: 'new-token',
			};
			const mockToken = { refresh: vi.fn().mockResolvedValue(refreshed), client: {} };
			vi.mocked(ClientOAuth2).mockImplementation(function (options) {
				capturedOptions = options;
				return { createToken: vi.fn().mockReturnValue(mockToken) } as never;
			});

			credentialsRepository.findOne.mockResolvedValue(makeCredential({ isGlobal: true }) as never);
			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue({
				clientId: 'id',
				clientCredentialType: 'certificate',
				privateKey: 'private-key-pem',
				certificate: 'certificate-pem',
				clientSecret: 'stale-secret',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				authentication: 'header',
				oauthTokenData: {
					access_token: 'stale',
					refresh_token: 'refresh-tok',
					token_type: 'bearer',
				},
			} as unknown as OAuth2CredentialData);
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const result = await service.refreshOAuth2CredentialById(credentialId, projectId);

			expect(result).toEqual({ Authorization: 'Bearer new-token' });
			expect(capturedOptions).toEqual(
				expect.objectContaining({
					clientCredentialType: 'certificate',
					clientCertificate: { privateKey: 'private-key-pem', certificate: 'certificate-pem' },
				}),
			);
			// The stale secret must not be carried into the client options in certificate mode.
			expect(capturedOptions).not.toHaveProperty('clientSecret', 'stale-secret');
		});

		it('persists the refreshed token data after a successful refresh', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const refreshedData = { access_token: 'new-token', token_type: 'bearer' };
			const refreshed = { data: refreshedData, accessToken: 'new-token' };
			const mockToken = { refresh: vi.fn().mockResolvedValue(refreshed), client: {} };
			const credential = makeCredential({ isGlobal: true });
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return { createToken: vi.fn().mockReturnValue(mockToken) } as never;
			});

			credentialsRepository.findOne.mockResolvedValue(credential as never);
			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue({
				clientId: 'id',
				clientSecret: 'secret',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				authentication: 'header',
				oauthTokenData: { access_token: 'stale', refresh_token: 'refresh-tok' },
			} as unknown as OAuth2CredentialData);
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			await service.refreshOAuth2CredentialById(credentialId, projectId);

			expect(service.encryptAndSaveData).toHaveBeenCalledWith(credential, {
				oauthTokenData: {
					refresh_token: 'refresh-tok',
					...refreshedData,
				},
			});
		});

		it('uses credentials.getToken() for clientCredentials grant type', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const refreshed = { data: { access_token: 'cc-token' }, accessToken: 'cc-token' };
			const getToken = vi.fn().mockResolvedValue(refreshed);
			const mockToken = { refresh: vi.fn(), client: { credentials: { getToken } } };
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return { createToken: vi.fn().mockReturnValue(mockToken) } as never;
			});

			credentialsRepository.findOne.mockResolvedValue(makeCredential({ isGlobal: true }) as never);
			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue({
				clientId: 'id',
				clientSecret: 'secret',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'clientCredentials',
				authentication: 'header',
				oauthTokenData: { access_token: 'stale' },
			} as unknown as OAuth2CredentialData);
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const result = await service.refreshOAuth2CredentialById(credentialId, projectId);

			expect(result).toEqual({ Authorization: 'Bearer cc-token' });
			expect(getToken).toHaveBeenCalledTimes(1);
			expect(mockToken.refresh).not.toHaveBeenCalled();
		});

		it('passes resource to token refresh and preserves it when the provider does not echo it', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const resource = 'https://mcp.example.com/mcp';
			const refreshed = { data: { access_token: 'cc-token' }, accessToken: 'cc-token' };
			const getToken = vi.fn().mockResolvedValue(refreshed);
			const mockToken = { refresh: vi.fn(), client: { credentials: { getToken } } };
			const credential = makeCredential({ isGlobal: true });
			let capturedOptions: unknown;
			vi.mocked(ClientOAuth2).mockImplementation(function (options) {
				capturedOptions = options;
				return { createToken: vi.fn().mockReturnValue(mockToken) } as never;
			});

			credentialsRepository.findOne.mockResolvedValue(credential as never);
			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue({
				clientId: 'id',
				clientSecret: 'secret',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'clientCredentials',
				authentication: 'header',
				oauthTokenData: { access_token: 'stale', resource },
			} as unknown as OAuth2CredentialData);
			vi.spyOn(service, 'encryptAndSaveData').mockResolvedValue(undefined);

			const result = await service.refreshOAuth2CredentialById(credentialId, projectId);

			expect(result).toEqual({ Authorization: 'Bearer cc-token' });
			expect(capturedOptions).toEqual(expect.objectContaining({ resource }));
			expect(service.encryptAndSaveData).toHaveBeenCalledWith(credential, {
				oauthTokenData: {
					access_token: 'cc-token',
					resource,
				},
			});
		});

		it('returns null and logs a warning when the refresh call throws', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockToken = {
				refresh: vi.fn().mockRejectedValue(new Error('network timeout')),
				client: {},
			};
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return { createToken: vi.fn().mockReturnValue(mockToken) } as never;
			});

			credentialsRepository.findOne.mockResolvedValue(makeCredential({ isGlobal: true }) as never);
			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue({
				clientId: 'id',
				clientSecret: 'secret',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				authentication: 'header',
				oauthTokenData: { access_token: 'stale', refresh_token: 'refresh-tok' },
			} as unknown as OAuth2CredentialData);

			const result = await service.refreshOAuth2CredentialById(credentialId, projectId);

			expect(result).toBeNull();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to refresh OAuth2 token for credential',
				expect.objectContaining({ credentialId, error: 'network timeout' }),
			);
		});

		it('still returns the auth header even when persisting the new token data fails', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const refreshed = { data: { access_token: 'new-token' }, accessToken: 'new-token' };
			const mockToken = { refresh: vi.fn().mockResolvedValue(refreshed), client: {} };
			vi.mocked(ClientOAuth2).mockImplementation(function () {
				return { createToken: vi.fn().mockReturnValue(mockToken) } as never;
			});

			credentialsRepository.findOne.mockResolvedValue(makeCredential({ isGlobal: true }) as never);
			vi.spyOn(service, 'getOAuthCredentials').mockResolvedValue({
				clientId: 'id',
				clientSecret: 'secret',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				authentication: 'header',
				oauthTokenData: { access_token: 'stale', refresh_token: 'refresh-tok' },
			} as unknown as OAuth2CredentialData);
			vi.spyOn(service, 'encryptAndSaveData').mockRejectedValue(new Error('db write error'));

			const result = await service.refreshOAuth2CredentialById(credentialId, projectId);

			expect(result).toEqual({ Authorization: 'Bearer new-token' });
			expect(logger.warn).toHaveBeenCalledWith(
				'Refreshed OAuth2 token but failed to persist new token data',
				expect.objectContaining({ credentialId }),
			);
		});
	});
});
