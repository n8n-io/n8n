import { CacheService, EventService, OAuthDiscoveryClient } from '@n8n/backend-services';
import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { TrustedSourceConfigInput } from '@n8n/inbound-auth';
import { DataSource, type Repository } from '@n8n/typeorm';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { TrustedSourceIdentityEntity } from '@/modules/inbound-auth-core/database/entities/trusted-source-identity.entity';
import { TrustedSourceEntity } from '@/modules/inbound-auth-core/database/entities/trusted-source.entity';
import { TrustedSourceDbStore } from '@/modules/inbound-auth-core/trusted-source.store';
import { createAdmin, createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

const LICENSE = 'feat:trustedSourceManage';
const SYSTEM_ID = 'n8n-internal';
const ISSUER = 'https://acme.example.com';
const JWKS_URI = `${ISSUER}/.well-known/jwks.json`;
const RSA_KEY = { kid: 'k1', kty: 'RSA', use: 'sig', alg: 'RS256', n: 'AQAB', e: 'AQAB' } as const;

// The check route runs discovery through the injected client; no network in tests.
const discoveryClient = mock<OAuthDiscoveryClient>();
Container.set(OAuthDiscoveryClient, discoveryClient);

const testServer = utils.setupTestServer({
	endpointGroups: ['trusted-sources'],
	modules: ['inbound-auth-core'],
	enabledFeatures: [LICENSE],
});

let owner: User;
let admin: User;
let member: User;
let ownerAgent: SuperAgentTest;
let adminAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;
let store: TrustedSourceDbStore;
let cacheService: CacheService;
let rows: Repository<TrustedSourceEntity>;
let bindings: Repository<TrustedSourceIdentityEntity>;
let emit: MockInstance;

const minimalConfig = (): TrustedSourceConfigInput => ({
	version: 1,
	authentication: { type: 'oauth2' },
	surfaces: { 'public-api': {} },
});

const withClient = (clientSecret?: string): TrustedSourceConfigInput => ({
	...minimalConfig(),
	authentication: {
		type: 'oauth2',
		client: { kind: 'registered', clientId: 'n8n', ...(clientSecret && { clientSecret }) },
	},
});

const body = (overrides: Record<string, unknown> = {}) => ({
	name: 'Acme',
	issuer: ISSUER,
	config: minimalConfig(),
	...overrides,
});

async function createSource(overrides: Record<string, unknown> = {}): Promise<{ id: string }> {
	const response = await ownerAgent.post('/trusted-sources').send(body(overrides));
	expect(response.statusCode).toBe(200);
	return response.body.data;
}

async function bind(sourceId: string, subject: string) {
	await bindings.save(
		bindings.create({
			sourceId,
			subject,
			userId: member.id,
			provenance: 'admin',
			status: 'active',
			lastSeenAt: null,
		}),
	);
}

async function storedClient(id: string) {
	await cacheService.reset();
	const source = await store.getById(id);
	return source?.config.authentication.client;
}

beforeAll(async () => {
	owner = await createOwner();
	admin = await createAdmin();
	member = await createMember();
	ownerAgent = testServer.authAgentFor(owner);
	adminAgent = testServer.authAgentFor(admin);
	memberAgent = testServer.authAgentFor(member);

	store = Container.get(TrustedSourceDbStore);
	cacheService = Container.get(CacheService);
	rows = Container.get(DataSource).getRepository(TrustedSourceEntity);
	bindings = Container.get(DataSource).getRepository(TrustedSourceIdentityEntity);
});

beforeEach(async () => {
	// Module init seeded the system row once; only admin rows are per-test state.
	await testDb.truncate(['TrustedSourceIdentityEntity']);
	await rows.delete({ managedBy: 'admin' });
	await cacheService.reset();
	// The shared vitest config restores spies after every test, so the spy is per test.
	emit = vi.spyOn(Container.get(EventService), 'emit');
	discoveryClient.fetchOpenIdConfiguration.mockReset();
	discoveryClient.fetchOAuth2ServerMetadata.mockReset();
	discoveryClient.fetchJwks.mockReset();
});

describe('POST /trusted-sources', () => {
	it('creates an admin source with defaults applied and returns it without the secret', async () => {
		const response = await ownerAgent
			.post('/trusted-sources')
			.send(body({ config: withClient('s3cret') }));

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			name: 'Acme',
			issuer: ISSUER,
			type: 'oauth2',
			managedBy: 'admin',
			status: 'unchecked',
			lastError: null,
			lastCheckedAt: null,
			config: {
				version: 1,
				authentication: {
					type: 'oauth2',
					clockSkewSeconds: 60,
					client: { kind: 'registered', clientId: 'n8n', clientSecret: CREDENTIAL_BLANKING_VALUE },
				},
				identity: { subject: 'binding' },
			},
		});
		expect(JSON.stringify(response.body)).not.toContain('s3cret');

		const row = await rows.findOneByOrFail({ id: response.body.data.id });
		expect(row).toMatchObject({ managedBy: 'admin', status: 'unchecked', configVersion: 1 });
		expect(await storedClient(row.id)).toEqual({
			kind: 'registered',
			clientId: 'n8n',
			clientSecret: 's3cret',
		});
	});

	it('lets an admin create a source', async () => {
		const response = await adminAgent.post('/trusted-sources').send(body());

		expect(response.statusCode).toBe(200);
		expect(response.body.data.managedBy).toBe('admin');
	});

	it.each<[string, Record<string, unknown>, string[], RegExp]>([
		[
			'a system-only setting',
			{ config: { ...minimalConfig(), identity: { subject: 'n8n-user-id' } } },
			['config', 'identity', 'subject'],
			/only allowed on system-managed sources/,
		],
		[
			'a value outside the schema bounds',
			{ config: { ...minimalConfig(), authentication: { type: 'oauth2', clockSkewSeconds: 999 } } },
			['config', 'authentication', 'clockSkewSeconds'],
			/300/,
		],
		['an issuer that is not a URL', { issuer: 'acme' }, ['issuer'], /url/i],
		['an http issuer', { issuer: 'http://acme.example.com' }, ['issuer'], /https/],
		[
			'an unknown config key',
			{ config: { ...minimalConfig(), identity: { typo: true } } },
			['config', 'identity'],
			/typo/,
		],
	])(
		'refuses %s with the offending path and writes nothing',
		async (_, overrides, path, message) => {
			const response = await ownerAgent.post('/trusted-sources').send(body(overrides));

			expect(response.statusCode).toBe(400);
			expect(response.body).toMatchObject({ path, message: expect.stringMatching(message) });
			expect(await rows.countBy({ managedBy: 'admin' })).toBe(0);
		},
	);

	it('refuses the blanking value as a secret and writes nothing', async () => {
		const response = await ownerAgent
			.post('/trusted-sources')
			.send(body({ config: withClient(CREDENTIAL_BLANKING_VALUE) }));

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toMatch(/blanking value/);
		expect(await rows.countBy({ managedBy: 'admin' })).toBe(0);
	});

	it('answers 409 when the name or the issuer is taken', async () => {
		await createSource();

		const sameName = await ownerAgent
			.post('/trusted-sources')
			.send(body({ issuer: 'https://other.example.com' }));
		const sameIssuer = await ownerAgent.post('/trusted-sources').send(body({ name: 'Other' }));

		expect(sameName.statusCode).toBe(409);
		expect(sameIssuer.statusCode).toBe(409);
		expect(await rows.countBy({ managedBy: 'admin' })).toBe(1);
	});

	it('emits trusted-source-created with the actor and the source', async () => {
		const { id } = await createSource();

		expect(emit).toHaveBeenCalledWith('trusted-source-created', {
			user: expect.objectContaining({ id: owner.id }),
			sourceId: id,
			issuer: ISSUER,
		});
	});

	it('answers 403 for a member', async () => {
		const response = await memberAgent.post('/trusted-sources').send(body());

		expect(response.statusCode).toBe(403);
		expect(await rows.countBy({ managedBy: 'admin' })).toBe(0);
	});

	it('answers 403 without the license', async () => {
		testServer.license.disable(LICENSE);

		const response = await ownerAgent.post('/trusted-sources').send(body());

		expect(response.statusCode).toBe(403);
		expect(response.body.message).toBe('Plan lacks license for this feature');
		expect(await rows.countBy({ managedBy: 'admin' })).toBe(0);
	});
});

describe('GET /trusted-sources', () => {
	it('lists the seeded source and admin sources as summaries for an owner', async () => {
		const { id } = await createSource({
			config: {
				...minimalConfig(),
				authentication: { type: 'oauth2', discovery: { mode: 'manual', jwksUri: JWKS_URI } },
				surfaces: { 'public-api': {}, trigger: {} },
			},
		});

		const response = await ownerAgent.get('/trusted-sources');

		expect(response.statusCode).toBe(200);
		const list: Record<string, unknown>[] = response.body.data;
		expect(list.map((entry) => entry.id).sort()).toEqual([id, SYSTEM_ID].sort());
		for (const entry of list) {
			expect(Object.keys(entry).sort()).toEqual(['capabilities', 'id', 'name', 'surfaces']);
		}
		expect(list.find((entry) => entry.id === id)).toEqual({
			id,
			name: 'Acme',
			capabilities: ['verify-jwt'],
			surfaces: ['public-api', 'trigger'],
		});
	});

	it('lists the same summaries for a member', async () => {
		const { id } = await createSource();

		const response = await memberAgent.get('/trusted-sources');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toContainEqual({
			id,
			name: 'Acme',
			capabilities: [],
			surfaces: ['public-api'],
		});
		expect(JSON.stringify(response.body)).not.toContain(ISSUER);
	});

	it('lists without the license', async () => {
		testServer.license.disable(LICENSE);

		const response = await ownerAgent.get('/trusted-sources');

		expect(response.statusCode).toBe(200);
	});
});

describe('GET /trusted-sources/:id', () => {
	it('returns the full source with the secret blanked for an owner', async () => {
		const { id } = await createSource({ config: withClient('s3cret') });

		const response = await ownerAgent.get(`/trusted-sources/${id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			id,
			name: 'Acme',
			issuer: ISSUER,
			managedBy: 'admin',
			status: 'unchecked',
			config: {
				authentication: {
					client: { kind: 'registered', clientId: 'n8n', clientSecret: CREDENTIAL_BLANKING_VALUE },
				},
			},
			metadata: null,
		});
		expect(JSON.stringify(response.body)).not.toContain('s3cret');
	});

	it('returns the seeded system source', async () => {
		const response = await ownerAgent.get(`/trusted-sources/${SYSTEM_ID}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({ id: SYSTEM_ID, managedBy: 'system' });
	});

	it('answers 403 for a member', async () => {
		const { id } = await createSource();

		const response = await memberAgent.get(`/trusted-sources/${id}`);

		expect(response.statusCode).toBe(403);
	});

	it('answers 404 for an unknown id', async () => {
		const response = await ownerAgent.get('/trusted-sources/missing');

		expect(response.statusCode).toBe(404);
	});
});

describe('PATCH /trusted-sources/:id', () => {
	it('renames a source, keeps its bindings and emits trusted-source-updated', async () => {
		const { id } = await createSource();
		await bind(id, 'alice');

		const response = await ownerAgent.patch(`/trusted-sources/${id}`).send({ name: 'Renamed' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({ id, name: 'Renamed', issuer: ISSUER });
		expect((await rows.findOneByOrFail({ id })).name).toBe('Renamed');
		expect(await bindings.countBy({ sourceId: id })).toBe(1);
		expect(emit).toHaveBeenCalledWith('trusted-source-updated', {
			user: expect.objectContaining({ id: owner.id }),
			sourceId: id,
			issuer: ISSUER,
		});
	});

	it('answers an empty body with the current source, writes nothing and emits nothing', async () => {
		const { id } = await createSource();
		const update = vi.spyOn(store, 'update');

		const response = await ownerAgent.patch(`/trusted-sources/${id}`).send({});

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({ id, name: 'Acme', issuer: ISSUER });
		expect(update).not.toHaveBeenCalled();
		expect(emit).not.toHaveBeenCalledWith('trusted-source-updated', expect.anything());
	});

	it('keeps the stored secret when the config carries the blanking value', async () => {
		const { id } = await createSource({ config: withClient('s3cret') });

		const response = await ownerAgent
			.patch(`/trusted-sources/${id}`)
			.send({ config: withClient(CREDENTIAL_BLANKING_VALUE) });

		expect(response.statusCode).toBe(200);
		expect(response.body.data.config.authentication.client.clientSecret).toBe(
			CREDENTIAL_BLANKING_VALUE,
		);
		expect(await storedClient(id)).toMatchObject({ clientSecret: 's3cret' });
	});

	it('replaces the secret when the config carries a new value', async () => {
		const { id } = await createSource({ config: withClient('s3cret') });

		const response = await ownerAgent
			.patch(`/trusted-sources/${id}`)
			.send({ config: withClient('n3w') });

		expect(response.statusCode).toBe(200);
		expect(await storedClient(id)).toMatchObject({ clientSecret: 'n3w' });
	});

	it('clears the secret when the config omits it', async () => {
		const { id } = await createSource({ config: withClient('s3cret') });

		const response = await ownerAgent
			.patch(`/trusted-sources/${id}`)
			.send({ config: withClient() });

		expect(response.statusCode).toBe(200);
		expect(await storedClient(id)).toEqual({ kind: 'registered', clientId: 'n8n' });
	});

	it('moves the issuer and drops bindings only when clearBindings is set', async () => {
		const { id } = await createSource();
		await bind(id, 'alice');
		await bind(id, 'bob');

		const kept = await ownerAgent
			.patch(`/trusted-sources/${id}`)
			.send({ issuer: 'https://moved.example.com' });
		expect(kept.statusCode).toBe(200);
		expect(await bindings.countBy({ sourceId: id })).toBe(2);

		const cleared = await ownerAgent
			.patch(`/trusted-sources/${id}`)
			.send({ issuer: 'https://moved-again.example.com', clearBindings: true });
		expect(cleared.statusCode).toBe(200);
		expect(cleared.body.data).toMatchObject({
			issuer: 'https://moved-again.example.com',
			status: 'unchecked',
		});
		expect(await bindings.countBy({ sourceId: id })).toBe(0);
		expect(await store.getByIssuer(ISSUER)).toBeUndefined();
		expect(await store.getByIssuer('https://moved-again.example.com')).toMatchObject({ id });
	});

	it('refuses an admin-only setting without touching the row', async () => {
		const { id } = await createSource();

		const response = await ownerAgent.patch(`/trusted-sources/${id}`).send({
			config: {
				...minimalConfig(),
				authentication: { type: 'oauth2', keys: { kind: 'local-keystore' } },
			},
		});

		expect(response.statusCode).toBe(400);
		expect(response.body).toMatchObject({
			path: ['config', 'authentication', 'keys', 'kind'],
			message: expect.stringMatching(/only allowed on system-managed sources/),
		});
		expect((await rows.findOneByOrFail({ id })).name).toBe('Acme');
	});

	it('answers 409 when the new issuer is taken', async () => {
		const { id } = await createSource();
		await createSource({ name: 'Other', issuer: 'https://other.example.com' });

		const response = await ownerAgent
			.patch(`/trusted-sources/${id}`)
			.send({ issuer: 'https://other.example.com' });

		expect(response.statusCode).toBe(409);
	});

	it('refuses the system source', async () => {
		const response = await ownerAgent.patch(`/trusted-sources/${SYSTEM_ID}`).send({ name: 'x' });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toMatch(/system-managed/);
		expect((await rows.findOneByOrFail({ id: SYSTEM_ID })).name).not.toBe('x');
		expect(emit).not.toHaveBeenCalledWith('trusted-source-updated', expect.anything());
	});

	it('answers 404 for an unknown id', async () => {
		const response = await ownerAgent.patch('/trusted-sources/missing').send({ name: 'x' });

		expect(response.statusCode).toBe(404);
	});

	it('answers 403 for a member', async () => {
		const { id } = await createSource();

		const response = await memberAgent.patch(`/trusted-sources/${id}`).send({ name: 'x' });

		expect(response.statusCode).toBe(403);
		expect((await rows.findOneByOrFail({ id })).name).toBe('Acme');
	});

	it('answers 403 without the license', async () => {
		const { id } = await createSource();
		testServer.license.disable(LICENSE);

		const response = await ownerAgent.patch(`/trusted-sources/${id}`).send({ name: 'x' });

		expect(response.statusCode).toBe(403);
		expect(response.body.message).toBe('Plan lacks license for this feature');
		expect((await rows.findOneByOrFail({ id })).name).toBe('Acme');
	});
});

describe('DELETE /trusted-sources/:id', () => {
	it('deletes the source with its bindings, evicts the cache and emits trusted-source-deleted', async () => {
		const { id } = await createSource();
		await bind(id, 'alice');
		// Prime both cache keys, so the test fails if delete stops evicting them.
		expect(await store.getById(id)).toBeDefined();
		expect(await store.getByIssuer(ISSUER)).toBeDefined();

		const response = await ownerAgent.delete(`/trusted-sources/${id}`);

		expect(response.statusCode).toBe(200);
		expect(await rows.findOneBy({ id })).toBeNull();
		expect(await bindings.countBy({ sourceId: id })).toBe(0);
		expect(await store.getById(id)).toBeUndefined();
		expect(await store.getByIssuer(ISSUER)).toBeUndefined();
		expect(emit).toHaveBeenCalledWith('trusted-source-deleted', {
			user: expect.objectContaining({ id: owner.id }),
			sourceId: id,
			issuer: ISSUER,
		});
	});

	it('works without the license', async () => {
		const { id } = await createSource();
		testServer.license.disable(LICENSE);

		const response = await ownerAgent.delete(`/trusted-sources/${id}`);

		expect(response.statusCode).toBe(200);
		expect(await rows.findOneBy({ id })).toBeNull();
	});

	it('refuses the system source', async () => {
		const response = await ownerAgent.delete(`/trusted-sources/${SYSTEM_ID}`);

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toMatch(/system-managed/);
		expect(await rows.findOneBy({ id: SYSTEM_ID })).not.toBeNull();
		expect(emit).not.toHaveBeenCalledWith('trusted-source-deleted', expect.anything());
	});

	it('answers 404 for an unknown id', async () => {
		const response = await ownerAgent.delete('/trusted-sources/missing');

		expect(response.statusCode).toBe(404);
	});

	it('answers 403 for a member', async () => {
		const { id } = await createSource();

		const response = await memberAgent.delete(`/trusted-sources/${id}`);

		expect(response.statusCode).toBe(403);
		expect(await rows.findOneBy({ id })).not.toBeNull();
	});
});

describe('POST /trusted-sources/:id/check', () => {
	it('marks a reachable issuer healthy and returns the checked source', async () => {
		discoveryClient.fetchOpenIdConfiguration.mockResolvedValue({
			document: { issuer: ISSUER, jwks_uri: JWKS_URI },
			ttlSeconds: 3600,
		});
		discoveryClient.fetchOAuth2ServerMetadata.mockResolvedValue(undefined);
		discoveryClient.fetchJwks.mockResolvedValue({ keys: [RSA_KEY], skipped: [], ttlSeconds: 3600 });
		const { id } = await createSource();

		const response = await ownerAgent.post(`/trusted-sources/${id}/check`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			id,
			status: 'healthy',
			lastError: null,
			lastCheckedAt: expect.any(String),
			metadata: { version: 1 },
		});
		expect((await rows.findOneByOrFail({ id })).status).toBe('healthy');
		// Discovered keys make the source usable, which the summary shows as a capability.
		const list = await ownerAgent.get('/trusted-sources');
		expect(list.body.data).toContainEqual(
			expect.objectContaining({ id, capabilities: ['verify-jwt'] }),
		);
	});

	it('records an error when the metadata names another issuer', async () => {
		const mismatch = new Error(
			`Metadata from "${ISSUER}/.well-known/openid-configuration" names issuer "https://other.example.com", expected "${ISSUER}"`,
		);
		discoveryClient.fetchOpenIdConfiguration.mockRejectedValue(mismatch);
		discoveryClient.fetchOAuth2ServerMetadata.mockRejectedValue(mismatch);
		const { id } = await createSource();

		const response = await ownerAgent.post(`/trusted-sources/${id}/check`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			id,
			status: 'error',
			lastError: expect.stringContaining('names issuer "https://other.example.com"'),
			lastCheckedAt: expect.any(String),
		});
		expect((await rows.findOneByOrFail({ id })).status).toBe('error');
	});

	it('works without the license', async () => {
		discoveryClient.fetchOpenIdConfiguration.mockRejectedValue(new Error('down'));
		discoveryClient.fetchOAuth2ServerMetadata.mockRejectedValue(new Error('down'));
		const { id } = await createSource();
		testServer.license.disable(LICENSE);

		const response = await ownerAgent.post(`/trusted-sources/${id}/check`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.status).toBe('error');
	});

	it('answers 404 for an unknown id', async () => {
		const response = await ownerAgent.post('/trusted-sources/missing/check');

		expect(response.statusCode).toBe(404);
	});

	it('answers 403 for a member', async () => {
		const { id } = await createSource();

		const response = await memberAgent.post(`/trusted-sources/${id}/check`);

		expect(response.statusCode).toBe(403);
		expect((await rows.findOneByOrFail({ id })).status).toBe('unchecked');
	});
});
