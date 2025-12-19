import { LicenseState } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { GLOBAL_OWNER_ROLE, GLOBAL_MEMBER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { DynamicCredentialResolverRepository } from '@/modules/dynamic-credentials.ee/database/repositories/credential-resolver.repository';
import { DynamicCredentialResolverService } from '@/modules/dynamic-credentials.ee/services/credential-resolver.service';
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

	beforeAll(async () => {
		owner = await createUser({ role: GLOBAL_OWNER_ROLE });
		member = await createUser({ role: GLOBAL_MEMBER_ROLE });

		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(member);

		service = Container.get(DynamicCredentialResolverService);
		repository = Container.get(DynamicCredentialResolverRepository);
	});

	beforeEach(async () => {
		await repository.delete({});
	});

	describe('GET /credential-resolvers', () => {
		it('should return empty list when no resolvers exist', async () => {
			const response = await ownerAgent.get('/credential-resolvers').expect(200);
			expect(response.body.data).toEqual([]);
		});

		it('should list all resolvers', async () => {
			// Create resolvers using service
			await service.create({
				name: 'Resolver 1',
				type: 'credential-resolver.stub-1.0',
				config: { prefix: 'test1-' },
			});
			await service.create({
				name: 'Resolver 2',
				type: 'credential-resolver.stub-1.0',
				config: { prefix: 'test2-' },
			});

			const response = await ownerAgent.get('/credential-resolvers').expect(200);

			expect(response.body.data).toHaveLength(2);
			expect(response.body.data[0]).toMatchObject({
				id: expect.any(String),
				name: 'Resolver 1',
				type: 'credential-resolver.stub-1.0',
			});
		});

		it('should reject access for members', async () => {
			await memberAgent.get('/credential-resolvers').expect(403);
		});
	});

	describe('GET /credential-resolvers/types', () => {
		it('should return available resolver types', async () => {
			const response = await ownerAgent.get('/credential-resolvers/types').expect(200);

			expect(response.body.data).toBeInstanceOf(Array);
			expect(response.body.data.length).toBeGreaterThan(0);

			// Verify the stub resolver is present
			const stubResolver = response.body.data.find(
				(type: { name: string }) => type.name === 'credential-resolver.stub-1.0',
			);
			expect(stubResolver).toBeDefined();
			expect(stubResolver).toMatchObject({
				name: 'credential-resolver.stub-1.0',
				displayName: 'Stub Resolver',
				description: 'A stub credential resolver for testing purposes',
				options: expect.any(Array),
			});
		});

		it('should reject access for members', async () => {
			await memberAgent.get('/credential-resolvers/types').expect(403);
		});
	});

	describe('POST /credential-resolvers', () => {
		it('should create a resolver', async () => {
			const payload = {
				name: 'Test Resolver',
				type: 'credential-resolver.stub-1.0',
				config: { prefix: 'test-' },
			};

			const response = await ownerAgent.post('/credential-resolvers').send(payload).expect(200);

			expect(response.body.data).toMatchObject({
				id: expect.any(String),
				name: 'Test Resolver',
				type: 'credential-resolver.stub-1.0',
			});
			expect(response.body.data.decryptedConfig).toEqual({ prefix: 'test-' });

			// Verify it was actually created
			const resolvers = await repository.find();
			expect(resolvers).toHaveLength(1);
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
				type: 'credential-resolver.stub-1.0',
				config: { prefix: 'test-' },
			};

			await memberAgent.post('/credential-resolvers').send(payload).expect(403);
		});
	});

	describe('GET /resolvers/:id', () => {
		it('should return a specific resolver', async () => {
			const resolver = await service.create({
				name: 'Test Resolver',
				type: 'credential-resolver.stub-1.0',
				config: { prefix: 'test-' },
			});

			const response = await ownerAgent.get(`/credential-resolvers/${resolver.id}`).expect(200);

			expect(response.body.data).toMatchObject({
				id: resolver.id,
				name: 'Test Resolver',
				type: 'credential-resolver.stub-1.0',
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
				type: 'credential-resolver.stub-1.0',
				config: { prefix: 'test-' },
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
				type: 'credential-resolver.stub-1.0',
				config: { prefix: 'test-' },
			});

			const response = await ownerAgent.delete(`/credential-resolvers/${resolver.id}`).expect(200);
			expect(response.body.data).toEqual({ success: true });

			// Verify it was actually deleted
			const remaining = await repository.find();
			expect(remaining).toHaveLength(0);
		});

		it('should return 404 for non-existent resolver', async () => {
			await ownerAgent.delete('/credential-resolvers/non-existent-id').expect(404);
		});
	});
});
