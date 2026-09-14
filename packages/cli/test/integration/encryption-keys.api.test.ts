import { testDb } from '@n8n/backend-test-utils';
import type { DeploymentKey, User } from '@n8n/db';
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
		createdAt: Date;
		updatedAt: Date;
	}> = {},
) => {
	const { createdAt, updatedAt, ...rest } = overrides;
	const saved = await deploymentKeyRepository.save(
		deploymentKeyRepository.create({
			type: 'data_encryption',
			value: 'seed-value',
			algorithm: 'aes-256-cbc',
			status: 'inactive',
			...rest,
		}),
	);
	if (createdAt || updatedAt) {
		await deploymentKeyRepository.update(saved.id, {
			...(createdAt ? { createdAt } : {}),
			...(updatedAt ? { updatedAt } : {}),
		});
		return await deploymentKeyRepository.findOneByOrFail({ id: saved.id });
	}
	return saved;
};

describe('GET /encryption/keys', () => {
	test('returns { count, items } envelope; items shape includes id/type/algorithm/status/createdAt/updatedAt and never value', async () => {
		const legacy = await seedKey({ algorithm: 'aes-256-cbc', status: 'inactive', value: 'legacy' });
		const active = await seedKey({
			algorithm: 'aes-256-gcm',
			status: 'active',
			value: 'active-secret',
		});

		const response = await ownerAgent.get('/encryption/keys').expect(200);

		expect(response.body.data).toHaveProperty('count', 2);
		expect(response.body.data).toHaveProperty('items');

		const rows = response.body.data.items as Array<Record<string, unknown>>;
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
				updatedAt: expect.any(String),
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

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.items).toHaveLength(1);
		expect(response.body.data.items[0].type).toBe('data_encryption');
	});

	test('returns 400 when type is not in the whitelist', async () => {
		await ownerAgent.get('/encryption/keys?type=other_type').expect(400);
	});

	test('returns 403 for a non-owner user', async () => {
		await memberAgent.get('/encryption/keys').expect(403);
	});

	test('returns empty envelope when no keys exist', async () => {
		const response = await ownerAgent.get('/encryption/keys').expect(200);
		expect(response.body.data).toEqual({ count: 0, items: [] });
	});

	describe('pagination', () => {
		const seedMany = async (count: number) => {
			for (let i = 0; i < count; i++) {
				await seedKey({
					algorithm: 'aes-256-gcm',
					status: i === 0 ? 'active' : 'inactive',
					value: `seed-${i}`,
				});
			}
		};

		test('returns the first page with skip=0&take=10', async () => {
			await seedMany(25);

			const response = await ownerAgent.get('/encryption/keys?skip=0&take=10').expect(200);

			expect(response.body.data.count).toBe(25);
			expect(response.body.data.items).toHaveLength(10);
		});

		test('returns the last page with skip=20&take=10', async () => {
			await seedMany(25);

			const response = await ownerAgent.get('/encryption/keys?skip=20&take=10').expect(200);

			expect(response.body.data.count).toBe(25);
			expect(response.body.data.items).toHaveLength(5);
		});

		test('returns 400 when skip is negative', async () => {
			await ownerAgent.get('/encryption/keys?skip=-1').expect(400);
		});
	});

	describe('sorting', () => {
		const setupThreeKeys = async () => {
			const a = await seedKey({
				algorithm: 'aes-256-cbc',
				status: 'active',
				value: 'a',
				createdAt: new Date('2026-04-15T00:00:00.000Z'),
				updatedAt: new Date('2026-04-25T00:00:00.000Z'),
			});
			const b = await seedKey({
				algorithm: 'aes-256-gcm',
				status: 'inactive',
				value: 'b',
				createdAt: new Date('2026-04-21T00:00:00.000Z'),
				updatedAt: new Date('2026-04-21T00:00:00.000Z'),
			});
			const c = await seedKey({
				algorithm: 'aes-256-gcm',
				status: 'inactive',
				value: 'c',
				createdAt: new Date('2026-04-25T00:00:00.000Z'),
				updatedAt: new Date('2026-04-15T00:00:00.000Z'),
			});
			return { a, b, c };
		};

		test('sortBy=createdAt:asc orders by createdAt ascending', async () => {
			const { a, b, c } = await setupThreeKeys();

			const response = await ownerAgent.get('/encryption/keys?sortBy=createdAt:asc').expect(200);

			const ids = response.body.data.items.map((r: { id: string }) => r.id);
			expect(ids).toEqual([a.id, b.id, c.id]);
		});

		test('sortBy=createdAt:desc orders by createdAt descending', async () => {
			const { a, b, c } = await setupThreeKeys();

			const response = await ownerAgent.get('/encryption/keys?sortBy=createdAt:desc').expect(200);

			const ids = response.body.data.items.map((r: { id: string }) => r.id);
			expect(ids).toEqual([c.id, b.id, a.id]);
		});

		test('sortBy=updatedAt:asc orders by updatedAt ascending', async () => {
			const { a, b, c } = await setupThreeKeys();

			const response = await ownerAgent.get('/encryption/keys?sortBy=updatedAt:asc').expect(200);

			const ids = response.body.data.items.map((r: { id: string }) => r.id);
			expect(ids).toEqual([c.id, b.id, a.id]);
		});

		test('sortBy=status:asc orders status lexicographically (active before inactive)', async () => {
			const { a } = await setupThreeKeys();

			const response = await ownerAgent.get('/encryption/keys?sortBy=status:asc').expect(200);

			const items = response.body.data.items as Array<{ id: string; status: string }>;
			expect(items[0].id).toBe(a.id);
			expect(items[0].status).toBe('active');
			expect(items.slice(1).map((r) => r.status)).toEqual(['inactive', 'inactive']);
		});

		test('returns 400 when sortBy is not in the whitelist', async () => {
			await ownerAgent.get('/encryption/keys?sortBy=foo:asc').expect(400);
		});
	});

	describe('activation date filter', () => {
		const setupRange = async () => {
			const inRange = await seedKey({
				algorithm: 'aes-256-gcm',
				status: 'inactive',
				value: 'in-range',
				createdAt: new Date('2026-04-21T12:00:00.000Z'),
			});
			const before = await seedKey({
				algorithm: 'aes-256-gcm',
				status: 'inactive',
				value: 'before',
				createdAt: new Date('2026-04-15T00:00:00.000Z'),
			});
			const after = await seedKey({
				algorithm: 'aes-256-gcm',
				status: 'inactive',
				value: 'after',
				createdAt: new Date('2026-04-25T00:00:00.000Z'),
			});
			return { inRange, before, after };
		};

		test('returns only keys created in [activatedFrom, activatedTo]', async () => {
			const { inRange } = await setupRange();

			const response = await ownerAgent
				.get(
					'/encryption/keys?activatedFrom=2026-04-20T00:00:00.000Z&activatedTo=2026-04-22T23:59:59.999Z',
				)
				.expect(200);

			expect(response.body.data.count).toBe(1);
			expect(response.body.data.items[0].id).toBe(inRange.id);
		});

		test('returns only keys created at or after activatedFrom when activatedTo is omitted', async () => {
			const { inRange, after } = await setupRange();

			const response = await ownerAgent
				.get('/encryption/keys?activatedFrom=2026-04-20T00:00:00.000Z')
				.expect(200);

			const ids = response.body.data.items.map((r: { id: string }) => r.id);
			expect(ids).toEqual(expect.arrayContaining([inRange.id, after.id]));
			expect(response.body.data.count).toBe(2);
		});

		test('returns only keys created at or before activatedTo when activatedFrom is omitted', async () => {
			const { before, inRange } = await setupRange();

			const response = await ownerAgent
				.get('/encryption/keys?activatedTo=2026-04-22T23:59:59.999Z')
				.expect(200);

			const ids = response.body.data.items.map((r: { id: string }) => r.id);
			expect(ids).toEqual(expect.arrayContaining([before.id, inRange.id]));
			expect(response.body.data.count).toBe(2);
		});

		test('returns 400 when activatedFrom > activatedTo', async () => {
			await ownerAgent
				.get(
					'/encryption/keys?activatedFrom=2026-04-30T00:00:00.000Z&activatedTo=2026-04-01T00:00:00.000Z',
				)
				.expect(400);
		});

		test('returns 400 when activatedFrom is not a valid ISO datetime', async () => {
			await ownerAgent.get('/encryption/keys?activatedFrom=2026-04-21').expect(400);
		});
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
			updatedAt: expect.any(String),
		});
		expect(response.body.data).not.toHaveProperty('value');

		const rows = await deploymentKeyRepository.find({ where: { type: 'data_encryption' } });
		expect(rows).toHaveLength(2);

		const active = rows.filter((r: DeploymentKey) => r.status === 'active');
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
