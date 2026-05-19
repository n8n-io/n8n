import { LicenseState } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { GLOBAL_OWNER_ROLE, GLOBAL_MEMBER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import nock from 'nock';
import { InstanceSettings } from 'n8n-core';

import {
	SYSTEM_RESOLVER_ID,
	SYSTEM_RESOLVER_NAME,
	SYSTEM_RESOLVER_TYPE,
} from '@/modules/dynamic-credentials.ee/constants';
import { DynamicCredentialResolverRepository } from '@/modules/dynamic-credentials.ee/database/repositories/credential-resolver.repository';
import { DynamicCredentialResolverService } from '@/modules/dynamic-credentials.ee/services/credential-resolver.service';
import { N8nResolverSeeder } from '@/modules/dynamic-credentials.ee/services/n8n-resolver-seeder.service';
import { Telemetry } from '@/telemetry';

import { createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

mockInstance(Telemetry);

const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: ['feat:externalSecrets'],
	modules: ['dynamic-credentials'],
});

describe('Credential Resolvers API', () => {
	let owner: User;
	let member: User;
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;
	let service: DynamicCredentialResolverService;
	let repository: DynamicCredentialResolverRepository;
	let isLeaderSpy: jest.SpyInstance;

	beforeAll(async () => {
		owner = await createUser({ role: GLOBAL_OWNER_ROLE });
		member = await createUser({ role: GLOBAL_MEMBER_ROLE });

		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(member);

		service = Container.get(DynamicCredentialResolverService);
		repository = Container.get(DynamicCredentialResolverRepository);

		// Force leader role so N8nResolverSeeder.seed() runs (not no-op for followers).
		// Spy on the getter so the override is scoped to this file and restored in afterAll
		// — otherwise it leaks across the Jest worker and any follower-path test sees `true`.
		isLeaderSpy = jest
			.spyOn(Container.get(InstanceSettings), 'isLeader', 'get')
			.mockReturnValue(true);
	});

	afterAll(() => {
		isLeaderSpy.mockRestore();
	});

	beforeEach(async () => {
		await repository.delete({});
		await Container.get(N8nResolverSeeder).seed();
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
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('GET /credential-resolvers', () => {
		it('should return empty list when only the system resolver exists', async () => {
			const response = await ownerAgent.get('/credential-resolvers').expect(200);
			expect(response.body.data).toEqual([]);
		});

		it('should list all resolvers', async () => {
			// Create resolvers using service
			await service.create({
				name: 'Resolver 1',
				type: 'credential-resolver.oauth2-1.0',
				config: {
					metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
					clientId: 'test-client-id-1',
					clientSecret: 'test-client-secret-1',
					validation: 'oauth2-introspection',
				},
				user: owner,
			});
			await service.create({
				name: 'Resolver 2',
				type: 'credential-resolver.oauth2-1.0',
				config: {
					metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
					clientId: 'test-client-id-2',
					clientSecret: 'test-client-secret-2',
					validation: 'oauth2-introspection',
				},
				user: owner,
			});

			const response = await ownerAgent.get('/credential-resolvers').expect(200);

			expect(response.body.data).toHaveLength(2);
			expect(response.body.data.map((r: { id: string }) => r.id)).not.toContain(SYSTEM_RESOLVER_ID);
			expect(response.body.data[0]).toMatchObject({
				id: expect.any(String),
				name: 'Resolver 1',
				type: 'credential-resolver.oauth2-1.0',
			});
		});

		it('should allow access for members', async () => {
			const response = await memberAgent.get('/credential-resolvers').expect(200);
			expect(response.body.data).toBeInstanceOf(Array);
		});
	});

	describe('GET /credential-resolvers/types', () => {
		it('should return available resolver types', async () => {
			const response = await ownerAgent.get('/credential-resolvers/types').expect(200);

			expect(response.body.data).toBeInstanceOf(Array);
			expect(response.body.data.length).toBeGreaterThan(0);

			// Verify resolver types have required fields
			const resolverType = response.body.data[0];
			expect(resolverType).toMatchObject({
				name: expect.any(String),
				displayName: expect.any(String),
				description: expect.any(String),
				options: expect.any(Array),
			});
		});

		it('should allow access for members', async () => {
			const response = await memberAgent.get('/credential-resolvers/types').expect(200);
			expect(response.body.data).toBeInstanceOf(Array);
		});
	});

	describe('POST /credential-resolvers', () => {
		it('should create a resolver', async () => {
			const payload = {
				name: 'Test Resolver',
				type: 'credential-resolver.oauth2-1.0',
				config: {
					metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
					clientId: 'test-client-id',
					clientSecret: 'test-client-secret',
					validation: 'oauth2-introspection',
				},
			};

			const response = await ownerAgent.post('/credential-resolvers').send(payload).expect(200);

			expect(response.body.data).toMatchObject({
				id: expect.any(String),
				name: 'Test Resolver',
				type: 'credential-resolver.oauth2-1.0',
			});
			expect(response.body.data.decryptedConfig).toMatchObject({
				metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				validation: 'oauth2-introspection',
			});

			// Verify it was actually created (system row + 1 custom)
			const resolvers = await repository.find();
			expect(resolvers).toHaveLength(2);
		});

		it('should reject unknown resolver type', async () => {
			const payload = {
				name: 'Test Resolver',
				type: 'unknown-type',
				config: {},
			};

			const response = await ownerAgent.post('/credential-resolvers').send(payload).expect(400);
			expect(response.body.message).toContain('Unknown resolver type');
		});

		it('should reject access for members', async () => {
			const payload = {
				name: 'Test Resolver',
				type: 'credential-resolver.oauth2-1.0',
				config: {
					metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
					clientId: 'test-client-id',
					clientSecret: 'test-client-secret',
					validation: 'oauth2-introspection',
				},
			};

			await memberAgent.post('/credential-resolvers').send(payload).expect(403);
		});
	});

	describe('GET /resolvers/:id', () => {
		it('should return a specific resolver', async () => {
			const resolver = await service.create({
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

			const response = await ownerAgent.get(`/credential-resolvers/${resolver.id}`).expect(200);

			expect(response.body.data).toMatchObject({
				id: resolver.id,
				name: 'Test Resolver',
				type: 'credential-resolver.oauth2-1.0',
			});
		});

		it('should return 404 for non-existent resolver', async () => {
			await ownerAgent.get('/credential-resolvers/non-existent-id').expect(404);
		});
	});

	describe('PATCH /resolvers/:id', () => {
		it('should update resolver name', async () => {
			const resolver = await service.create({
				name: 'Original Name',
				type: 'credential-resolver.oauth2-1.0',
				config: {
					metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
					clientId: 'test-client-id',
					clientSecret: 'test-client-secret',
					validation: 'oauth2-introspection',
				},
				user: owner,
			});

			const response = await ownerAgent
				.patch(`/credential-resolvers/${resolver.id}`)
				.send({ name: 'Updated Name' })
				.expect(200);

			expect(response.body.data.name).toBe('Updated Name');
		});

		it('should return 404 for non-existent resolver', async () => {
			await ownerAgent
				.patch('/credential-resolvers/non-existent-id')
				.send({ name: 'New Name' })
				.expect(404);
		});
	});

	describe('DELETE /resolvers/:id', () => {
		it('should delete a resolver', async () => {
			const resolver = await service.create({
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

			const response = await ownerAgent.delete(`/credential-resolvers/${resolver.id}`).expect(200);
			expect(response.body.data).toEqual({ success: true });

			// Verify it was actually deleted (system row still present, custom row gone)
			const deleted = await repository.findOneBy({ id: resolver.id });
			expect(deleted).toBeNull();
		});

		it('should return 404 for non-existent resolver', async () => {
			await ownerAgent.delete('/credential-resolvers/non-existent-id').expect(404);
		});
	});

	describe('system resolver', () => {
		it('is seeded with the well-known id and stays out of GET /credential-resolvers', async () => {
			const row = await repository.findOneBy({ id: SYSTEM_RESOLVER_ID });
			expect(row).not.toBeNull();
			expect(row?.name).toBe(SYSTEM_RESOLVER_NAME);
			expect(row?.type).toBe(SYSTEM_RESOLVER_TYPE);

			const response = await ownerAgent.get('/credential-resolvers').expect(200);
			expect(response.body.data.map((r: { id: string }) => r.id)).not.toContain(SYSTEM_RESOLVER_ID);
		});

		it('stays out of GET /credential-resolvers/types', async () => {
			const response = await ownerAgent.get('/credential-resolvers/types').expect(200);
			const typeNames = response.body.data.map((t: { name: string }) => t.name);
			expect(typeNames).not.toContain(SYSTEM_RESOLVER_TYPE);
		});

		it('refuses PATCH against the system id with 400', async () => {
			const response = await ownerAgent
				.patch(`/credential-resolvers/${SYSTEM_RESOLVER_ID}`)
				.send({ name: 'tampered' })
				.expect(400);
			expect(response.body.message).toMatch(/system credential resolver/i);

			const row = await repository.findOneBy({ id: SYSTEM_RESOLVER_ID });
			expect(row?.name).toBe(SYSTEM_RESOLVER_NAME);
		});

		it('refuses DELETE against the system id with 400', async () => {
			await ownerAgent.delete(`/credential-resolvers/${SYSTEM_RESOLVER_ID}`).expect(400);

			const row = await repository.findOneBy({ id: SYSTEM_RESOLVER_ID });
			expect(row).not.toBeNull();
		});

		it('does not duplicate on repeat seed invocations', async () => {
			await Container.get(N8nResolverSeeder).seed();
			await Container.get(N8nResolverSeeder).seed();

			const rows = await repository.find({ where: { id: SYSTEM_RESOLVER_ID } });
			expect(rows).toHaveLength(1);
		});
	});
});
