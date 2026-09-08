import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	getPersonalProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { CredentialsEntity, Project, User } from '@n8n/db';
import { GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import { CredentialsHelper } from '@/credentials-helper';
import { EventService } from '@/events/event.service';
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
import { createMember, createUser } from '../shared/db/users';
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

			it('should not emit the disconnect event, which needs an n8n user', async () => {
				const emitSpy = vi
					.spyOn(Container.get(EventService), 'emit')
					.mockImplementation(() => true);

				try {
					await testServer.authlessAgent
						.delete(`/credentials/${savedCredential.id}/revoke`)
						.query({ resolverId: resolver.id })
						.set('X-Authorization', 'Bearer static-test-token')
						.set('Authorization', 'Bearer test-token')
						.expect(204);

					expect(emitSpy).not.toHaveBeenCalledWith(
						'credentials-user-disconnected',
						expect.anything(),
					);
				} finally {
					emitSpy.mockRestore();
				}
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

		describe("when an unrelated authenticated member targets another user's credential", () => {
			it('should not return an authorization URL for a credential the member cannot access', async () => {
				const response = await testServer
					.authAgentFor(unrelatedMember)
					.post(`/credentials/${savedCredential.id}/authorize`)
					.query({ resolverId: resolver.id })
					.set('Authorization', 'Bearer test-token');

				expect([403, 404]).toContain(response.status);
				expect(response.body?.data).toBeUndefined();
			});

			it('should not revoke a credential the member cannot even read', async () => {
				// `credential:connect` is the floor: a member with no relationship to the
				// credential holds no scope on it. They clear their own stored tokens
				// through `/my-connection`, which carries no scope check by design.
				const response = await testServer
					.authAgentFor(unrelatedMember)
					.delete(`/credentials/${savedCredential.id}/revoke`)
					.query({ resolverId: resolver.id })
					.set('Authorization', 'Bearer test-token');

				expect([403, 404]).toContain(response.status);
			});
		});
	});

	// The connect panel shared by the Form, Chat and MCP triggers uses the system n8n
	// resolver, which keys each entry on the caller's n8n user id.
	describe('DELETE /credentials/:id/revoke with the system resolver', () => {
		let teamProject: Project;
		let viewer: User;
		let secondViewer: User;
		let userEntryStorage: DynamicCredentialUserEntryStorage;
		let userEntryRepository: DynamicCredentialUserEntryRepository;

		const seedUserEntry = async (credentialId: string, userId: string) =>
			await userEntryStorage.setCredentialData(
				credentialId,
				userId,
				SYSTEM_RESOLVER_ID,
				'encrypted-payload',
				{},
			);

		const saveResolvableCredential = async () =>
			await saveCredential(
				{
					name: 'Panel Dynamic Credential',
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
				{ project: teamProject, role: 'credential:owner' },
			);

		/** Matches how the panel calls the endpoint: session cookie, no bearer token. */
		const disconnectAs = (user: User, credentialId: string) =>
			testServer
				.authAgentFor(user)
				.delete(`/credentials/${credentialId}/revoke`)
				.query({ resolverId: SYSTEM_RESOLVER_ID, authSource: 'cookie' });

		/** The panel's reconnect: the first connect consumed its one-time link, so it mints a new one. */
		const reconnectAs = (user: User, credentialId: string) =>
			testServer
				.authAgentFor(user)
				.post(`/credentials/${credentialId}/authorize`)
				.query({ resolverId: SYSTEM_RESOLVER_ID, authSource: 'cookie' });

		beforeAll(async () => {
			teamProject = await createTeamProject(undefined, owner);
			viewer = await createMember();
			secondViewer = await createMember();
			await linkUserToProject(viewer, teamProject, 'project:viewer');
			await linkUserToProject(secondViewer, teamProject, 'project:viewer');

			userEntryStorage = Container.get(DynamicCredentialUserEntryStorage);
			userEntryRepository = Container.get(DynamicCredentialUserEntryRepository);

			// The outer setup truncates the resolver table, which drops the row the
			// module seeds at init.
			const resolverRepository = Container.get(DynamicCredentialResolverRepository);
			await resolverRepository.save(
				resolverRepository.create({
					id: SYSTEM_RESOLVER_ID,
					name: SYSTEM_RESOLVER_NAME,
					type: SYSTEM_RESOLVER_TYPE,
					config: await Container.get(Cipher).encryptV2({}),
				}),
			);
		});

		it('lets a project viewer disconnect their own connection', async () => {
			const credential = await saveResolvableCredential();
			await seedUserEntry(credential.id, viewer.id);

			await disconnectAs(viewer, credential.id).expect(204);

			const remaining = await userEntryRepository.find({
				where: { credentialId: credential.id, userId: viewer.id },
			});
			expect(remaining).toHaveLength(0);
		});

		it("does not affect other users' connections on the same credential", async () => {
			const credential = await saveResolvableCredential();
			await seedUserEntry(credential.id, viewer.id);
			await seedUserEntry(credential.id, secondViewer.id);

			await disconnectAs(viewer, credential.id).expect(204);

			const secondViewerEntries = await userEntryRepository.find({
				where: { credentialId: credential.id, userId: secondViewer.id },
			});
			expect(secondViewerEntries).toHaveLength(1);
		});

		it('lets any authenticated user disconnect from a global end-user credential', async () => {
			// Deliberate, and the one case with no membership check: a globally shared
			// end-user credential grants connect access to every user, because each
			// connects their own account (see role.service.ts and the global branch in
			// credentials-finder.service.ts). The delete stays keyed to the caller.
			const outsider = await createMember();
			const credential = await saveCredential(
				{
					name: 'Global End-User Credential',
					type: 'oAuth2Api',
					isResolvable: true,
					isGlobal: true,
					data: {
						clientId: 'test-client-id',
						clientSecret: 'test-client-secret',
						authUrl: 'https://test.domain/oauth2/auth',
						accessTokenUrl: 'https://test.domain/oauth2/token',
						grantType: 'authorizationCode',
					},
				},
				{ project: teamProject, role: 'credential:owner' },
			);
			await seedUserEntry(credential.id, outsider.id);

			await disconnectAs(outsider, credential.id).expect(204);

			const remaining = await userEntryRepository.find({
				where: { credentialId: credential.id, userId: outsider.id },
			});
			expect(remaining).toHaveLength(0);
		});

		it('refuses a user who has lost project access, who uses /my-connection instead', async () => {
			// `credential:connect` is the floor for this endpoint, and a user who lost
			// project access holds nothing. `/my-connection` is the un-gated path that
			// still lets them clear their own tokens — covered in my-connection.api.test.ts.
			const outsider = await createMember();
			const credential = await saveResolvableCredential();
			await seedUserEntry(credential.id, outsider.id);

			const response = await disconnectAs(outsider, credential.id);
			expect([403, 404]).toContain(response.status);

			const remaining = await userEntryRepository.find({
				where: { credentialId: credential.id, userId: outsider.id },
			});
			expect(remaining).toHaveLength(1);
		});

		it('lets a project viewer reconnect after disconnecting', async () => {
			// The panel's in-session reconnect: the first connect consumed its one-time
			// link, so Connect mints a new one instead of reloading the page.
			const credential = await saveResolvableCredential();
			await seedUserEntry(credential.id, viewer.id);

			await disconnectAs(viewer, credential.id).expect(204);

			const response = await reconnectAs(viewer, credential.id).expect(200);
			expect(response.body.data).toContain('https://test.domain/oauth2/auth');
		});

		it('emits credentials-user-disconnected audit event on success', async () => {
			const credential = await saveResolvableCredential();
			await seedUserEntry(credential.id, viewer.id);

			const emitSpy = vi.spyOn(Container.get(EventService), 'emit').mockImplementation(() => true);

			try {
				await disconnectAs(viewer, credential.id).expect(204);

				expect(emitSpy).toHaveBeenCalledWith(
					'credentials-user-disconnected',
					expect.objectContaining({
						credentialId: credential.id,
						credentialType: credential.type,
						user: expect.objectContaining({ id: viewer.id }),
					}),
				);
			} finally {
				emitSpy.mockRestore();
			}
		});
	});
});
