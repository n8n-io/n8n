import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember, createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

const testServer = utils.setupTestServer({ endpointGroups: ['encryption-keys'] });

let deploymentKeyRepository: DeploymentKeyRepository;
let owner: User;
let ownerAgent: SuperAgentTest;
let member: User;
let memberAgent: SuperAgentTest;

beforeAll(() => {
	deploymentKeyRepository = Container.get(DeploymentKeyRepository);
});

beforeEach(async () => {
	await testDb.truncate(['User', 'DeploymentKey']);
	owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);
	member = await createMember();
	memberAgent = testServer.authAgentFor(member);
});

const seedKey = async (
	overrides: Partial<{
		type: string;
		algorithm: string | null;
		status: string;
		value: string;
	}> = {},
) =>
	await deploymentKeyRepository.save(
		deploymentKeyRepository.create({
			type: 'data_encryption',
			value: 'seed-value',
			algorithm: 'aes-256-cbc',
			status: 'inactive',
			...overrides,
		}),
	);

describe('GET /encryption/keys', () => {
	test('returns all keys for owner with id/type/algorithm/status/createdAt (never value)', async () => {
		const legacy = await seedKey({ algorithm: 'aes-256-cbc', status: 'inactive', value: 'legacy' });
		const active = await seedKey({
			algorithm: 'aes-256-gcm',
			status: 'active',
			value: 'active-secret',
		});

		const response = await ownerAgent.get('/encryption/keys').expect(200);

		const rows = response.body.data as Array<Record<string, unknown>>;
		expect(rows).toHaveLength(2);

		const ids = rows.map((r) => r.id);
		expect(ids).toEqual(expect.arrayContaining([legacy.id, active.id]));

		for (const row of rows) {
			expect(row).toEqual({
				id: expect.any(String),
				type: 'data_encryption',
				algorithm: expect.any(String),
				status: expect.any(String),
				createdAt: expect.any(String),
			});
			expect(row).not.toHaveProperty('value');
		}

		expect(JSON.stringify(response.body)).not.toContain('active-secret');
		expect(JSON.stringify(response.body)).not.toContain('legacy');
	});

	test('filters by type query param', async () => {
		await seedKey({ type: 'data_encryption', algorithm: 'aes-256-gcm', status: 'active' });
		await seedKey({ type: 'other_type', algorithm: null, status: 'active' });

		const response = await ownerAgent.get('/encryption/keys?type=data_encryption').expect(200);

		const rows = response.body.data as Array<Record<string, unknown>>;
		expect(rows).toHaveLength(1);
		expect(rows[0].type).toBe('data_encryption');
	});

	test('returns 403 for a non-owner user', async () => {
		await memberAgent.get('/encryption/keys').expect(403);
	});

	test('returns empty list when no keys exist', async () => {
		const response = await ownerAgent.get('/encryption/keys').expect(200);
		expect(response.body.data).toEqual([]);
	});
});

describe('POST /encryption/keys', () => {
	test('creates a new active key and deactivates the previous active key', async () => {
		const previousActive = await seedKey({
			algorithm: 'aes-256-cbc',
			status: 'active',
			value: 'previous',
		});

		const response = await ownerAgent
			.post('/encryption/keys')
			.send({ type: 'data_encryption' })
			.expect(200);

		expect(response.body.data).toEqual({
			id: expect.any(String),
			type: 'data_encryption',
			algorithm: 'aes-256-gcm',
			status: 'active',
			createdAt: expect.any(String),
		});
		expect(response.body.data).not.toHaveProperty('value');

		const rows = await deploymentKeyRepository.find({ where: { type: 'data_encryption' } });
		expect(rows).toHaveLength(2);

		const active = rows.filter((r) => r.status === 'active');
		expect(active).toHaveLength(1);
		expect(active[0].algorithm).toBe('aes-256-gcm');
		expect(typeof active[0].value).toBe('string');
		expect(active[0].value.length).toBeGreaterThan(0);
		expect(JSON.stringify(response.body)).not.toContain(active[0].value);

		const reloadedPrevious = await deploymentKeyRepository.findOneByOrFail({
			id: previousActive.id,
		});
		expect(reloadedPrevious.status).toBe('inactive');
	});

	test('returns 400 when type is not data_encryption', async () => {
		await ownerAgent.post('/encryption/keys').send({ type: 'other_type' }).expect(400);
	});

	test('returns 400 when body is missing type', async () => {
		await ownerAgent.post('/encryption/keys').send({}).expect(400);
	});

	test('returns 403 for a non-owner user', async () => {
		await memberAgent.post('/encryption/keys').send({ type: 'data_encryption' }).expect(403);

		const rows = await deploymentKeyRepository.find();
		expect(rows).toHaveLength(0);
	});
});
