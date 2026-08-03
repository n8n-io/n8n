import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { type AuthenticatedRequest, type CredentialsEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { Cipher } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { EventService } from '@/events/event.service';
import type { DynamicCredentialResolver } from '@/modules/dynamic-credentials.ee/database/entities/credential-resolver';
import { DynamicCredentialResolverRepository } from '@/modules/dynamic-credentials.ee/database/repositories/credential-resolver.repository';
import { DynamicCredentialsController } from '@/modules/dynamic-credentials.ee/dynamic-credentials.controller';
import {
	AuthorizeIntentService,
	CredentialConnectionStatusService,
	DynamicCredentialResolverRegistry,
	DynamicCredentialService,
} from '@/modules/dynamic-credentials.ee/services';
import { OauthService } from '@/oauth/oauth.service';
import { UrlService } from '@/services/url.service';

import { DynamicCredentialWebService } from '../services/dynamic-credential-web.service';

vi.mock('axios');

vi.mock('../utils', () => ({
	getDynamicCredentialMiddlewares: vi.fn(() => undefined),
}));

describe('DynamicCredentialsController', () => {
	const enterpriseCredentialsService = mockInstance(EnterpriseCredentialsService);
	const oauthService = mockInstance(OauthService);
	const resolverRepository = mockInstance(DynamicCredentialResolverRepository);
	const resolverRegistry = mockInstance(DynamicCredentialResolverRegistry);
	const dynamicCredentialWebService = mockInstance(DynamicCredentialWebService);
	const cipher = mockInstance(Cipher);
	const authorizeIntentService = mockInstance(AuthorizeIntentService);
	const credentialsFinderService = mockInstance(CredentialsFinderService);
	const dynamicCredentialService = mockInstance(DynamicCredentialService);
	const urlService = mockInstance(UrlService);
	const eventService = mockInstance(EventService);
	mockInstance(CredentialConnectionStatusService);

	mockInstance(Logger);

	const controller = Container.get(DynamicCredentialsController);

	const timestamp = 1706750625678;
	vi.useFakeTimers({ shouldAdvanceTime: true });

	beforeEach(() => {
		vi.setSystemTime(new Date(timestamp));
		vi.clearAllMocks();

		// Configure default credential context mock
		dynamicCredentialWebService.getCredentialContextFromRequest.mockReturnValue({
			identity: 'token123',
			version: 1 as const,
			metadata: {},
		});

		// Default: resolver does not map the link to an n8n user (link stays unbound).
		dynamicCredentialService.resolveOwningUserIdForAuthorization.mockResolvedValue({
			status: 'unbound',
		});
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');

		// Default: caller can access the credential
		credentialsFinderService.findCredentialForUser.mockResolvedValue(mock<CredentialsEntity>());
	});

	describe('in-app access control', () => {
		it('returns 404 when an authenticated user cannot access the credential', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);
			const user = mock<AuthenticatedRequest['user']>({ id: 'user-123' });
			const req = mock<AuthenticatedRequest>({
				user,
				params: { id: 'foreign-credential' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			await expect(controller.authorizeCredential(req, res)).rejects.toThrow(
				'Credential not found',
			);
			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				'foreign-credential',
				user,
				['credential:update'],
			);
			expect(enterpriseCredentialsService.getOne).not.toHaveBeenCalled();
		});
	});

	describe('authorizeCredential', () => {
		const mockResolverEntity: DynamicCredentialResolver = {
			id: 'resolver-123',
			name: 'Test Resolver',
			type: 'oauth2-introspection-identifier',
			config: 'encrypted-config',
			createdAt: new Date(),
			updatedAt: new Date(),
			generateId: vi.fn(),
			setUpdateDate: vi.fn(),
		};

		const mockResolver = {
			metadata: {
				name: 'oauth2-introspection-identifier',
				description: 'OAuth2 Introspection Identifier',
			},
			getSecret: vi.fn(),
			setSecret: vi.fn(),
			validateOptions: vi.fn(),
		};

		it('should throw NotFoundError when credential is not found', async () => {
			const req = mock<Request>({
				params: { id: 'non-existent-id' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(null);

			await expect(controller.authorizeCredential(req, res)).rejects.toThrow(
				'Credential not found',
			);
			expect(enterpriseCredentialsService.getOne).toHaveBeenCalledWith('non-existent-id');
		});

		it('should throw BadRequestError when resolverId is missing', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleOAuth2Api',
			});
			const req = mock<Request>({
				params: { id: '1' },
				query: {},
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);

			await expect(controller.authorizeCredential(req, res)).rejects.toThrow('Resolver not found');
		});

		it('should throw BadRequestError when credential type is not OAuth2 or OAuth1', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'httpBasicAuth',
			});
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);

			await expect(controller.authorizeCredential(req, res)).rejects.toThrow(
				'Credential type not supported',
			);
			expect(enterpriseCredentialsService.getOne).toHaveBeenCalledWith('1');
		});

		it('should throw NotFoundError when resolver is not found', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleOAuth2Api',
			});
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'non-existent-resolver' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(null);

			await expect(controller.authorizeCredential(req, res)).rejects.toThrow('Resolver not found');
			expect(resolverRepository.findOneBy).toHaveBeenCalledWith({
				id: 'non-existent-resolver',
			});
		});

		it('should throw NotFoundError when resolver type is not registered', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleOAuth2Api',
			});
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(mockResolverEntity);
			resolverRegistry.getResolverByTypename.mockReturnValue(undefined);

			await expect(controller.authorizeCredential(req, res)).rejects.toThrow(
				'Resolver type not found',
			);
			expect(resolverRegistry.getResolverByTypename).toHaveBeenCalledWith(
				'oauth2-introspection-identifier',
			);
		});

		it('should return auth URI for OAuth2 credential', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleOAuth2Api',
			});
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(mockResolverEntity);
			resolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
			oauthService.generateAOauth2AuthUri.mockResolvedValueOnce(
				'https://example.domain/oauth2/auth?client_id=client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid',
			);

			const authUri = await controller.authorizeCredential(req, res);

			expect(authUri).toContain('https://example.domain/oauth2/auth');
			expect(enterpriseCredentialsService.getOne).toHaveBeenCalledWith('1');
			expect(resolverRepository.findOneBy).toHaveBeenCalledWith({ id: 'resolver-123' });
			expect(resolverRegistry.getResolverByTypename).toHaveBeenCalledWith(
				'oauth2-introspection-identifier',
			);
			expect(oauthService.generateAOauth2AuthUri).toHaveBeenCalledWith(
				mockCredential,
				{
					cid: '1',
					origin: 'dynamic-credential',
					authorizationHeader: 'Bearer token123',
					authMetadata: {},
					credentialResolverId: 'resolver-123',
				},
				req,
				res,
			);
		});

		it('should return auth URI for OAuth1 credential', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'twitterOAuth1Api',
			});
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(mockResolverEntity);
			resolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
			oauthService.generateAOauth1AuthUri.mockResolvedValueOnce(
				'https://example.domain/oauth/authorize?oauth_token=random-token',
			);

			const authUri = await controller.authorizeCredential(req, res);

			expect(authUri).toContain('https://example.domain/oauth/authorize?oauth_token=random-token');
			expect(enterpriseCredentialsService.getOne).toHaveBeenCalledWith('1');
			expect(resolverRepository.findOneBy).toHaveBeenCalledWith({ id: 'resolver-123' });
			expect(resolverRegistry.getResolverByTypename).toHaveBeenCalledWith(
				'oauth2-introspection-identifier',
			);
			expect(oauthService.generateAOauth1AuthUri).toHaveBeenCalledWith(
				mockCredential,
				{
					cid: '1',
					origin: 'dynamic-credential',
					authorizationHeader: 'Bearer token123',
					authMetadata: {},
					credentialResolverId: 'resolver-123',
				},
				req,
				res,
			);
		});

		it('should call validateIdentity when resolver has validateIdentity method', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleOAuth2Api',
			});
			const mockResolverWithValidation = {
				...mockResolver,
				validateIdentity: vi.fn().mockResolvedValue(undefined),
			};
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			const expectedContext = {
				identity: 'token123',
				version: 1 as const,
				metadata: {},
			};

			// Set up all mocks before calling the controller
			dynamicCredentialWebService.getCredentialContextFromRequest.mockReturnValue(expectedContext);
			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(mockResolverEntity);
			resolverRegistry.getResolverByTypename.mockReturnValue(mockResolverWithValidation);
			cipher.decryptV2.mockResolvedValueOnce(
				'{"introspectionUrl":"https://example.com/introspect"}',
			);
			oauthService.generateAOauth2AuthUri.mockResolvedValueOnce(
				'https://example.domain/oauth2/auth',
			);

			await controller.authorizeCredential(req, res);

			expect(cipher.decryptV2).toHaveBeenCalledWith('encrypted-config');
			expect(mockResolverWithValidation.validateIdentity).toHaveBeenCalledWith(expectedContext, {
				resolverId: 'resolver-123',
				resolverName: 'oauth2-introspection-identifier',
				configuration: { introspectionUrl: 'https://example.com/introspect' },
			});
		});

		it('should not call validateIdentity when resolver lacks validateIdentity method', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleOAuth2Api',
			});
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(mockResolverEntity);
			resolverRegistry.getResolverByTypename.mockReturnValue(mockResolver); // No validateIdentity
			oauthService.generateAOauth2AuthUri.mockResolvedValueOnce(
				'https://example.domain/oauth2/auth',
			);

			await controller.authorizeCredential(req, res);

			expect(cipher.decryptV2).not.toHaveBeenCalled();
		});

		it('sets the state userId when the resolver binds the link to a user', async () => {
			const mockCredential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(mockResolverEntity);
			resolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
			dynamicCredentialService.resolveOwningUserIdForAuthorization.mockResolvedValue({
				status: 'bound',
				userId: 'user-1',
			});
			oauthService.generateAOauth2AuthUri.mockResolvedValueOnce(
				'https://example.domain/oauth2/auth',
			);

			await controller.authorizeCredential(req, res);

			expect(oauthService.generateAOauth2AuthUri).toHaveBeenCalledWith(
				mockCredential,
				expect.objectContaining({ userId: 'user-1' }),
				req,
				res,
			);
		});

		it('leaves the state userId unset when the link is unbound', async () => {
			const mockCredential = mock<CredentialsEntity>({ id: '1', type: 'googleOAuth2Api' });
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(mockResolverEntity);
			resolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
			oauthService.generateAOauth2AuthUri.mockResolvedValueOnce(
				'https://example.domain/oauth2/auth',
			);

			await controller.authorizeCredential(req, res);

			expect(oauthService.generateAOauth2AuthUri).toHaveBeenCalledWith(
				mockCredential,
				expect.objectContaining({ userId: undefined }),
				req,
				res,
			);
		});
	});

	describe('authorizeCredentialRedirect', () => {
		it('renders an error and does not redirect when the token is missing', async () => {
			const req = mock<Request>({ params: { id: 'cred-1' }, query: {} });
			const res = mock<Response>();

			await controller.authorizeCredentialRedirect(req, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(
				res,
				'Missing authorization token.',
			);
			expect(res.redirect).not.toHaveBeenCalled();
		});

		it('renders an error when the intent is expired or unknown', async () => {
			const req = mock<Request>({ params: { id: 'cred-1' }, query: { token: 'gone' } });
			const res = mock<Response>();
			authorizeIntentService.get.mockResolvedValue(undefined);

			await controller.authorizeCredentialRedirect(req, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(
				res,
				'This authorization link is invalid or has expired. Please request a new one.',
			);
			expect(res.redirect).not.toHaveBeenCalled();
		});

		it('renders an error when the intent credential does not match the path id', async () => {
			const req = mock<Request>({ params: { id: 'cred-1' }, query: { token: 'tok' } });
			const res = mock<Response>();
			authorizeIntentService.get.mockResolvedValue({
				credentialId: 'a-different-credential',
				resolverId: 'resolver-123',
				identity: 'token123',
				metadata: {},
			});

			await controller.authorizeCredentialRedirect(req, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalled();
			expect(res.redirect).not.toHaveBeenCalled();
		});

		it('materializes the OAuth2 flow and redirects to the provider for a valid intent', async () => {
			const req = mock<Request>({ params: { id: 'cred-1' }, query: { token: 'tok' } });
			const res = mock<Response>();
			const mockCredential = mock<CredentialsEntity>({ id: 'cred-1', type: 'googleOAuth2Api' });

			authorizeIntentService.get.mockResolvedValue({
				credentialId: 'cred-1',
				resolverId: 'resolver-123',
				identity: 'bearer-jwt',
				metadata: { source: 'n8n-oauth' },
			});
			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			oauthService.generateAOauth2AuthUri.mockResolvedValue(
				'https://accounts.google.com/o/oauth2/auth?x=1',
			);

			await controller.authorizeCredentialRedirect(req, res);

			expect(oauthService.generateAOauth2AuthUri).toHaveBeenCalledWith(
				mockCredential,
				expect.objectContaining({
					cid: 'cred-1',
					origin: 'dynamic-credential',
					authorizationHeader: 'Bearer bearer-jwt',
					credentialResolverId: 'resolver-123',
					authMetadata: { source: 'n8n-oauth' },
				}),
				req,
				res,
			);
			expect(res.redirect).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/auth?x=1');
		});

		it('materializes the OAuth1 flow for an OAuth1 credential', async () => {
			const req = mock<Request>({ params: { id: 'cred-1' }, query: { token: 'tok' } });
			const res = mock<Response>();
			const mockCredential = mock<CredentialsEntity>({ id: 'cred-1', type: 'twitterOAuth1Api' });

			authorizeIntentService.get.mockResolvedValue({
				credentialId: 'cred-1',
				resolverId: 'resolver-123',
				identity: 'bearer-jwt',
				metadata: {},
			});
			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			oauthService.generateAOauth1AuthUri.mockResolvedValue(
				'https://api.twitter.com/oauth/authorize?x=1',
			);

			await controller.authorizeCredentialRedirect(req, res);

			expect(oauthService.generateAOauth1AuthUri).toHaveBeenCalled();
			expect(oauthService.generateAOauth2AuthUri).not.toHaveBeenCalled();
			expect(res.redirect).toHaveBeenCalledWith('https://api.twitter.com/oauth/authorize?x=1');
		});

		it('renders an error when materializing the provider URL fails', async () => {
			const req = mock<Request>({ params: { id: 'cred-1' }, query: { token: 'tok' } });
			const res = mock<Response>();
			const mockCredential = mock<CredentialsEntity>({ id: 'cred-1', type: 'googleOAuth2Api' });

			authorizeIntentService.get.mockResolvedValue({
				credentialId: 'cred-1',
				resolverId: 'resolver-123',
				identity: 'bearer-jwt',
				metadata: {},
			});
			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			oauthService.generateAOauth2AuthUri.mockRejectedValue(new Error('discovery failed'));

			await controller.authorizeCredentialRedirect(req, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(res, 'discovery failed');
			expect(res.redirect).not.toHaveBeenCalled();
		});

		it('proceeds when a bound link is opened by the intended user', async () => {
			const req = mock<AuthenticatedRequest>({
				params: { id: 'cred-1' },
				query: { token: 'tok' },
				user: mock<AuthenticatedRequest['user']>({ id: 'user-1' }),
			});
			const res = mock<Response>();
			const mockCredential = mock<CredentialsEntity>({ id: 'cred-1', type: 'googleOAuth2Api' });

			authorizeIntentService.get.mockResolvedValue({
				credentialId: 'cred-1',
				resolverId: 'resolver-123',
				identity: 'bearer-jwt',
				userId: 'user-1',
				metadata: {},
			});
			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			oauthService.generateAOauth2AuthUri.mockResolvedValue('https://accounts.google.com/auth?x=1');

			await controller.authorizeCredentialRedirect(req, res);

			expect(oauthService.generateAOauth2AuthUri).toHaveBeenCalledWith(
				mockCredential,
				expect.objectContaining({ userId: 'user-1' }),
				req,
				res,
			);
			expect(res.redirect).toHaveBeenCalledWith('https://accounts.google.com/auth?x=1');
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('proceeds through the OAuth1 flow when a bound link is opened by the intended user', async () => {
			const req = mock<AuthenticatedRequest>({
				params: { id: 'cred-1' },
				query: { token: 'tok' },
				user: mock<AuthenticatedRequest['user']>({ id: 'user-1' }),
			});
			const res = mock<Response>();
			const mockCredential = mock<CredentialsEntity>({ id: 'cred-1', type: 'twitterOAuth1Api' });

			authorizeIntentService.get.mockResolvedValue({
				credentialId: 'cred-1',
				resolverId: 'resolver-123',
				identity: 'bearer-jwt',
				userId: 'user-1',
				metadata: {},
			});
			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			oauthService.generateAOauth1AuthUri.mockResolvedValue(
				'https://api.twitter.com/oauth/authorize?x=1',
			);

			await controller.authorizeCredentialRedirect(req, res);

			expect(oauthService.generateAOauth1AuthUri).toHaveBeenCalledWith(
				mockCredential,
				expect.objectContaining({ userId: 'user-1' }),
				req,
				res,
			);
			expect(oauthService.generateAOauth2AuthUri).not.toHaveBeenCalled();
			expect(res.redirect).toHaveBeenCalledWith('https://api.twitter.com/oauth/authorize?x=1');
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('rejects a bound OAuth1 link opened by a different account before materializing the flow', async () => {
			const req = mock<AuthenticatedRequest>({
				params: { id: 'cred-1' },
				query: { token: 'tok' },
				user: mock<AuthenticatedRequest['user']>({ id: 'user-2' }),
			});
			const res = mock<Response>();

			authorizeIntentService.get.mockResolvedValue({
				credentialId: 'cred-1',
				resolverId: 'resolver-123',
				identity: 'bearer-jwt',
				userId: 'user-1',
				metadata: {},
			});

			await controller.authorizeCredentialRedirect(req, res);

			expect(eventService.emit).toHaveBeenCalledWith('dynamic-credential-authorize-rejected', {
				reason: 'user-mismatch',
				credentialId: 'cred-1',
			});
			expect(oauthService.generateAOauth1AuthUri).not.toHaveBeenCalled();
			expect(res.redirect).not.toHaveBeenCalled();
		});

		it('redirects an anonymous clicker of a bound link to sign in', async () => {
			const req = mock<Request>({
				params: { id: 'cred-1' },
				query: { token: 'tok' },
				originalUrl: '/rest/credentials/cred-1/authorize?token=tok',
			});
			const res = mock<Response>();

			authorizeIntentService.get.mockResolvedValue({
				credentialId: 'cred-1',
				resolverId: 'resolver-123',
				identity: 'bearer-jwt',
				userId: 'user-1',
				metadata: {},
			});

			await controller.authorizeCredentialRedirect(req, res);

			expect(eventService.emit).toHaveBeenCalledWith('dynamic-credential-authorize-rejected', {
				reason: 'unauthenticated',
				credentialId: 'cred-1',
			});
			expect(res.redirect).toHaveBeenCalledWith(
				`http://localhost:5678/signin?redirect=${encodeURIComponent(
					'http://localhost:5678/rest/credentials/cred-1/authorize?token=tok',
				)}`,
			);
			expect(oauthService.generateAOauth2AuthUri).not.toHaveBeenCalled();
		});

		it('rejects a bound link opened by a different account', async () => {
			const req = mock<AuthenticatedRequest>({
				params: { id: 'cred-1' },
				query: { token: 'tok' },
				user: mock<AuthenticatedRequest['user']>({ id: 'user-2' }),
			});
			const res = mock<Response>();

			authorizeIntentService.get.mockResolvedValue({
				credentialId: 'cred-1',
				resolverId: 'resolver-123',
				identity: 'bearer-jwt',
				userId: 'user-1',
				metadata: {},
			});

			await controller.authorizeCredentialRedirect(req, res);

			expect(eventService.emit).toHaveBeenCalledWith('dynamic-credential-authorize-rejected', {
				reason: 'user-mismatch',
				credentialId: 'cred-1',
			});
			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(
				res,
				'This authorization link was issued for a different account. Sign in as the intended user and open the link again.',
			);
			expect(res.redirect).not.toHaveBeenCalled();
			expect(oauthService.generateAOauth2AuthUri).not.toHaveBeenCalled();
		});

		it('proceeds unchanged for an unbound intent regardless of clicker', async () => {
			const req = mock<AuthenticatedRequest>({
				params: { id: 'cred-1' },
				query: { token: 'tok' },
				user: mock<AuthenticatedRequest['user']>({ id: 'some-other-user' }),
			});
			const res = mock<Response>();
			const mockCredential = mock<CredentialsEntity>({ id: 'cred-1', type: 'googleOAuth2Api' });

			// No userId on the intent → link is unbound.
			authorizeIntentService.get.mockResolvedValue({
				credentialId: 'cred-1',
				resolverId: 'resolver-123',
				identity: 'bearer-jwt',
				metadata: {},
			});
			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			oauthService.generateAOauth2AuthUri.mockResolvedValue('https://accounts.google.com/auth?x=1');

			await controller.authorizeCredentialRedirect(req, res);

			expect(res.redirect).toHaveBeenCalledWith('https://accounts.google.com/auth?x=1');
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});

	describe('revokeCredential', () => {
		const mockResolverEntity: DynamicCredentialResolver = {
			id: 'resolver-123',
			name: 'Test Resolver',
			type: 'oauth2-introspection-identifier',
			config: 'encrypted-config',
			createdAt: new Date(),
			updatedAt: new Date(),
			generateId: vi.fn(),
			setUpdateDate: vi.fn(),
		};

		it('should throw NotFoundError when credential is not found', async () => {
			const req = mock<Request>({
				params: { id: 'non-existent-id' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(null);

			await expect(controller.revokeCredential(req, res)).rejects.toThrow('Credential not found');
			expect(enterpriseCredentialsService.getOne).toHaveBeenCalledWith('non-existent-id');
		});

		it('should throw NotFoundError when resolver is not found', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleOAuth2Api',
			});
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'non-existent-resolver' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(null);

			await expect(controller.revokeCredential(req, res)).rejects.toThrow('Resolver not found');
			expect(resolverRepository.findOneBy).toHaveBeenCalledWith({
				id: 'non-existent-resolver',
			});
		});

		it('should successfully revoke credential and return 204 when deleteSecret exists', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleOAuth2Api',
			});
			const mockResolver = {
				metadata: {
					name: 'oauth2-introspection-identifier',
					description: 'OAuth2 Introspection Identifier',
				},
				getSecret: vi.fn(),
				setSecret: vi.fn(),
				validateOptions: vi.fn(),
				deleteSecret: vi.fn().mockResolvedValue(undefined),
			};
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();
			res.status.mockReturnThis();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(mockResolverEntity);
			resolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
			cipher.decryptV2.mockResolvedValue('{"introspectionUrl":"https://example.com/introspect"}');

			await controller.revokeCredential(req, res);

			expect(mockResolver.deleteSecret).toHaveBeenCalledTimes(1);
			expect(mockResolver.deleteSecret).toHaveBeenCalledWith(
				'1',
				{ identity: 'token123', version: 1, metadata: {} },
				{
					configuration: { introspectionUrl: 'https://example.com/introspect' },
					resolverId: 'resolver-123',
					resolverName: 'oauth2-introspection-identifier',
				},
			);
			expect(cipher.decryptV2).toHaveBeenCalledWith('encrypted-config');
			expect(res.status).toHaveBeenCalledWith(204);
			expect(res.send).toHaveBeenCalled();
		});

		it('should return 204 when resolver lacks deleteSecret method', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleOAuth2Api',
			});
			const mockResolver = {
				metadata: {
					name: 'oauth2-introspection-identifier',
					description: 'OAuth2 Introspection Identifier',
				},
				getSecret: vi.fn(),
				setSecret: vi.fn(),
				validateOptions: vi.fn(),
				// No deleteSecret method
			};
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();
			res.status.mockReturnThis();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(mockResolverEntity);
			resolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);

			await controller.revokeCredential(req, res);

			expect(cipher.decryptV2).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(204);
			expect(res.send).toHaveBeenCalled();
		});

		it('should pass correct parameters to deleteSecret', async () => {
			// Arrange
			const mockCredential = mock<CredentialsEntity>({
				id: 'cred-456',
				type: 'googleOAuth2Api',
			});
			const mockResolver = {
				metadata: {
					name: 'oauth2-introspection-identifier',
					description: 'OAuth2 Introspection Identifier',
				},
				getSecret: vi.fn(),
				setSecret: vi.fn(),
				validateOptions: vi.fn(),
				deleteSecret: vi.fn().mockResolvedValue(undefined),
			};
			const req = mock<Request>({
				params: { id: 'cred-456' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer my-test-token' },
			});
			const res = mock<Response>();
			res.status.mockReturnThis();

			const expectedContext = {
				identity: 'my-test-token',
				version: 1 as const,
				metadata: {},
			};

			dynamicCredentialWebService.getCredentialContextFromRequest.mockReturnValue(expectedContext);
			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(mockResolverEntity);
			resolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
			cipher.decryptV2.mockResolvedValue('{"key":"value","url":"https://test.com"}');

			// Act
			await controller.revokeCredential(req, res);

			// Assert - PRIMARY FOCUS: Explicit parameter contract verification
			expect(mockResolver.deleteSecret).toHaveBeenCalledWith('cred-456', expectedContext, {
				configuration: { key: 'value', url: 'https://test.com' },
				resolverId: 'resolver-123',
				resolverName: 'oauth2-introspection-identifier',
			});
		});

		it('should work with OAuth1 credential type', async () => {
			// This test verifies that the revoke endpoint is OAuth-version agnostic
			// Unlike authorize (which calls different OAuth1/OAuth2 services),
			// revoke treats OAuth1 and OAuth2 the same way

			// Arrange
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'twitterOAuth1Api',
			});
			const mockResolver = {
				metadata: {
					name: 'oauth2-introspection-identifier',
					description: 'OAuth2 Introspection Identifier',
				},
				getSecret: vi.fn(),
				setSecret: vi.fn(),
				validateOptions: vi.fn(),
				deleteSecret: vi.fn().mockResolvedValue(undefined),
			};
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();
			res.status.mockReturnThis();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(mockResolverEntity);
			resolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
			cipher.decryptV2.mockResolvedValue('{"introspectionUrl":"https://example.com/introspect"}');

			// Act
			await controller.revokeCredential(req, res);

			// Assert
			// 1. deleteSecret should be called (OAuth1 works the same as OAuth2 for revocation)
			expect(mockResolver.deleteSecret).toHaveBeenCalledTimes(1);
			expect(mockResolver.deleteSecret).toHaveBeenCalledWith(
				'1',
				{ identity: 'token123', version: 1, metadata: {} },
				{
					configuration: { introspectionUrl: 'https://example.com/introspect' },
					resolverId: 'resolver-123',
					resolverName: 'oauth2-introspection-identifier',
				},
			);

			// 2. Returns 204 status
			expect(res.status).toHaveBeenCalledWith(204);
			expect(res.send).toHaveBeenCalled();
		});
	});
});
