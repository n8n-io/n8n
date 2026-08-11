process.env.N8N_ENV_FEAT_IDENTITY_SUBSTRATE = 'true';

import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import jwt from 'jsonwebtoken';
import { InstanceSettings } from 'n8n-core';
import { generateKeyPairSync, randomUUID } from 'node:crypto';

import { TrustedKeySourceEntity } from '@/modules/identity-substrate/database/entities/trusted-key-source.entity';
import { TrustedKeyEntity } from '@/modules/identity-substrate/database/entities/trusted-key.entity';
import { TrustedKeySourceRepository } from '@/modules/identity-substrate/database/repositories/trusted-key-source.repository';
import { TrustedKeyRepository } from '@/modules/identity-substrate/database/repositories/trusted-key.repository';
import { IdentitySubstrateModule } from '@/modules/identity-substrate/identity-substrate.module';
import { ExternalTokenVerifierProxy } from '@/services/external-token-verifier-proxy.service';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
	modulusLength: 2048,
	publicKeyEncoding: { type: 'spki', format: 'pem' },
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const ISSUER = 'https://worker-verify-issuer.example.com';
const AUDIENCE = 'n8n';
const KID = 'worker-verify-kid';

/**
 * Proves the ticket's core premise directly: `IdentitySubstrateModule`'s
 * `instanceTypes: ['main', 'worker', 'webhook']` is what turns on inbound
 * verification for `establishExecutionContext` on workers and manual-offload
 * executions (queue mode). Before this split, `TokenExchangeModule` was
 * `instanceTypes: ['main']`, so on a worker `init()` never ran and the
 * verifier was never registered - a bearer token presented to a worker-side
 * execution would silently resolve to "no claim".
 *
 * Seeds the trusted-key tables directly rather than via
 * `TrustedKeySyncService.initialize()` - that write/refresh lifecycle is
 * guarded to `instanceType === 'main'` inside `IdentitySubstrateModule.init()`
 * and deliberately never runs here, mirroring how a worker in production
 * only ever reads keys a leader `main` already synced.
 */
describe('Worker-side inbound verification (integration)', () => {
	beforeAll(async () => {
		await testModules.loadModules(['identity-substrate']);
		await testDb.init();

		const instanceSettings = Container.get(InstanceSettings);
		Object.defineProperty(instanceSettings, 'instanceType', {
			value: 'worker',
			configurable: true,
		});

		await Container.get(TrustedKeySourceRepository).save(
			Object.assign(new TrustedKeySourceEntity(), {
				id: 'static',
				type: 'static',
				config: '[]',
				status: 'healthy',
				lastError: null,
				lastRefreshedAt: new Date(),
			}),
		);
		await Container.get(TrustedKeyRepository).save(
			Object.assign(new TrustedKeyEntity(), {
				sourceId: 'static',
				kid: KID,
				data: JSON.stringify({
					algorithms: ['RS256'],
					keyMaterial: publicKey,
					issuer: ISSUER,
					expectedAudience: AUDIENCE,
					requireVerifiedEmail: false,
				}),
				createdAt: new Date(),
			}),
		);

		await new IdentitySubstrateModule().init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('registers the verifier and resolves a claim from a worker instance', async () => {
		const now = Math.floor(Date.now() / 1000);
		const token = jwt.sign(
			{
				sub: 'ext-worker-user',
				iss: ISSUER,
				aud: AUDIENCE,
				iat: now,
				exp: now + 300,
				jti: randomUUID(),
			},
			privateKey,
			{ algorithm: 'RS256', keyid: KID },
		);

		const result = await Container.get(ExternalTokenVerifierProxy).verifyExternalToken(
			token,
			AUDIENCE,
		);

		expect(result.claim).toMatchObject({ issuer: ISSUER, subject: 'ext-worker-user' });
	});

	it('never wrote to the trusted key source table beyond the manually-seeded row (write lifecycle stayed off)', async () => {
		const sources = await Container.get(TrustedKeySourceRepository).find();
		expect(sources).toHaveLength(1);
		expect(sources[0].id).toBe('static');
	});
});
