import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { type CredentialsEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Request, Response } from 'express';
import { Cipher } from 'n8n-core';
import { DynamicCredentialsController } from '@/modules/dynamic-credentials.ee/dynamic-credentials.controller';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { OauthService } from '@/oauth/oauth.service';
import { DynamicCredentialResolverRepository } from '@/modules/dynamic-credentials.ee/database/repositories/credential-resolver.repository';
import { DynamicCredentialResolverRegistry } from '@/modules/dynamic-credentials.ee/services';
import type { DynamicCredentialResolver } from '@/modules/dynamic-credentials.ee/database/entities/credential-resolver';

jest.mock('axios');

jest.mock('../utils', () => ({
	getBearerToken: jest.requireActual('../utils').getBearerToken,
	getDynamicCredentialMiddlewares: jest.fn(() => undefined),
}));

describe('DynamicCredentialsController', () => {
	const enterpriseCredentialsService = mockInstance(EnterpriseCredentialsService);
	const oauthService = mockInstance(OauthService);
	const resolverRepository = mockInstance(DynamicCredentialResolverRepository);
	const resolverRegistry = mockInstance(DynamicCredentialResolverRegistry);
	const cipher = mockInstance(Cipher);

	mockInstance(Logger);

	const controller = Container.get(DynamicCredentialsController);

	const timestamp = 1706750625678;
	jest.useFakeTimers({ advanceTimers: true });

	beforeEach(() => {
		jest.setSystemTime(new Date(timestamp));
		jest.clearAllMocks();
	});

	describe('authorizeCredential', () => {
		const mockResolverEntity: DynamicCredentialResolver = {
			id: 'resolver-123',
			name: 'Test Resolver',
			type: 'oauth2-introspection-identifier',
			config: 'encrypted-config',
			createdAt: new Date(),
			updatedAt: new Date(),
			generateId: jest.fn(),
			setUpdateDate: jest.fn(),
		};

		const mockResolver = {
			metadata: {
				name: 'oauth2-introspection-identifier',
				description: 'OAuth2 Introspection Identifier',
			},
			getSecret: jest.fn(),
			setSecret: jest.fn(),
			validateOptions: jest.fn(),
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
			expect(oauthService.generateAOauth2AuthUri).toHaveBeenCalledWith(mockCredential, {
				cid: '1',
				origin: 'dynamic-credential',
				authorizationHeader: 'Bearer token123',
				credentialResolverId: 'resolver-123',
			});
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
			expect(oauthService.generateAOauth1AuthUri).toHaveBeenCalledWith(mockCredential, {
				cid: '1',
				origin: 'dynamic-credential',
				authorizationHeader: 'Bearer token123',
				credentialResolverId: 'resolver-123',
			});
		});

		it('should throw UnauthenticatedError when authorization header is missing', async () => {
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: undefined },
			});
			const res = mock<Response>();

			await expect(controller.authorizeCredential(req, res)).rejects.toThrow('Unauthenticated');
		});

		it('should throw BadRequestError when authorization header is malformed', async () => {
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'InvalidFormat' },
			});
			const res = mock<Response>();

			await expect(controller.authorizeCredential(req, res)).rejects.toThrow(
				'Authorization header is malformed',
			);
		});

		it('should call validateIdentity when resolver has validateIdentity method', async () => {
			const mockCredential = mock<CredentialsEntity>({
				id: '1',
				type: 'googleOAuth2Api',
			});
			const mockResolverWithValidation = {
				...mockResolver,
				validateIdentity: jest.fn().mockResolvedValue(undefined),
			};
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer token123' },
			});
			const res = mock<Response>();

			// Set up all mocks before calling the controller
			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(mockResolverEntity);
			resolverRegistry.getResolverByTypename.mockReturnValue(mockResolverWithValidation);
			cipher.decrypt.mockReturnValueOnce('{"introspectionUrl":"https://example.com/introspect"}');
			oauthService.generateAOauth2AuthUri.mockResolvedValueOnce(
				'https://example.domain/oauth2/auth',
			);

			await controller.authorizeCredential(req, res);

			expect(cipher.decrypt).toHaveBeenCalledWith('encrypted-config');
			expect(mockResolverWithValidation.validateIdentity).toHaveBeenCalledWith('token123', {
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

			expect(cipher.decrypt).not.toHaveBeenCalled();
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
			generateId: jest.fn(),
			setUpdateDate: jest.fn(),
		};

		it('should throw UnauthenticatedError when authorization header is missing', async () => {
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: undefined },
			});
			const res = mock<Response>();

			await expect(controller.revokeCredential(req, res)).rejects.toThrow('Unauthenticated');
		});

		it('should throw BadRequestError when authorization header is malformed', async () => {
			const req = mock<Request>({
				params: { id: '1' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'InvalidFormat' },
			});
			const res = mock<Response>();

			await expect(controller.revokeCredential(req, res)).rejects.toThrow(
				'Authorization header is malformed',
			);
		});

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
				getSecret: jest.fn(),
				setSecret: jest.fn(),
				validateOptions: jest.fn(),
				deleteSecret: jest.fn().mockResolvedValue(undefined),
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
			cipher.decrypt.mockReturnValue('{"introspectionUrl":"https://example.com/introspect"}');

			await controller.revokeCredential(req, res);

			expect(mockResolver.deleteSecret).toHaveBeenCalledTimes(1);
			expect(mockResolver.deleteSecret).toHaveBeenCalledWith(
				'1',
				{ identity: 'token123', version: 1 },
				{
					configuration: { introspectionUrl: 'https://example.com/introspect' },
					resolverId: 'resolver-123',
					resolverName: 'oauth2-introspection-identifier',
				},
			);
			expect(cipher.decrypt).toHaveBeenCalledWith('encrypted-config');
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
				getSecret: jest.fn(),
				setSecret: jest.fn(),
				validateOptions: jest.fn(),
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

			expect(cipher.decrypt).not.toHaveBeenCalled();
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
				getSecret: jest.fn(),
				setSecret: jest.fn(),
				validateOptions: jest.fn(),
				deleteSecret: jest.fn().mockResolvedValue(undefined),
			};
			const req = mock<Request>({
				params: { id: 'cred-456' },
				query: { resolverId: 'resolver-123' },
				headers: { authorization: 'Bearer my-test-token' },
			});
			const res = mock<Response>();
			res.status.mockReturnThis();

			enterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			resolverRepository.findOneBy.mockResolvedValue(mockResolverEntity);
			resolverRegistry.getResolverByTypename.mockReturnValue(mockResolver);
			cipher.decrypt.mockReturnValue('{"key":"value","url":"https://test.com"}');

			// Act
			await controller.revokeCredential(req, res);

			// Assert - PRIMARY FOCUS: Explicit parameter contract verification
			expect(mockResolver.deleteSecret).toHaveBeenCalledWith(
				'cred-456',
				{
					identity: 'my-test-token',
					version: 1,
				},
				{
					configuration: { key: 'value', url: 'https://test.com' },
					resolverId: 'resolver-123',
					resolverName: 'oauth2-introspection-identifier',
				},
			);
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
				getSecret: jest.fn(),
				setSecret: jest.fn(),
				validateOptions: jest.fn(),
				deleteSecret: jest.fn().mockResolvedValue(undefined),
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
			cipher.decrypt.mockReturnValue('{"introspectionUrl":"https://example.com/introspect"}');

			// Act
			await controller.revokeCredential(req, res);

			// Assert
			// 1. deleteSecret should be called (OAuth1 works the same as OAuth2 for revocation)
			expect(mockResolver.deleteSecret).toHaveBeenCalledTimes(1);
			expect(mockResolver.deleteSecret).toHaveBeenCalledWith(
				'1',
				{ identity: 'token123', version: 1 },
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
