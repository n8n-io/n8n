import { Logger } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import {
	trustedSourceConfigSchemaFor,
	type SurfaceId,
	type TrustedSource,
	type TrustedSourceConfigInput,
	type TrustedSourceMetadata,
} from '@n8n/inbound-auth';
import { DataSource, type Repository } from '@n8n/typeorm';
import { Cipher } from 'n8n-core';

import { TrustedSourceIdentityEntity } from '@/modules/inbound-auth-core/database/entities/trusted-source-identity.entity';
import { TrustedSourceEntity } from '@/modules/inbound-auth-core/database/entities/trusted-source.entity';
import {
	SystemTrustedSourceModificationError,
	TrustedSourceDbStore,
} from '@/modules/inbound-auth-core/trusted-source.store';
import { CacheService } from '@n8n/backend-services';

import { createOwner } from '../shared/db/users';

let store: TrustedSourceDbStore;
let cacheService: CacheService;
let cipher: Cipher;
/** Direct table access, so the tests do not depend on the repository under construction. */
let rows: Repository<TrustedSourceEntity>;
let bindings: Repository<TrustedSourceIdentityEntity>;

const minimalConfig = (
	surfaces: Partial<Record<SurfaceId, { audiences?: string[] }>> = { 'public-api': {} },
): TrustedSourceConfigInput => ({
	version: 1,
	authentication: { type: 'oauth2' },
	surfaces,
});

const ids = (sources: TrustedSource[]) => sources.map((source) => source.id).sort();

let seeded = 0;

async function seedRow(overrides: Partial<TrustedSourceEntity> = {}) {
	seeded += 1;
	const config = trustedSourceConfigSchemaFor(overrides.managedBy ?? 'admin').parse(
		minimalConfig(),
	);
	return await rows.save(
		rows.create({
			name: `source-${seeded}`,
			type: 'oauth2',
			issuer: `https://issuer-${seeded}.example.com`,
			managedBy: 'admin',
			status: 'unchecked',
			lastError: null,
			lastCheckedAt: null,
			configVersion: 1,
			config: await cipher.encryptV2(config),
			metadata: null,
			discoveryClaimedAt: null,
			...overrides,
		}),
	);
}

async function loadSource(id: string): Promise<TrustedSource> {
	const source = await store.getById(id);
	if (!source) throw new Error(`source ${id} did not load`);
	return source;
}

async function encryptedAdminConfig(
	surfaces: Partial<Record<SurfaceId, { audiences?: string[] }>>,
) {
	return await cipher.encryptV2(
		trustedSourceConfigSchemaFor('admin').parse(minimalConfig(surfaces)),
	);
}

beforeAll(async () => {
	await testModules.loadModules(['inbound-auth-core']);
	await testDb.init();

	store = Container.get(TrustedSourceDbStore);
	cacheService = Container.get(CacheService);
	cipher = Container.get(Cipher);
	rows = Container.get(DataSource).getRepository(TrustedSourceEntity);
	bindings = Container.get(DataSource).getRepository(TrustedSourceIdentityEntity);
	// `reset()` assumes an initialised backend.
	await cacheService.init();
});

beforeEach(async () => {
	await testDb.truncate(['TrustedSourceIdentityEntity', 'TrustedSourceEntity', 'User']);
	await cacheService.reset();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('TrustedSourceStore (integration)', () => {
	describe('create', () => {
		it('persists an encrypted, defaulted admin source and returns the runtime shape', async () => {
			// Prime the list, so the test fails if `create` stops invalidating it.
			expect(await store.listBySurface('public-api')).toEqual([]);

			const source = await store.create({
				name: 'Acme',
				issuer: 'https://acme.example.com',
				config: minimalConfig(),
			});

			const row = await rows.findOneByOrFail({ id: source.id });
			expect(row).toMatchObject({
				name: 'Acme',
				issuer: 'https://acme.example.com',
				type: 'oauth2',
				managedBy: 'admin',
				status: 'unchecked',
				configVersion: 1,
			});
			expect(row.config).not.toContain('oauth2');
			expect(JSON.parse(await cipher.decryptV2(row.config))).toMatchObject({
				version: 1,
				authentication: { type: 'oauth2', clockSkewSeconds: 60 },
				identity: { subject: 'binding' },
			});

			expect(source).toMatchObject({
				id: row.id,
				name: 'Acme',
				managedBy: 'admin',
				status: 'unchecked',
				lastError: null,
				lastCheckedAt: null,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
			});
			expect(source.config.authentication.clockSkewSeconds).toBe(60);
			expect(ids(await store.listBySurface('public-api'))).toEqual([source.id]);
		});

		it('refuses a system-only field on an admin source and inserts nothing', async () => {
			await expect(
				store.create({
					name: 'Acme',
					issuer: 'https://acme.example.com',
					config: { ...minimalConfig(), identity: { subject: 'n8n-user-id' } },
				}),
			).rejects.toThrow(/only allowed on system-managed sources/);

			expect(await rows.count()).toBe(0);
		});

		it('keeps the client secret inside the encrypted document', async () => {
			const source = await store.create({
				name: 'Acme',
				issuer: 'https://acme.example.com',
				config: {
					...minimalConfig(),
					authentication: {
						type: 'oauth2',
						client: { kind: 'registered', clientId: 'n8n', clientSecret: 's3cret' },
					},
				},
			});

			const row = await rows.findOneByOrFail({ id: source.id });
			expect(row.config).not.toContain('s3cret');

			const fetched = await store.getById(source.id);
			expect(fetched?.config.authentication.client).toEqual({
				kind: 'registered',
				clientId: 'n8n',
				clientSecret: 's3cret',
			});
		});
	});

	describe('reads', () => {
		it('getById and getByIssuer read through the cache and return undefined on a miss', async () => {
			const row = await seedRow({ name: 'Acme', issuer: 'https://acme.example.com' });

			expect(await store.getById(row.id)).toMatchObject({
				id: row.id,
				name: 'Acme',
				config: { version: 1 },
			});
			expect(await store.getByIssuer('https://acme.example.com')).toMatchObject({ id: row.id });
			expect(await store.getById('missing')).toBeUndefined();
			expect(await store.getByIssuer('https://nobody.example.com')).toBeUndefined();

			// A change behind the store's back is invisible until the entry expires or is invalidated.
			await rows.update({ id: row.id }, { name: 'Renamed' });
			expect((await store.getById(row.id))?.name).toBe('Acme');
			await cacheService.reset();
			expect((await store.getById(row.id))?.name).toBe('Renamed');
		});

		it('does not cache an issuer miss', async () => {
			expect(await store.getByIssuer('https://late.example.com')).toBeUndefined();

			const row = await seedRow({ issuer: 'https://late.example.com' });

			expect(await store.getByIssuer('https://late.example.com')).toMatchObject({ id: row.id });
		});

		it('listBySurface returns the sources that register the surface', async () => {
			const publicApi = await seedRow({ config: await encryptedAdminConfig({ 'public-api': {} }) });
			const mcp = await seedRow({ config: await encryptedAdminConfig({ 'instance-mcp': {} }) });
			const both = await seedRow({
				config: await encryptedAdminConfig({ 'public-api': {}, 'instance-mcp': {} }),
			});

			expect(ids(await store.listBySurface('public-api'))).toEqual([publicApi.id, both.id].sort());
			expect(ids(await store.listBySurface('instance-mcp'))).toEqual([mcp.id, both.id].sort());
			expect(await store.listBySurface('trigger')).toEqual([]);
		});

		it.each<[string, () => Promise<string>]>([
			['ciphertext that does not decrypt', async () => 'garbage'],
			['a document that is not JSON', async () => await cipher.encryptV2('not-json')],
			['a document that fails the schema', async () => await cipher.encryptV2({ version: 1 })],
			[
				'an admin row that holds a system-only field',
				async () =>
					await cipher.encryptV2(
						trustedSourceConfigSchemaFor('system').parse({
							...minimalConfig(),
							authentication: { type: 'oauth2', keys: { kind: 'local-keystore' } },
						}),
					),
			],
		])('skips and logs a row with %s without writing to it', async (_, ciphertext) => {
			const warn = vi.spyOn(Container.get(Logger), 'warn');
			const bad = await seedRow({ config: await ciphertext() });
			const good = await seedRow();

			expect(await store.getById(bad.id)).toBeUndefined();
			expect(await store.getByIssuer(bad.issuer)).toBeUndefined();
			expect(ids(await store.listBySurface('public-api'))).toEqual([good.id]);

			// One warning per read path; the good row never warns.
			expect(warn).toHaveBeenCalledTimes(3);
			expect(warn).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ id: bad.id }),
			);
			expect(await rows.findOneByOrFail({ id: bad.id })).toMatchObject({
				config: bad.config,
				status: 'unchecked',
				lastError: null,
			});
		});
	});

	describe('update', () => {
		it('rewrites the row and invalidates id, old issuer, new issuer and the list', async () => {
			const row = await seedRow({ name: 'Old', issuer: 'https://old.example.com' });
			// Prime every entry the write must invalidate.
			await store.getById(row.id);
			await store.getByIssuer('https://old.example.com');
			expect(await store.listBySurface('instance-mcp')).toEqual([]);

			await store.update(row.id, {
				name: 'New',
				issuer: 'https://new.example.com',
				config: minimalConfig({ 'instance-mcp': {} }),
			});

			const updated = await rows.findOneByOrFail({ id: row.id });
			expect(updated).toMatchObject({
				name: 'New',
				issuer: 'https://new.example.com',
				configVersion: 1,
			});
			expect(updated.config).not.toBe(row.config);

			expect(await store.getByIssuer('https://old.example.com')).toBeUndefined();
			expect(await store.getByIssuer('https://new.example.com')).toMatchObject({ name: 'New' });
			expect((await store.getById(row.id))?.name).toBe('New');
			expect(ids(await store.listBySurface('instance-mcp'))).toEqual([row.id]);
		});

		it('clears the bindings of the updated source only when asked', async () => {
			const user = await createOwner();
			const a = await seedRow();
			const b = await seedRow();
			const binding = (sourceId: string, subject: string) =>
				bindings.create({
					sourceId,
					subject,
					userId: user.id,
					provenance: 'admin',
					status: 'active',
					lastSeenAt: null,
				});
			await bindings.save([binding(a.id, 'alice'), binding(a.id, 'bob'), binding(b.id, 'carol')]);

			await store.update(a.id, { name: 'Still bound' });
			expect(await bindings.countBy({ sourceId: a.id })).toBe(2);

			await store.update(a.id, { name: 'Re-keyed' }, { clearBindings: true });
			expect(await bindings.countBy({ sourceId: a.id })).toBe(0);
			expect(await bindings.countBy({ sourceId: b.id })).toBe(1);
			expect((await rows.findOneByOrFail({ id: a.id })).name).toBe('Re-keyed');
		});

		it('marks a changed issuer or config unchecked and voids a running discovery lease', async () => {
			const row = await seedRow({ status: 'error', lastError: 'old' });
			const source = await loadSource(row.id);
			const claimedAt = new Date();
			expect(await store.claimDiscovery(source, claimedAt)).toBe(true);

			await store.update(row.id, { issuer: 'https://moved.example.com' });

			expect(
				await store.recordDiscovery(source, claimedAt, { status: 'healthy', lastError: null }),
			).toBe(false);
			expect(await rows.findOneByOrFail({ id: row.id })).toMatchObject({
				status: 'unchecked',
				lastError: null,
				discoveryClaimedAt: null,
			});
		});

		it('leaves the discovery state alone when only the name changes', async () => {
			const row = await seedRow({ status: 'healthy' });
			const source = await loadSource(row.id);
			const claimedAt = new Date();
			expect(await store.claimDiscovery(source, claimedAt)).toBe(true);

			await store.update(row.id, { name: 'Renamed' });

			expect(await rows.findOneByOrFail({ id: row.id })).toMatchObject({ status: 'healthy' });
			expect(
				await store.recordDiscovery(source, claimedAt, { status: 'healthy', lastError: null }),
			).toBe(true);
		});

		it('revalidates the config against the row schema', async () => {
			const row = await seedRow();

			await expect(
				store.update(row.id, {
					config: { ...minimalConfig(), identity: { subject: 'n8n-user-id' } },
				}),
			).rejects.toThrow(/only allowed on system-managed sources/);

			expect((await rows.findOneByOrFail({ id: row.id })).config).toBe(row.config);
		});
	});

	describe('delete', () => {
		it('removes the row and every cached view of it', async () => {
			const row = await seedRow();
			await store.getById(row.id);
			await store.listBySurface('public-api');

			await store.delete(row.id);

			expect(await rows.findOneBy({ id: row.id })).toBeNull();
			expect(await store.getById(row.id)).toBeUndefined();
			expect(await store.listBySurface('public-api')).toEqual([]);
		});
	});

	describe('discovery lease', () => {
		const now = new Date('2026-10-01T12:00:00.000Z');
		const later = (ms: number) => new Date(now.getTime() + ms);
		const metadata: TrustedSourceMetadata = {
			version: 1,
			documents: [
				{
					kind: 'jwks',
					fetchedAt: now.toISOString(),
					url: 'https://issuer.example.com/keys',
					keys: [{ kid: 'k1', kty: 'RSA', n: 'AQAB', e: 'AQAB' }],
				},
			],
		};

		it('grants the lease once and again after it expires', async () => {
			const source = await loadSource((await seedRow()).id);

			expect(await store.claimDiscovery(source, now)).toBe(true);
			expect(await store.claimDiscovery(source, later(1000))).toBe(false);
			expect(await store.claimDiscovery(source, later(61_000))).toBe(true);
		});

		it('rejects a record whose claim is not the current lease and leaves the row alone', async () => {
			const row = await seedRow();
			const source = await loadSource(row.id);
			expect(await store.claimDiscovery(source, now)).toBe(true);

			const recorded = await store.recordDiscovery(source, later(1), {
				metadata,
				status: 'healthy',
				lastError: null,
			});

			expect(recorded).toBe(false);
			expect(await rows.findOneByOrFail({ id: row.id })).toMatchObject({
				metadata: null,
				status: 'unchecked',
				lastCheckedAt: null,
			});
			expect(await loadSource(row.id)).toMatchObject({ metadata: null, status: 'unchecked' });
		});

		it('records a healthy result, releases the lease and invalidates the cached source', async () => {
			const row = await seedRow();
			const source = await loadSource(row.id);
			expect(await store.claimDiscovery(source, now)).toBe(true);

			const recorded = await store.recordDiscovery(source, now, {
				metadata,
				status: 'healthy',
				lastError: null,
			});

			expect(recorded).toBe(true);
			expect(await loadSource(row.id)).toMatchObject({
				metadata,
				status: 'healthy',
				lastError: null,
			});
			const updated = await rows.findOneByOrFail({ id: row.id });
			expect(updated.discoveryClaimedAt).toBeNull();
			expect(updated.lastCheckedAt).toBeInstanceOf(Date);
			expect(Date.now() - (updated.lastCheckedAt?.getTime() ?? 0)).toBeLessThan(60_000);
		});

		it('keeps the previous metadata when a later run records an error', async () => {
			const row = await seedRow();
			const source = await loadSource(row.id);
			expect(await store.claimDiscovery(source, now)).toBe(true);
			expect(
				await store.recordDiscovery(source, now, { metadata, status: 'healthy', lastError: null }),
			).toBe(true);
			const healthy = await loadSource(row.id);
			const retry = later(1000);
			expect(await store.claimDiscovery(healthy, retry)).toBe(true);

			expect(await store.recordDiscovery(healthy, retry, { status: 'error', lastError: 'x' })).toBe(
				true,
			);

			expect(await loadSource(row.id)).toMatchObject({
				metadata,
				status: 'error',
				lastError: 'x',
			});
		});

		it('reads unparseable metadata as null and still returns the source', async () => {
			const row = await seedRow({ metadata: 'not json' });

			expect(await store.getById(row.id)).toMatchObject({ id: row.id, metadata: null });
		});

		it('listAll returns every source regardless of its surfaces', async () => {
			const publicApi = await seedRow({ config: await encryptedAdminConfig({ 'public-api': {} }) });
			const mcp = await seedRow({ config: await encryptedAdminConfig({ 'instance-mcp': {} }) });

			expect(ids(await store.listAll())).toEqual([publicApi.id, mcp.id].sort());
		});
	});

	describe('guards', () => {
		it.each(['update', 'delete'] as const)('%s refuses a system-managed row', async (action) => {
			const row = await seedRow({ managedBy: 'system' });

			const call =
				action === 'update' ? store.update(row.id, { name: 'Renamed' }) : store.delete(row.id);
			await expect(call).rejects.toThrow(SystemTrustedSourceModificationError);

			expect(await rows.findOneByOrFail({ id: row.id })).toMatchObject({ name: row.name });
		});

		it.each(['update', 'delete'] as const)(
			'%s throws NotFoundError for an unknown id',
			async (action) => {
				const call =
					action === 'update'
						? store.update('missing', { name: 'Renamed' })
						: store.delete('missing');

				await expect(call).rejects.toThrow(NotFoundError);
			},
		);
	});
});
