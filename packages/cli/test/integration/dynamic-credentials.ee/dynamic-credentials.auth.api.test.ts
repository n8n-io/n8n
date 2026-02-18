import { LicenseState } from '@n8n/backend-common';
import { mockInstance, getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { CredentialsEntity, User } from '@n8n/db';
import { GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import nock from 'nock';

import * as utils from '../shared/utils';
import { DynamicCredentialResolverService } from '@/modules/dynamic-credentials.ee/services/credential-resolver.service';
import { Telemetry } from '@/telemetry';
import { saveCredential } from '../shared/db/credentials';
import { DynamicCredentialsConfig } from '@/modules/dynamic-credentials.ee/dynamic-credentials.config';
import { CredentialsHelper } from '@/credentials-helper';

import { createUser } from '../shared/db/users';
import type { DynamicCredentialResolver } from '@/modules/dynamic-credentials.ee/database/entities/credential-resolver';

mockInstance(Telemetry);

const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';

mockInstance(DynamicCredentialsConfig, {
	endpointAuthToken: 'static-test-token',
	corsOrigin: 'https://app.example.com',
	corsAllowCredentials: false,
});

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials', 'oauth2'],
	enabledFeatures: ['feat:externalSecrets'],
	modules: ['dynamic-credentials'],
});

CredentialsHelper.prototype.applyDefaultsAndOverwrites = async (_, decryptedDataOriginal) =>
	decryptedDataOriginal;

const setupWorkflow = async () => {
	const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	const resolverService = Container.get(DynamicCredentialResolverService);

	const resolver = await resolverService.create({
		name: 'Test Resolver',
		type: 'credential-resolver.oauth2-1.0',
		config: {
			metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			validation: 'oauth2-introspection',
		},
		user: owner,
	});

	const personalProject = await getPersonalProject(owner);

	const savedCredential = await saveCredential(
		{
			name: 'Test Dynamic Credential',
			type: 'oAuth2Api',
			isResolvable: true,
			data: {
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				authUrl: 'https://test.domain/oauth2/auth',
				accessTokenUrl: 'https://test.domain/oauth2/token',
				grantType: 'authorizationCode',
			},
		},
		{
			project: personalProject,
			role: 'credential:owner',
		},
	);
	return { savedCredential, resolver, owner };
};

describe('Dynamic Credentials API', () => {
	let savedCredential: CredentialsEntity;
	let resolver: DynamicCredentialResolver;
	let owner: User;

	beforeAll(async () => {
		// Mock OAuth metadata endpoint for resolver validation
		nock.cleanAll();
		nock('https://auth.example.com')
			.persist()
			.get('/.well-known/openid-configuration')
			.reply(200, {
				issuer: 'https://auth.example.com',
				introspection_endpoint: 'https://auth.example.com/oauth/introspect',
				introspection_endpoint_auth_methods_supported: [
					'client_secret_basic',
					'client_secret_post',
				],
			});

		// Mock OAuth introspection endpoint for identity validation
		nock('https://auth.example.com')
			.persist()
			.post('/oauth/introspect')
			.reply(200, {
				active: true,
				sub: 'user-123',
				exp: Math.floor(Date.now() / 1000) + 3600,
			});

		await testDb.truncate(['User', 'CredentialsEntity', 'DynamicCredentialResolver']);

		({ savedCredential, resolver, owner } = await setupWorkflow());
	});

	afterAll(async () => {
		nock.cleanAll();
		await testDb.terminate();
		testServer.httpServer.close();
	});

	describe('POST /credentials/:id/authorize', () => {
		describe('when a static auth token is provided', () => {
			it('should return the authorization URL for a credential', async () => {
				const response = await testServer.authlessAgent
					.post(`/credentials/${savedCredential.id}/authorize`)
					.query({ resolverId: resolver.id })
					.set('X-Authorization', 'Bearer static-test-token')
					.set('Authorization', 'Bearer test-token')
					.expect(200);

				expect(response.body.data).toBeDefined();
				expect(typeof response.body.data).toBe('string');
				expect(response.body.data).toContain('https://test.domain/oauth2/auth');
			});

			it('should return 401 if the static auth token is invalid', async () => {
				await testServer.authlessAgent
					.post(`/credentials/${savedCredential.id}/authorize`)
					.query({ resolverId: resolver.id })
					.set('X-Authorization', 'Bearer invalid-token')
					.set('Authorization', 'Bearer test-token')
					.expect(401);
			});

			it('should return 401 if the static auth token is missing', async () => {
				await testServer.authlessAgent
					.post(`/credentials/${savedCredential.id}/authorize`)
					.query({ resolverId: resolver.id })
					.set('Authorization', 'Bearer test-token')
					.expect(401);
			});

			it('should return 401 if the static auth token is empty', async () => {
				await testServer.authlessAgent
					.post(`/credentials/${savedCredential.id}/authorize`)
					.query({ resolverId: resolver.id })
					.set('Authorization', 'Bearer test-token')
					.set('X-Authorization', 'Bearer ')
					.expect(401);
			});
		});

		it('should return 401 if the authorization header is missing', async () => {
			await testServer.authlessAgent
				.post(`/credentials/${savedCredential.id}/authorize`)
				.query({ resolverId: resolver.id })
				.set('X-Authorization', 'Bearer static-test-token')
				.expect(401);
		});
	});

	describe('DELETE /credentials/:id/revoke', () => {
		describe('when a static auth token is provided', () => {
			it('should revoke a credential', async () => {
				await testServer.authlessAgent
					.delete(`/credentials/${savedCredential.id}/revoke`)
					.query({ resolverId: resolver.id })
					.set('X-Authorization', 'Bearer static-test-token')
					.set('Authorization', 'Bearer test-token')
					.expect(204);
			});

			it('should return 401 if the static auth token is invalid', async () => {
				await testServer.authlessAgent
					.delete(`/credentials/${savedCredential.id}/revoke`)
					.query({ resolverId: resolver.id })
					.set('X-Authorization', 'Bearer invalid-token')
					.set('Authorization', 'Bearer test-token')
					.expect(401);
			});

			it('should return 401 if the static auth token is missing', async () => {
				await testServer.authlessAgent
					.delete(`/credentials/${savedCredential.id}/revoke`)
					.query({ resolverId: resolver.id })
					.set('Authorization', 'Bearer test-token')
					.expect(401);
			});

			it('should return 401 if the static auth token is empty', async () => {
				await testServer.authlessAgent
					.delete(`/credentials/${savedCredential.id}/revoke`)
					.query({ resolverId: resolver.id })
					.set('Authorization', 'Bearer test-token')
					.set('X-Authorization', 'Bearer ')
					.expect(401);
			});
		});
	});

	describe('Cookie Authentication Bypass', () => {
		describe('POST /credentials/:id/authorize', () => {
			describe('when a user is authenticated via cookie', () => {
				it('should allow access without static auth token', async () => {
					const response = await testServer
						.authAgentFor(owner)
						.post(`/credentials/${savedCredential.id}/authorize`)
						.query({ resolverId: resolver.id })
						.set('Authorization', 'Bearer test-token')
						// Note: NO X-Authorization header provided
						.expect(200);

					expect(response.body.data).toBeDefined();
					expect(typeof response.body.data).toBe('string');
					expect(response.body.data).toContain('https://test.domain/oauth2/auth');
				});

				it('should allow access even with invalid static token if cookie auth succeeds', async () => {
					const response = await testServer
						.authAgentFor(owner)
						.post(`/credentials/${savedCredential.id}/authorize`)
						.query({ resolverId: resolver.id })
						.set('Authorization', 'Bearer test-token')
						.set('X-Authorization', 'Bearer invalid-static-token') // Invalid token
						.expect(200);

					expect(response.body.data).toBeDefined();
					expect(typeof response.body.data).toBe('string');
					expect(response.body.data).toContain('https://test.domain/oauth2/auth');
				});
			});
		});

		describe('DELETE /credentials/:id/revoke', () => {
			describe('when a user is authenticated via cookie', () => {
				it('should allow access without static auth token', async () => {
					await testServer
						.authAgentFor(owner)
						.delete(`/credentials/${savedCredential.id}/revoke`)
						.query({ resolverId: resolver.id })
						.set('Authorization', 'Bearer test-token')
						// Note: NO X-Authorization header provided
						.expect(204);
				});

				it('should allow access even with invalid static token if cookie auth succeeds', async () => {
					await testServer
						.authAgentFor(owner)
						.delete(`/credentials/${savedCredential.id}/revoke`)
						.query({ resolverId: resolver.id })
						.set('Authorization', 'Bearer test-token')
						.set('X-Authorization', 'Bearer invalid-static-token') // Invalid token
						.expect(204);
				});
			});
		});
	});
});
