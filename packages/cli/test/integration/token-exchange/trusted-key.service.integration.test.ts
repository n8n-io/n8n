import { mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { KeyObject } from 'node:crypto';

import type { TrustedKeySourceEntity } from '@/modules/token-exchange/database/entities/trusted-key-source.entity';
import { TrustedKeyEntity } from '@/modules/token-exchange/database/entities/trusted-key.entity';
import { TrustedKeySourceRepository } from '@/modules/token-exchange/database/repositories/trusted-key-source.repository';
import { TrustedKeyRepository } from '@/modules/token-exchange/database/repositories/trusted-key.repository';
import { TrustedKeyService } from '@/modules/token-exchange/services/trusted-key.service';
import { TokenExchangeConfig } from '@/modules/token-exchange/token-exchange.config';
import type { TrustedKeyData } from '@/modules/token-exchange/token-exchange.schemas';

// ──────────────────────────────────────────────────────────────────────
// Pre-generated PEM public keys (test-only, no secrets)
// ──────────────────────────────────────────────────────────────────────

const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1A5I3JA3ylWxNFZcNqp9
qo3dhhO/7wAKUVH73Ryc/UWeHQPon5K+cVchPG2td4yg9llV6LDqurdI5wO1b1tg
XZjky3Brbh6LISZNjQJr0YvhCVW7NU6jjqgrLqNVrPeAGP51h9ozSIHUm1UyWm2J
wquhuvVhFlgaeHwA5HtBrYuwihEHJBJueIn9CiGYGwTModwT+WrhK5SxuXhtkD9w
6SJrbXZIdOnTtAFxH0bn+OYriRD7SgEn5UWiVpXyaRNkKhiFpozK2U1MqtKLrWgC
o6LNz3KqejtBEOT+/IbnbgIShhWcTuh8Ehw0EUtkOXdqykqoXuEtcoLj3c4efQ/n
dQIDAQAB
-----END PUBLIC KEY-----`;

const EC_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEpCuPN2BHQ7G0A2qD2Bd27bwwUB9M
Npzv5WS/ygt55l8y2X+Vfm5TQFRMNkqEx+/GXaPIU/hDmtnBdCxAUIRM9g==
-----END PUBLIC KEY-----`;

const ED25519_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAPBUxurC3wGyi/yXTTjNwTzgHjSioAIa4Qx6nyOqof0U=
-----END PUBLIC KEY-----`;

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function staticKeyEntry(
	overrides: Partial<{
		kid: string;
		algorithms: string[];
		key: string;
		issuer: string;
		expectedAudience: string;
		allowedRoles: string[];
	}> = {},
) {
	return {
		type: 'static' as const,
		kid: 'test-kid',
		algorithms: ['RS256'],
		key: RSA_PUBLIC_KEY,
		issuer: 'https://issuer.example.com',
		...overrides,
	};
}

function makeTrustedKeyData(overrides: Partial<TrustedKeyData> = {}): TrustedKeyData {
	return {
		algorithms: ['RS256'],
		keyMaterial: RSA_PUBLIC_KEY,
		issuer: 'https://issuer.example.com',
		...overrides,
	};
}

async function insertSource(
	overrides: Partial<TrustedKeySourceEntity> = {},
): Promise<TrustedKeySourceEntity> {
	const sourceRepo = Container.get(TrustedKeySourceRepository);
	return await sourceRepo.save({
		id: 'static',
		type: 'static' as const,
		config: JSON.stringify([staticKeyEntry()]),
		status: 'pending' as const,
		lastError: null,
		lastRefreshedAt: null,
		...overrides,
	});
}

async function insertKey(
	overrides: Partial<{ sourceId: string; kid: string; data: TrustedKeyData }> = {},
): Promise<TrustedKeyEntity> {
	const keyRepo = Container.get(TrustedKeyRepository);
	const entity = new TrustedKeyEntity();
	entity.sourceId = overrides.sourceId ?? 'static';
	entity.kid = overrides.kid ?? 'test-kid';
	entity.data = JSON.stringify(overrides.data ?? makeTrustedKeyData());
	entity.createdAt = new Date();
	return await keyRepo.save(entity);
}

// ──────────────────────────────────────────────────────────────────────
// Setup / Teardown
// ──────────────────────────────────────────────────────────────────────

const config = mockInstance(TokenExchangeConfig, {
	trustedKeys: '',
	keyRefreshIntervalSeconds: 300,
});

let service: TrustedKeyService;
let sourceRepo: TrustedKeySourceRepository;
let keyRepo: TrustedKeyRepository;
let instanceSettings: InstanceSettings;

beforeAll(async () => {
	await testModules.loadModules(['token-exchange']);
	await testDb.init();

	instanceSettings = Container.get(InstanceSettings);
	service = Container.get(TrustedKeyService);
	sourceRepo = Container.get(TrustedKeySourceRepository);
	keyRepo = Container.get(TrustedKeyRepository);
});

beforeEach(async () => {
	await testDb.truncate(['TrustedKeyEntity', 'TrustedKeySourceEntity']);
	// Reset config defaults
	config.trustedKeys = '';
	config.keyRefreshIntervalSeconds = 300;
	// Default to leader
	Object.defineProperty(instanceSettings, 'isLeader', { value: true, configurable: true });
});

afterEach(() => {
	service.stopRefresh();
});

afterAll(async () => {
	await testDb.terminate();
});

// ──────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────

describe('TrustedKeyService (integration)', () => {
	describe('initialize', () => {
		it('should sync sources to DB, refresh keys to healthy, and persist key data', async () => {
			config.trustedKeys = JSON.stringify([
				staticKeyEntry({ kid: 'key-1' }),
				staticKeyEntry({ kid: 'key-2', issuer: 'https://issuer-2.example.com' }),
			]);

			await service.initialize();

			const sources = await sourceRepo.find();
			expect(sources).toHaveLength(1);
			expect(sources[0]).toMatchObject({
				id: 'static',
				type: 'static',
				status: 'healthy',
			});
			expect(sources[0].lastRefreshedAt).toBeDefined();

			const keys = await keyRepo.find();
			expect(keys).toHaveLength(2);

			const key1 = keys.find((k) => k.kid === 'key-1')!;
			const key1Data = JSON.parse(key1.data) as TrustedKeyData;
			expect(key1Data.algorithms).toEqual(['RS256']);
			expect(key1Data.issuer).toBe('https://issuer.example.com');
			expect(key1Data.keyMaterial).toBe(RSA_PUBLIC_KEY);

			const key2 = keys.find((k) => k.kid === 'key-2')!;
			const key2Data = JSON.parse(key2.data) as TrustedKeyData;
			expect(key2Data.issuer).toBe('https://issuer-2.example.com');
		});

		it('should not create any sources or keys with empty config', async () => {
			config.trustedKeys = '';

			await service.initialize();

			expect(await sourceRepo.find()).toHaveLength(0);
			expect(await keyRepo.find()).toHaveLength(0);
		});

		it.each([
			{ name: 'invalid JSON', trustedKeys: 'not-json', error: 'Failed to parse trusted keys JSON' },
			{
				name: 'invalid schema',
				trustedKeys: JSON.stringify([{ type: 'invalid' }]),
				error: 'Trusted keys JSON has invalid format',
			},
		])('should throw on $name config', async ({ trustedKeys, error }) => {
			config.trustedKeys = trustedKeys;
			await expect(service.initialize()).rejects.toThrow(error);
		});

		it('should remove orphaned sources on config change', async () => {
			await insertSource({ id: 'old-source', type: 'static', config: '[]' });

			config.trustedKeys = JSON.stringify([staticKeyEntry({ kid: 'new-key' })]);

			await service.initialize();

			const sources = await sourceRepo.find();
			const sourceIds = sources.map((s) => s.id);

			expect(sourceIds).toContain('static');
			expect(sourceIds).not.toContain('old-source');
		});

		it('should skip everything as worker', async () => {
			Object.defineProperty(instanceSettings, 'isLeader', { value: false, configurable: true });
			config.trustedKeys = JSON.stringify([staticKeyEntry()]);

			await service.initialize();

			expect(await sourceRepo.find()).toHaveLength(0);
			expect(await keyRepo.find()).toHaveLength(0);
		});

		it('should remove all sources and keys when config becomes empty', async () => {
			config.trustedKeys = JSON.stringify([staticKeyEntry({ kid: 'old-key' })]);
			await service.initialize();

			expect(await sourceRepo.find()).toHaveLength(1);
			expect(await keyRepo.find()).toHaveLength(1);

			config.trustedKeys = '';
			await service.initialize();

			expect(await sourceRepo.find()).toHaveLength(0);
			expect(await keyRepo.find()).toHaveLength(0);
		});
	});

	describe('onLeaderTakeover', () => {
		it('should sync sources and refresh keys on leader takeover', async () => {
			Object.defineProperty(instanceSettings, 'isLeader', { value: false, configurable: true });
			config.trustedKeys = JSON.stringify([staticKeyEntry({ kid: 'takeover-key' })]);
			await service.initialize();

			expect(await sourceRepo.find()).toHaveLength(0);

			Object.defineProperty(instanceSettings, 'isLeader', { value: true, configurable: true });
			await service.onLeaderTakeover();

			const sources = await sourceRepo.find();
			expect(sources).toHaveLength(1);
			expect(sources[0].status).toBe('healthy');

			const keys = await keyRepo.find();
			expect(keys).toHaveLength(1);
			expect(keys[0].kid).toBe('takeover-key');
		});
	});

	describe('getByKidAndIss', () => {
		it('should find matching key, return undefined for wrong issuer and unknown kid', async () => {
			await insertSource();
			await insertKey();

			// Matching kid + issuer
			const result = await service.getByKidAndIss('test-kid', 'https://issuer.example.com');
			expect(result).toBeDefined();
			expect(result!.kid).toBe('test-kid');
			expect(result!.algorithms).toEqual(['RS256']);
			expect(result!.issuer).toBe('https://issuer.example.com');
			expect(result!.key).toBeDefined();
			expect((result!.key as KeyObject).type).toBe('public');

			// Wrong issuer
			expect(
				await service.getByKidAndIss('test-kid', 'https://other-issuer.example.com'),
			).toBeUndefined();

			// Unknown kid
			expect(
				await service.getByKidAndIss('unknown-kid', 'https://issuer.example.com'),
			).toBeUndefined();
		});

		it('should skip corrupted entities and still resolve valid ones', async () => {
			await insertSource();

			// Corrupted JSON
			const corruptedJson = new TrustedKeyEntity();
			corruptedJson.sourceId = 'static';
			corruptedJson.kid = 'bad-json-kid';
			corruptedJson.data = 'not-valid-json';
			corruptedJson.createdAt = new Date();
			await keyRepo.save(corruptedJson);

			// Invalid PEM
			await insertKey({
				kid: 'bad-pem-kid',
				data: makeTrustedKeyData({ keyMaterial: 'not-a-pem' }),
			});

			// Valid key
			await insertKey({ kid: 'good-kid' });

			expect(
				await service.getByKidAndIss('bad-json-kid', 'https://issuer.example.com'),
			).toBeUndefined();
			expect(
				await service.getByKidAndIss('bad-pem-kid', 'https://issuer.example.com'),
			).toBeUndefined();

			const valid = await service.getByKidAndIss('good-kid', 'https://issuer.example.com');
			expect(valid).toBeDefined();
			expect(valid!.kid).toBe('good-kid');
		});

		it('should select the entity matching the requested issuer', async () => {
			await insertSource({ id: 'source-a' });
			await insertSource({ id: 'source-b' });
			await insertKey({
				sourceId: 'source-a',
				kid: 'shared-kid',
				data: makeTrustedKeyData({ issuer: 'https://issuer-a.com' }),
			});
			await insertKey({
				sourceId: 'source-b',
				kid: 'shared-kid',
				data: makeTrustedKeyData({ issuer: 'https://issuer-b.com' }),
			});

			const result = await service.getByKidAndIss('shared-kid', 'https://issuer-b.com');
			expect(result).toBeDefined();
			expect(result!.issuer).toBe('https://issuer-b.com');
		});
	});

	describe('refreshSource', () => {
		it('should refresh keys and replace them on subsequent refresh', async () => {
			const initialConfig = [staticKeyEntry({ kid: 'key-v1' }), staticKeyEntry({ kid: 'key-v2' })];
			await insertSource({ config: JSON.stringify(initialConfig) });

			await service.refreshSource('static');

			// First refresh: source healthy, both keys exist
			const source = await sourceRepo.findOneBy({ id: 'static' });
			expect(source!.status).toBe('healthy');
			expect(source!.lastError).toBeNull();
			expect(source!.lastRefreshedAt).toBeDefined();
			expect(await keyRepo.find()).toHaveLength(2);

			// Update config to a single different key
			await sourceRepo.update('static', {
				config: JSON.stringify([staticKeyEntry({ kid: 'key-v3' })]),
			});

			await service.refreshSource('static');

			// Second refresh: only new key remains
			const keys = await keyRepo.find();
			expect(keys).toHaveLength(1);
			expect(keys[0].kid).toBe('key-v3');
		});

		it('should mark source as error and preserve existing keys on failure', async () => {
			await insertSource({ config: JSON.stringify([staticKeyEntry({ kid: 'preserved-key' })]) });
			await service.refreshSource('static');

			expect(await keyRepo.find()).toHaveLength(1);

			// Corrupt config
			await sourceRepo.update('static', { config: 'invalid-json' });
			await service.refreshSource('static');

			const source = await sourceRepo.findOneBy({ id: 'static' });
			expect(source!.status).toBe('error');
			expect(source!.lastError).toBeDefined();

			// Key from prior successful refresh should be preserved
			const keys = await keyRepo.find();
			expect(keys).toHaveLength(1);
			expect(keys[0].kid).toBe('preserved-key');
		});

		it('should throw when source not found', async () => {
			await expect(service.refreshSource('nonexistent')).rejects.toThrow(
				'Trusted key source not found',
			);
		});
	});

	describe('algorithm validation and key compatibility', () => {
		it.each([
			{ name: 'RSA key with RS256', kid: 'rsa-key', algorithms: ['RS256'], key: RSA_PUBLIC_KEY },
			{ name: 'EC key with ES256', kid: 'ec-key', algorithms: ['ES256'], key: EC_PUBLIC_KEY },
			{
				name: 'Ed25519 key with EdDSA',
				kid: 'ed-key',
				algorithms: ['EdDSA'],
				key: ED25519_PUBLIC_KEY,
			},
		])('should accept $name', async ({ kid, algorithms, key }) => {
			await insertSource({
				config: JSON.stringify([staticKeyEntry({ kid, algorithms, key })]),
			});

			await service.refreshSource('static');

			const source = await sourceRepo.findOneBy({ id: 'static' });
			expect(source!.status).toBe('healthy');

			const keys = await keyRepo.find();
			expect(keys).toHaveLength(1);
			expect(keys[0].kid).toBe(kid);
		});

		it.each([
			{
				name: 'cross-family algorithm mixing',
				entries: [staticKeyEntry({ kid: 'mixed', algorithms: ['RS256', 'ES256'] })],
			},
			{
				name: 'EC key with RSA algorithm',
				entries: [staticKeyEntry({ kid: 'ec-rsa', algorithms: ['RS256'], key: EC_PUBLIC_KEY })],
			},
			{
				name: 'duplicate kid',
				entries: [staticKeyEntry({ kid: 'dup' }), staticKeyEntry({ kid: 'dup' })],
			},
		])('should reject $name', async ({ entries }) => {
			await insertSource({ config: JSON.stringify(entries) });

			await service.refreshSource('static');

			const source = await sourceRepo.findOneBy({ id: 'static' });
			expect(source!.status).toBe('error');
			expect(source!.lastError).toBeDefined();
			expect(await keyRepo.find()).toHaveLength(0);
		});
	});

	describe('listAll and listSources', () => {
		it('should return all entities from the database', async () => {
			await insertSource({ id: 'source-1' });
			await insertSource({ id: 'source-2' });
			await insertKey({ sourceId: 'source-1', kid: 'kid-1' });
			await insertKey({ sourceId: 'source-1', kid: 'kid-2' });
			await insertKey({ sourceId: 'source-2', kid: 'kid-3' });

			expect(await service.listSources()).toHaveLength(2);
			expect(await service.listAll()).toHaveLength(3);
		});
	});
});
