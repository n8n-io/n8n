import { CacheService, UrlService } from '@n8n/backend-services';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import {
	AuthenticationService,
	JwkSchema,
	trustedSourceConfigSchemaFor,
	type Extracted,
	type ManagedBy,
	type TrustedSourceMetadata,
} from '@n8n/inbound-auth';
import { DataSource, type Repository } from '@n8n/typeorm';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { CryptoKey, JWTPayload } from 'jose';
import { Cipher } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { TrustedSourceEntity } from '@/modules/inbound-auth-core/database/entities/trusted-source.entity';
import { InboundAuthCoreModule } from '@/modules/inbound-auth-core/inbound-auth-core.module';
import { TrustedSourceDiscoveryService } from '@/modules/inbound-auth-core/trusted-source-discovery.service';

const RESOURCE = 'https://n8n.example/mcp';
const ADMIN_ISSUER = 'https://idp.example';

let cipher: Cipher;
let cacheService: CacheService;
let rows: Repository<TrustedSourceEntity>;
let service: AuthenticationService;
let privateKey: CryptoKey;
let jwksDocument: TrustedSourceMetadata['documents'][number];

type Row = { id: string; issuer: string };
let seeded: Record<ManagedBy, Row>;

const now = () => Math.floor(Date.now() / 1000);

async function sign(issuer: string, claims: JWTPayload = {}, kid = 'k1') {
	const iat = now();
	return await new SignJWT({
		iss: issuer,
		sub: 'alice',
		aud: RESOURCE,
		iat,
		exp: iat + 3600,
		...claims,
	})
		.setProtectedHeader({ alg: 'ES256', kid, typ: 'at+jwt' })
		.sign(privateKey);
}

const extracted = (token: string): Extracted => ({
	surface: 'instance-mcp',
	resource: { url: RESOURCE, acceptedAudiences: [RESOURCE] },
	request: {
		method: 'POST',
		url: '/mcp',
		headers: { authorization: 'Bearer x' },
		ip: '203.0.113.7',
	},
	receivedAt: new Date(),
	credential: { kind: 'bearer', token },
});

async function seedRow(managedBy: ManagedBy, issuer: string): Promise<Row> {
	const config = trustedSourceConfigSchemaFor(managedBy).parse({
		version: 1,
		authentication: {
			type: 'oauth2',
			...(managedBy === 'system' && { keys: { kind: 'local-keystore' } }),
		},
		surfaces: { 'instance-mcp': {} },
	});
	const row = await rows.save(
		rows.create({
			name: `${managedBy}-source`,
			type: 'oauth2',
			issuer,
			managedBy,
			status: 'healthy',
			lastError: null,
			lastCheckedAt: new Date(),
			configVersion: 1,
			config: await cipher.encryptV2(config),
			metadata: JSON.stringify({ version: 1, documents: [jwksDocument] }),
			discoveryClaimToken: null,
			discoveryClaimedAt: null,
		}),
	);
	return { id: row.id, issuer };
}

beforeAll(async () => {
	await testModules.loadModules(['inbound-auth-core']);
	await testDb.init();

	cipher = Container.get(Cipher);
	cacheService = Container.get(CacheService);
	rows = Container.get(DataSource).getRepository(TrustedSourceEntity);
	await cacheService.init();

	// `loadModules` imports the module; the bindings come from `init`.
	Container.set(TrustedSourceDiscoveryService, mock<TrustedSourceDiscoveryService>());
	await new InboundAuthCoreModule().init();
	service = Container.get(AuthenticationService);

	const pair = await generateKeyPair('ES256');
	privateKey = pair.privateKey;
	const jwk = JwkSchema.parse({
		...(await exportJWK(pair.publicKey)),
		kid: 'k1',
		alg: 'ES256',
		use: 'sig',
	});
	jwksDocument = {
		kind: 'jwks',
		fetchedAt: new Date().toISOString(),
		url: 'https://idp.example/keys',
		keys: [jwk],
	};
});

beforeEach(async () => {
	await testDb.truncate(['TrustedSourceIdentityEntity', 'TrustedSourceEntity']);
	await cacheService.reset();
	seeded = {
		admin: await seedRow('admin', ADMIN_ISSUER),
		system: await seedRow('system', Container.get(UrlService).getInstanceBaseUrl()),
	};
});

afterAll(async () => {
	await testDb.terminate();
});

describe('AuthenticationService (integration)', () => {
	describe.each<ManagedBy>(['admin', 'system'])('%s-managed source', (managedBy) => {
		it('accepts a token signed for the resource and returns the stored source', async () => {
			const row = seeded[managedBy];

			const result = await service.authenticate(extracted(await sign(row.issuer)));

			expect(result).toMatchObject({
				ok: true,
				value: { source: { id: row.id, issuer: row.issuer }, claims: { sub: 'alice' } },
			});
		});

		it('rejects a token for another audience', async () => {
			const row = seeded[managedBy];

			const result = await service.authenticate(
				extracted(await sign(row.issuer, { aud: 'other' })),
			);

			expect(result).toMatchObject({ ok: false, reason: 'audience-mismatch' });
		});

		it('rejects an expired token', async () => {
			const row = seeded[managedBy];
			const token = await sign(row.issuer, { iat: now() - 7200, exp: now() - 3600 });

			const result = await service.authenticate(extracted(token));

			expect(result).toMatchObject({ ok: false, reason: 'expired' });
		});

		it('rejects a token signed with a key the source does not publish', async () => {
			const row = seeded[managedBy];

			const result = await service.authenticate(extracted(await sign(row.issuer, {}, 'k2')));

			expect(result).toMatchObject({ ok: false, reason: 'signature-invalid' });
		});
	});
});
