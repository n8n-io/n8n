import type { Logger } from '@n8n/backend-common';
import { CacheService, UrlService } from '@n8n/backend-services';
import { testDb, testModules } from '@n8n/backend-test-utils';
import type { InstanceType } from '@n8n/constants';
import { Container } from '@n8n/di';
import type { TrustedSourceConfigInput } from '@n8n/inbound-auth';
import { DataSource, type Repository } from '@n8n/typeorm';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { TrustedSourceEntity } from '@/modules/inbound-auth-core/database/entities/trusted-source.entity';
import { SystemTrustedSourceSeeder } from '@/modules/inbound-auth-core/system-trusted-source.seeder';
import {
	SystemTrustedSourceModificationError,
	TrustedSourceDbStore,
} from '@/modules/inbound-auth-core/trusted-source.store';

const ID = 'n8n-internal';
const MOVED_URL = 'https://moved.n8n.example';

let store: TrustedSourceDbStore;
let cacheService: CacheService;
let rows: Repository<TrustedSourceEntity>;
let baseUrl: string;

const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });

/** A seeder on an `instanceType` process whose instance base URL is `url`. */
const seederFor = (url = baseUrl, instanceType: InstanceType = 'main') =>
	new SystemTrustedSourceSeeder(
		store,
		mock<UrlService>({ getInstanceBaseUrl: () => url }),
		mock<InstanceSettings>({ instanceType }),
		logger,
	);

const systemRow = async () => await rows.findOneByOrFail({ id: ID });

const adminConfig: TrustedSourceConfigInput = {
	version: 1,
	authentication: { type: 'oauth2' },
	surfaces: { 'public-api': {} },
};

beforeAll(async () => {
	await testModules.loadModules(['inbound-auth-core']);
	await testDb.init();

	store = Container.get(TrustedSourceDbStore);
	cacheService = Container.get(CacheService);
	rows = Container.get(DataSource).getRepository(TrustedSourceEntity);
	baseUrl = Container.get(UrlService).getInstanceBaseUrl();
	await cacheService.init();
});

beforeEach(async () => {
	await testDb.truncate(['TrustedSourceIdentityEntity', 'TrustedSourceEntity']);
	await cacheService.reset();
	vi.clearAllMocks();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('SystemTrustedSourceSeeder (integration)', () => {
	it('creates the system source on an empty database, readable by issuer at once', async () => {
		// Prime the list, so the test fails if seeding does not invalidate it.
		expect(await store.listBySurface('instance-mcp')).toEqual([]);

		await seederFor().seed();

		const all = await rows.find();
		expect(all).toHaveLength(1);
		expect(all[0]).toMatchObject({
			id: ID,
			name: 'n8n',
			type: 'oauth2',
			issuer: baseUrl,
			managedBy: 'system',
			status: 'unchecked',
			metadata: null,
			lastCheckedAt: null,
			configVersion: 1,
		});
		expect(all[0].config).not.toContain('local-keystore');
		expect(await store.getByIssuer(baseUrl)).toMatchObject({
			id: ID,
			managedBy: 'system',
			config: {
				authentication: { keys: { kind: 'local-keystore' }, client: { kind: 'virtual' } },
				surfaces: { 'public-api': {}, 'instance-mcp': {}, trigger: {} },
				identity: { subject: 'n8n-user-id' },
			},
		});
		expect((await store.listBySurface('instance-mcp')).map((source) => source.id)).toEqual([ID]);
		expect(logger.error).not.toHaveBeenCalled();
	});

	it('leaves the row untouched when it seeds again', async () => {
		await seederFor().seed();
		const before = await systemRow();

		await seederFor().seed();

		expect(await rows.count()).toBe(1);
		expect(await systemRow()).toEqual(before);
	});

	it('creates exactly one row when several processes seed at once', async () => {
		await Promise.all([seederFor(), seederFor(), seederFor()].map(async (s) => await s.seed()));

		expect(await rows.count()).toBe(1);
		expect(await systemRow()).toMatchObject({ issuer: baseUrl, managedBy: 'system' });
		expect(logger.error).not.toHaveBeenCalled();
	});

	it('moves only the issuer when the instance base URL changes', async () => {
		await seederFor().seed();
		// Backdate, so the bump is visible on a database clock with whole-second precision.
		await rows.update({ id: ID }, { updatedAt: new Date('2026-01-01T00:00:00.000Z') });
		const before = await systemRow();
		// Warm every cache entry the move must invalidate.
		expect(await store.getById(ID)).toMatchObject({ issuer: baseUrl });
		expect(await store.getByIssuer(baseUrl)).toMatchObject({ id: ID });
		expect(await store.getByIssuer(MOVED_URL)).toBeUndefined();

		await seederFor(MOVED_URL).seed();

		const after = await systemRow();
		expect(after.issuer).toBe(MOVED_URL);
		expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
		expect({ ...after, issuer: before.issuer, updatedAt: before.updatedAt }).toEqual(before);
		expect(await rows.count()).toBe(1);

		expect(await store.getByIssuer(baseUrl)).toBeUndefined();
		expect(await store.getByIssuer(MOVED_URL)).toMatchObject({ id: ID, issuer: MOVED_URL });
		expect(await store.getById(ID)).toMatchObject({ issuer: MOVED_URL });
	});

	it.each<InstanceType>(['webhook', 'worker'])(
		'leaves the issuer to main when a %s instance resolves another base URL',
		async (instanceType) => {
			await seederFor().seed();
			const before = await systemRow();

			await seederFor(MOVED_URL, instanceType).seed();

			expect(await systemRow()).toEqual(before);
			expect(await rows.count()).toBe(1);
			expect(logger.error).not.toHaveBeenCalled();
		},
	);

	it('lets main move the issuer that a webhook instance seeded first', async () => {
		await seederFor(MOVED_URL, 'webhook').seed();
		expect(await systemRow()).toMatchObject({ issuer: MOVED_URL });

		await seederFor(baseUrl, 'main').seed();

		expect(await systemRow()).toMatchObject({ issuer: baseUrl });
		expect(await rows.count()).toBe(1);
	});

	it.each<[string, (store: TrustedSourceDbStore) => Promise<void>]>([
		['rename it', async (s) => await s.update(ID, { name: 'Renamed' })],
		[
			'change its config',
			async (s) =>
				await s.update(ID, {
					config: {
						version: 1,
						authentication: { type: 'oauth2', keys: { kind: 'local-keystore' } },
						surfaces: { 'public-api': {} },
						identity: { subject: 'binding' },
					},
				}),
		],
		['change its issuer', async (s) => await s.update(ID, { issuer: MOVED_URL })],
		['delete it', async (s) => await s.delete(ID)],
	])('refuses an attempt to %s', async (_, attempt) => {
		await seederFor().seed();
		const before = await systemRow();

		await expect(attempt(store)).rejects.toThrow(SystemTrustedSourceModificationError);

		expect(await systemRow()).toEqual(before);
	});

	describe('an admin source in the way', () => {
		// Thunks: `baseUrl` is only known once `beforeAll` has run.
		it.each<[string, () => { name: string; issuer: string }]>([
			['the name', () => ({ name: 'n8n', issuer: 'https://idp.example' })],
			['the issuer', () => ({ name: 'Acme', issuer: baseUrl })],
		])('logs an error and creates nothing when it holds %s', async (_, admin) => {
			await store.create({ ...admin(), config: adminConfig });

			await expect(seederFor().seed()).resolves.toBeUndefined();

			expect(await rows.findOneBy({ id: ID })).toBeNull();
			expect(await rows.count()).toBe(1);
			expect(logger.error).toHaveBeenCalledTimes(1);
		});

		it('keeps the old issuer when it holds the new base URL', async () => {
			await seederFor().seed();
			const before = await systemRow();
			await store.create({ name: 'Acme', issuer: MOVED_URL, config: adminConfig });

			await expect(seederFor(MOVED_URL).seed()).resolves.toBeUndefined();

			expect(await systemRow()).toEqual(before);
			expect(logger.error).toHaveBeenCalledTimes(1);
		});
	});
});
