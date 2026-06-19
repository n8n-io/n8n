import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import type {
	TrustedKeyData,
	TrustedKeySourceStatus,
	TrustedKeySourceType,
} from '@/modules/token-exchange/token-exchange.schemas';
import { TrustedKeyRepository } from '@/modules/token-exchange/database/repositories/trusted-key.repository';
import { TrustedKeySourceRepository } from '@/modules/token-exchange/database/repositories/trusted-key-source.repository';

const makeSource = (
	overrides: Partial<{
		id: string;
		type: TrustedKeySourceType;
		config: string;
		status: TrustedKeySourceStatus;
		lastError: string | null;
		lastRefreshedAt: Date | null;
	}> = {},
) => ({
	id: 'source-1',
	type: 'static' as const,
	config: JSON.stringify({ kid: 'key-1', algorithms: ['RS256'] }),
	status: 'pending' as const,
	lastError: null,
	lastRefreshedAt: null,
	...overrides,
});

const makeKeyData = (overrides: Partial<TrustedKeyData> = {}): TrustedKeyData => ({
	algorithms: ['RS256'],
	keyMaterial: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
	issuer: 'https://issuer.example.com',
	...overrides,
});

const serializeKeyData = (overrides: Partial<TrustedKeyData> = {}): string =>
	JSON.stringify(makeKeyData(overrides));

describe('TrustedKeySourceRepository & TrustedKeyRepository', () => {
	let sourceRepo: TrustedKeySourceRepository;
	let keyRepo: TrustedKeyRepository;

	beforeAll(async () => {
		await testModules.loadModules(['token-exchange']);
		await testDb.init();
		sourceRepo = Container.get(TrustedKeySourceRepository);
		keyRepo = Container.get(TrustedKeyRepository);
	});

	afterEach(async () => {
		// Child table first to respect FK constraints
		await testDb.truncate(['TrustedKeyEntity', 'TrustedKeySourceEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('TrustedKeySourceRepository', () => {
		it('should insert and retrieve a source', async () => {
			const source = makeSource();
			await sourceRepo.save(sourceRepo.create(source));

			const found = await sourceRepo.findOneBy({ id: source.id });

			expect(found).not.toBeNull();
			expect(found!.id).toBe('source-1');
			expect(found!.type).toBe('static');
			expect(found!.status).toBe('pending');
			expect(found!.config).toBe(source.config);
		});

		it('should update source status and lastError', async () => {
			await sourceRepo.save(sourceRepo.create(makeSource()));

			await sourceRepo.update('source-1', {
				status: 'error',
				lastError: 'connection refused',
				lastRefreshedAt: new Date(),
			});

			const found = await sourceRepo.findOneBy({ id: 'source-1' });
			expect(found!.status).toBe('error');
			expect(found!.lastError).toBe('connection refused');
			expect(found!.lastRefreshedAt).not.toBeNull();
		});

		it('should update source status to healthy', async () => {
			await sourceRepo.save(sourceRepo.create(makeSource()));

			await sourceRepo.update('source-1', {
				status: 'healthy',
				lastError: null,
				lastRefreshedAt: new Date(),
			});

			const found = await sourceRepo.findOneBy({ id: 'source-1' });
			expect(found!.status).toBe('healthy');
			expect(found!.lastError).toBeNull();
		});

		it('should return all sources', async () => {
			await sourceRepo.save([
				sourceRepo.create(makeSource({ id: 'src-a' })),
				sourceRepo.create(makeSource({ id: 'src-b', type: 'jwks' })),
			]);

			const all = await sourceRepo.find();
			expect(all).toHaveLength(2);
		});
	});

	describe('TrustedKeyRepository', () => {
		it('should insert a key and retrieve it by source and kid', async () => {
			await sourceRepo.save(sourceRepo.create(makeSource()));

			await keyRepo.save(
				keyRepo.create({
					kid: 'key-1',
					sourceId: 'source-1',
					data: serializeKeyData(),
					createdAt: new Date(),
				}),
			);

			const found = await keyRepo.findBySourceAndKid('source-1', 'key-1');

			expect(found).not.toBeNull();
			expect(found!.kid).toBe('key-1');
			expect(found!.sourceId).toBe('source-1');

			const data = JSON.parse(found!.data) as TrustedKeyData;
			expect(data.algorithms).toEqual(['RS256']);
			expect(data.keyMaterial).toContain('BEGIN PUBLIC KEY');
		});

		it('should return null for unknown kid', async () => {
			const found = await keyRepo.findBySourceAndKid('source-1', 'nonexistent');
			expect(found).toBeNull();
		});

		it('should support multiple keys per source', async () => {
			await sourceRepo.save(sourceRepo.create(makeSource()));

			await keyRepo.save([
				keyRepo.create({
					kid: 'key-a',
					sourceId: 'source-1',
					data: serializeKeyData(),
					createdAt: new Date(),
				}),
				keyRepo.create({
					kid: 'key-b',
					sourceId: 'source-1',
					data: serializeKeyData({ issuer: 'https://other.example.com' }),
					createdAt: new Date(),
				}),
			]);

			const keys = await keyRepo.findBy({ sourceId: 'source-1' });
			expect(keys).toHaveLength(2);
		});

		it('should enforce uniqueness within the same source', async () => {
			await sourceRepo.save(sourceRepo.create(makeSource()));

			await keyRepo.save(
				keyRepo.create({
					kid: 'dup-kid',
					sourceId: 'source-1',
					data: serializeKeyData(),
					createdAt: new Date(),
				}),
			);

			await expect(
				keyRepo.insert({
					kid: 'dup-kid',
					sourceId: 'source-1',
					data: serializeKeyData({ issuer: 'https://other.example.com' }),
					createdAt: new Date(),
				}),
			).rejects.toThrow();
		});

		it('should allow the same kid across different sources', async () => {
			await sourceRepo.save([
				sourceRepo.create(makeSource({ id: 'src-a' })),
				sourceRepo.create(makeSource({ id: 'src-b' })),
			]);

			await keyRepo.save([
				keyRepo.create({
					kid: 'shared-kid',
					sourceId: 'src-a',
					data: serializeKeyData({ issuer: 'https://provider-a.example.com' }),
					createdAt: new Date(),
				}),
				keyRepo.create({
					kid: 'shared-kid',
					sourceId: 'src-b',
					data: serializeKeyData({ issuer: 'https://provider-b.example.com' }),
					createdAt: new Date(),
				}),
			]);

			const fromA = await keyRepo.findBySourceAndKid('src-a', 'shared-kid');
			const fromB = await keyRepo.findBySourceAndKid('src-b', 'shared-kid');

			expect(fromA).not.toBeNull();
			expect(fromB).not.toBeNull();

			const dataA = JSON.parse(fromA!.data) as TrustedKeyData;
			const dataB = JSON.parse(fromB!.data) as TrustedKeyData;
			expect(dataA.issuer).toBe('https://provider-a.example.com');
			expect(dataB.issuer).toBe('https://provider-b.example.com');
		});

		it('should return all keys matching a kid via findAllByKid', async () => {
			await sourceRepo.save([
				sourceRepo.create(makeSource({ id: 'src-a' })),
				sourceRepo.create(makeSource({ id: 'src-b' })),
			]);

			await keyRepo.save([
				keyRepo.create({
					kid: 'shared-kid',
					sourceId: 'src-a',
					data: serializeKeyData({ issuer: 'https://provider-a.example.com' }),
					createdAt: new Date(),
				}),
				keyRepo.create({
					kid: 'shared-kid',
					sourceId: 'src-b',
					data: serializeKeyData({ issuer: 'https://provider-b.example.com' }),
					createdAt: new Date(),
				}),
				keyRepo.create({
					kid: 'other-kid',
					sourceId: 'src-a',
					data: serializeKeyData(),
					createdAt: new Date(),
				}),
			]);

			const matches = await keyRepo.findAllByKid('shared-kid');
			expect(matches).toHaveLength(2);
		});

		it('should reject key with non-existent sourceId', async () => {
			await expect(
				keyRepo.insert({
					kid: 'orphan-key',
					sourceId: 'does-not-exist',
					data: serializeKeyData(),
					createdAt: new Date(),
				}),
			).rejects.toThrow();
		});

		it('should round-trip all optional TrustedKeyData fields', async () => {
			await sourceRepo.save(sourceRepo.create(makeSource()));

			const fullData = serializeKeyData({
				expectedAudience: 'https://n8n.example.com',
				allowedRoles: ['admin', 'editor'],
				expiresAt: '2026-12-31T23:59:59.000Z',
			});

			await keyRepo.save(
				keyRepo.create({
					kid: 'full-key',
					sourceId: 'source-1',
					data: fullData,
					createdAt: new Date(),
				}),
			);

			const found = await keyRepo.findBySourceAndKid('source-1', 'full-key');

			expect(found).not.toBeNull();
			const data = JSON.parse(found!.data) as TrustedKeyData;
			expect(data.expectedAudience).toBe('https://n8n.example.com');
			expect(data.allowedRoles).toEqual(['admin', 'editor']);
			expect(data.expiresAt).toBe('2026-12-31T23:59:59.000Z');
		});

		it('should persist and return createdAt as a Date', async () => {
			await sourceRepo.save(sourceRepo.create(makeSource()));

			const now = new Date();
			await keyRepo.save(
				keyRepo.create({
					kid: 'ts-key',
					sourceId: 'source-1',
					data: serializeKeyData(),
					createdAt: now,
				}),
			);

			const found = await keyRepo.findBySourceAndKid('source-1', 'ts-key');

			expect(found).not.toBeNull();
			expect(found!.createdAt).toBeInstanceOf(Date);
			expect(found!.createdAt.getTime()).toBe(now.getTime());
		});
	});

	describe('FK CASCADE', () => {
		it('should delete keys when source is deleted', async () => {
			await sourceRepo.save(sourceRepo.create(makeSource()));

			await keyRepo.save([
				keyRepo.create({
					kid: 'cascade-1',
					sourceId: 'source-1',
					data: serializeKeyData(),
					createdAt: new Date(),
				}),
				keyRepo.create({
					kid: 'cascade-2',
					sourceId: 'source-1',
					data: serializeKeyData(),
					createdAt: new Date(),
				}),
			]);

			expect(await keyRepo.count()).toBe(2);

			await sourceRepo.delete('source-1');

			expect(await keyRepo.count()).toBe(0);
		});

		it('should not affect keys from other sources', async () => {
			await sourceRepo.save([
				sourceRepo.create(makeSource({ id: 'src-keep' })),
				sourceRepo.create(makeSource({ id: 'src-delete' })),
			]);

			await keyRepo.save([
				keyRepo.create({
					kid: 'key-keep',
					sourceId: 'src-keep',
					data: serializeKeyData(),
					createdAt: new Date(),
				}),
				keyRepo.create({
					kid: 'key-delete',
					sourceId: 'src-delete',
					data: serializeKeyData(),
					createdAt: new Date(),
				}),
			]);

			await sourceRepo.delete('src-delete');

			expect(await keyRepo.count()).toBe(1);
			expect(await keyRepo.findBySourceAndKid('src-keep', 'key-keep')).not.toBeNull();
			expect(await keyRepo.findBySourceAndKid('src-delete', 'key-delete')).toBeNull();
		});
	});
});
