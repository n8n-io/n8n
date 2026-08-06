import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { KeyObject } from 'node:crypto';

import type { TrustedKeySourceEntity } from '@/modules/identity-substrate/database/entities/trusted-key-source.entity';
import { TrustedKeyEntity } from '@/modules/identity-substrate/database/entities/trusted-key.entity';
import { TrustedKeySourceRepository } from '@/modules/identity-substrate/database/repositories/trusted-key-source.repository';
import { TrustedKeyRepository } from '@/modules/identity-substrate/database/repositories/trusted-key.repository';
import { TrustedKeyService } from '@/modules/identity-substrate/services/trusted-key.service';
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

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

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
		config: JSON.stringify([
			{
				type: 'static',
				kid: 'test-kid',
				algorithms: ['RS256'],
				key: RSA_PUBLIC_KEY,
				issuer: 'https://issuer.example.com',
			},
		]),
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

let service: TrustedKeyService;
let keyRepo: TrustedKeyRepository;

beforeAll(async () => {
	await testModules.loadModules(['identity-substrate']);
	await testDb.init();

	service = Container.get(TrustedKeyService);
	keyRepo = Container.get(TrustedKeyRepository);
});

beforeEach(async () => {
	await testDb.truncate(['TrustedKeyEntity', 'TrustedKeySourceEntity']);
});

afterAll(async () => {
	await testDb.terminate();
});

// ──────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────

describe('TrustedKeyService (integration)', () => {
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

	describe('hasSingleTrustedIssuer', () => {
		it('should return false when no keys are configured', async () => {
			expect(await service.hasSingleTrustedIssuer()).toBe(false);
		});

		it('should return true when every key shares one issuer', async () => {
			await insertSource();
			await insertKey({
				kid: 'kid-1',
				data: makeTrustedKeyData({ issuer: 'https://only.example.com' }),
			});
			await insertKey({
				kid: 'kid-2',
				data: makeTrustedKeyData({ issuer: 'https://only.example.com' }),
			});

			expect(await service.hasSingleTrustedIssuer()).toBe(true);
		});

		it('should return false when keys span multiple issuers', async () => {
			await insertSource();
			await insertKey({
				kid: 'kid-1',
				data: makeTrustedKeyData({ issuer: 'https://a.example.com' }),
			});
			await insertKey({
				kid: 'kid-2',
				data: makeTrustedKeyData({ issuer: 'https://b.example.com' }),
			});

			expect(await service.hasSingleTrustedIssuer()).toBe(false);
		});

		it('should skip corrupted key rows when counting issuers', async () => {
			await insertSource();
			await insertKey({
				kid: 'kid-1',
				data: makeTrustedKeyData({ issuer: 'https://only.example.com' }),
			});

			const corrupted = new TrustedKeyEntity();
			corrupted.sourceId = 'static';
			corrupted.kid = 'kid-corrupt';
			corrupted.data = 'not-json';
			corrupted.createdAt = new Date();
			await keyRepo.save(corrupted);

			expect(await service.hasSingleTrustedIssuer()).toBe(true);
		});
	});

	describe('isSsoIssuer', () => {
		it('should return true only for sso-derived sources matching the issuer', async () => {
			await insertSource({
				id: 'sso-source',
				managedBy: 'sso-derived',
				issuer: 'https://idp.example.com',
			});
			await insertSource({ id: 'static', managedBy: 'env-config', issuer: null });

			expect(await service.isSsoIssuer('https://idp.example.com')).toBe(true);
			expect(await service.isSsoIssuer('https://issuer.example.com')).toBe(false);
		});
	});
});
