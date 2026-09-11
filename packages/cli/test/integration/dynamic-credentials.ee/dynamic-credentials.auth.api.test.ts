import { LicenseState } from '@n8n/backend-common';
import { mockInstance, getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { CredentialsEntity, User } from '@n8n/db';
import { GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import { CredentialsHelper } from '@/credentials-helper';
import {
	SYSTEM_RESOLVER_ID,
	SYSTEM_RESOLVER_NAME,
	SYSTEM_RESOLVER_TYPE,
} from '@/modules/dynamic-credentials.ee/constants';
import { DynamicCredentialUserEntryStorage } from '@/modules/dynamic-credentials.ee/credential-resolvers/storage/dynamic-credential-user-entry-storage';
import type { DynamicCredentialResolver } from '@/modules/dynamic-credentials.ee/database/entities/credential-resolver';
import { DynamicCredentialResolverRepository } from '@/modules/dynamic-credentials.ee/database/repositories/credential-resolver.repository';
import { DynamicCredentialUserEntryRepository } from '@/modules/dynamic-credentials.ee/database/repositories/dynamic-credential-user-entry.repository';
import { DynamicCredentialsConfig } from '@/modules/dynamic-credentials.ee/dynamic-credentials.config';
import { DynamicCredentialResolverService } from '@/modules/dynamic-credentials.ee/services/credential-resolver.service';
import { Telemetry } from '@/telemetry';

import { saveCredential } from '../shared/db/credentials';
import { createUser } from '../shared/db/users';
import * as utils from '../shared/utils';

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
	let unrelatedMember: User;

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

		// A second regular member with no relationship to the owner's credential:
		// not the owner, no project membership, no sharing.
		unrelatedMember = await createUser();
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

		// These two used to expect 403/404: the endpoints were gated on
		// `credential:update`, so a user could connect their own account and then not
		// disconnect or reconnect it. Connect and disconnect are two halves of one
		// self-service action, and the connect half — the intent link, the OAuth
		// callback, `/my-connection` — never carried a scope check. The delete is
		// self-scoped as well: the resolver derives the storage key from the caller's
		// own identity and the route has no `:userId`, so the worst a caller can do is
		// clear their own row.
		describe('when an authenticated member holds no project role on the credential', () => {
			it('should return an authorization URL for an end-user credential', async () => {
				const response = await testServer
					.authAgentFor(unrelatedMember)
					.post(`/credentials/${savedCredential.id}/authorize`)
					.query({ resolverId: resolver.id })
					.set('Authorization', 'Bearer test-token')
					.expect(200);

				expect(response.body.data).toContain('https://test.domain/oauth2/auth');
			});

			it('should revoke their own connection to an end-user credential', async () => {
				await testServer
					.authAgentFor(unrelatedMember)
					.delete(`/credentials/${savedCredential.id}/revoke`)
					.query({ resolverId: resolver.id })
					.set('Authorization', 'Bearer test-token')
					.expect(204);
			});
		});

		describe('when the credential is not an end-user credential', () => {
			let fixedCredential: CredentialsEntity;

			beforeAll(async () => {
				// Same shape as `savedCredential`, but a fixed credential: its OAuth token
				// lives on the shared row, so these routes must not reach it.
				fixedCredential = await saveCredential(
					{
						name: 'Test Fixed Credential',
						type: 'oAuth2Api',
						data: {
							clientId: 'test-client-id',
							clientSecret: 'test-client-secret',
							authUrl: 'https://test.domain/oauth2/auth',
							accessTokenUrl: 'https://test.domain/oauth2/token',
							grantType: 'authorizationCode',
						},
					},
					{ user: owner, role: 'credential:owner' },
				);
			});

			it('should refuse to authorize it, indistinguishably from an unknown id', async () => {
				const fixed = await testServer
					.authAgentFor(owner)
					.post(`/credentials/${fixedCredential.id}/authorize`)
					.query({ resolverId: resolver.id })
					.set('Authorization', 'Bearer test-token')
					.expect(404);

				const unknown = await testServer
					.authAgentFor(owner)
					.post('/credentials/no-such-credential/authorize')
					.query({ resolverId: resolver.id })
					.set('Authorization', 'Bearer test-token')
					.expect(404);

				expect(fixed.body?.data).toBeUndefined();
				expect(fixed.body.message).toBe(unknown.body.message);
			});

			it('should refuse to revoke it, indistinguishably from an unknown id', async () => {
				const fixed = await testServer
					.authAgentFor(owner)
					.delete(`/credentials/${fixedCredential.id}/revoke`)
					.query({ resolverId: resolver.id })
					.set('Authorization', 'Bearer test-token')
					.expect(404);

				const unknown = await testServer
					.authAgentFor(owner)
					.delete('/credentials/no-such-credential/revoke')
					.query({ resolverId: resolver.id })
					.set('Authorization', 'Bearer test-token')
					.expect(404);

				expect(fixed.body.message).toBe(unknown.body.message);
			});
		});
	});

	describe('DELETE /credentials/:id/revoke with the n8n resolver', () => {
		let userEntryRepository: DynamicCredentialUserEntryRepository;
		let storage: DynamicCredentialUserEntryStorage;
		let outsider: User;
		let bystander: User;

		beforeAll(async () => {
			// The outer truncate drops the seeded system resolver, so put it back.
			const resolverRepository = Container.get(DynamicCredentialResolverRepository);
			await resolverRepository.save(
				resolverRepository.create({
					id: SYSTEM_RESOLVER_ID,
					name: SYSTEM_RESOLVER_NAME,
					type: SYSTEM_RESOLVER_TYPE,
					config: await Container.get(Cipher).encryptV2({}),
				}),
			);

			userEntryRepository = Container.get(DynamicCredentialUserEntryRepository);
			storage = Container.get(DynamicCredentialUserEntryStorage);

			// Neither user has any project relation to the owner's credential.
			outsider = await createUser();
			bystander = await createUser();
		});

		beforeEach(async () => {
			await storage.setCredentialData(
				savedCredential.id,
				outsider.id,
				SYSTEM_RESOLVER_ID,
				'outsider-token',
				{},
			);
			await storage.setCredentialData(
				savedCredential.id,
				bystander.id,
				SYSTEM_RESOLVER_ID,
				'bystander-token',
				{},
			);
		});

		it("should clear only the calling user's connection", async () => {
			await testServer
				.authAgentFor(outsider)
				.delete(`/credentials/${savedCredential.id}/revoke`)
				.query({ resolverId: SYSTEM_RESOLVER_ID, authSource: 'cookie' })
				.expect(204);

			await expect(
				userEntryRepository.find({
					where: { credentialId: savedCredential.id, userId: outsider.id },
				}),
			).resolves.toHaveLength(0);
			await expect(
				userEntryRepository.find({
					where: { credentialId: savedCredential.id, userId: bystander.id },
				}),
			).resolves.toHaveLength(1);
		});
	});
});
