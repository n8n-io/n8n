import { Logger } from '@n8n/backend-common';
import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { DeploymentKey, DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';
import { createLocalJWKSet, jwtVerify } from 'jose';
import { Cipher, InstanceSettings } from 'n8n-core';
import { generateKeyPairSync } from 'node:crypto';

import { JwtService } from '@/services/jwt.service';

import {
	OAUTH_SIGNING_ALGORITHM,
	OAUTH_SIGNING_KEY_TYPE,
	RETIRED_SIGNING_KEY_GRACE_MS,
} from '../oauth-signing-key.constants';
import { OAuthSigningKeyService } from '../oauth-signing-key.service';

const ISSUER = 'https://n8n.example.com';
const AUDIENCE = `${ISSUER}/mcp-server/http`;

let keyStore: Repository<DeploymentKey>;

/** A process of its own: its own in-memory public keys and private key. */
const createProcess = () =>
	new OAuthSigningKeyService(
		Container.get(DeploymentKeyRepository),
		Container.get(Cipher),
		Container.get(Logger),
		Container.get(JwtService),
	);

/** The audience is passed to `signAccessToken` on its own. */
const claims = () => {
	const now = Math.floor(Date.now() / 1000);
	return { iss: ISSUER, sub: 'user-1', iat: now, exp: now + 3600 };
};

const activeRows = async () =>
	await keyStore.find({ where: { type: OAUTH_SIGNING_KEY_TYPE, status: 'active' } });

beforeAll(async () => {
	mockInstance(InstanceSettings, {
		encryptionKey: 'oauth-signing-test-encryption-key',
		n8nFolder: '/tmp/n8n-test',
	});
	await testDb.init();
	keyStore = Container.get(DataSource).getRepository(DeploymentKey);
});

beforeEach(async () => {
	await testDb.resetDeploymentKeys();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('OAuthSigningKeyService (integration)', () => {
	it('persists one wrapped active key whose kid is the row id', async () => {
		await createProcess().initialize();

		const rows = await activeRows();
		expect(rows).toHaveLength(1);
		expect(rows[0].algorithm).toBe(OAUTH_SIGNING_ALGORITHM);
		const jwk = JSON.parse(Container.get(Cipher).decryptDEKWithInstanceKey(rows[0].value)) as {
			kid?: string;
			use?: string;
		};
		expect(jwk).toMatchObject({ kid: rows[0].id, use: 'sig' });
	});

	it('keeps the key across a restart, and the restarted process verifies older tokens', async () => {
		const before = createProcess();
		await before.initialize();
		const token = before.signAccessToken(claims(), AUDIENCE);

		const after = createProcess();
		await after.initialize();

		expect(await activeRows()).toHaveLength(1);
		expect(await after.getPublicJwks()).toEqual(await before.getPublicJwks());
		const [{ kid }] = await after.getPublicJwks();
		await expect(
			after.verifyAccessToken(token, { kid, audiences: [AUDIENCE], issuer: ISSUER }),
		).resolves.toMatchObject({ sub: 'user-1' });
	});

	it('keeps one active key when two processes initialize at the same time', async () => {
		// Hold both inserts until both processes reach them, so both read "no key"
		// and the unique index must decide the race.
		const repository = Container.get(DeploymentKeyRepository);
		const insert = repository.insertActiveOAuthSigningKey.bind(repository);
		let arrived = 0;
		let releaseAll = () => {};
		const released = new Promise<void>((resolve) => {
			releaseAll = resolve;
		});
		const insertSpy = vi
			.spyOn(repository, 'insertActiveOAuthSigningKey')
			.mockImplementation(async (...args) => {
				if (++arrived === 2) releaseAll();
				await released;
				await insert(...args);
			});
		const processes = [createProcess(), createProcess()];

		let insertAttempts = 0;
		try {
			await Promise.all(processes.map(async (p) => await p.initialize()));
			insertAttempts = insertSpy.mock.calls.length;
		} finally {
			insertSpy.mockRestore();
		}

		expect(insertAttempts).toBe(2);
		const rows = await activeRows();
		expect(rows).toHaveLength(1);
		for (const p of processes) {
			const keys = await p.getPublicJwks();
			expect(keys.map((k) => k.kid)).toEqual([rows[0].id]);
			// Both processes sign with the winner's private key.
			await expect(
				jwtVerify(p.signAccessToken(claims(), AUDIENCE), createLocalJWKSet({ keys }), {
					issuer: ISSUER,
					audience: AUDIENCE,
				}),
			).resolves.toBeDefined();
		}
	});

	it('publishes no private members, and jose verifies its tokens against the JWKS', async () => {
		const service = createProcess();
		await service.initialize();

		const keys = await service.getPublicJwks();
		expect(Object.keys(keys[0]).sort()).toEqual(['alg', 'crv', 'kid', 'kty', 'use', 'x', 'y']);

		const { payload } = await jwtVerify(
			service.signAccessToken(claims(), AUDIENCE),
			createLocalJWKSet({ keys }),
			{
				issuer: ISSUER,
				audience: AUDIENCE,
				typ: 'at+jwt',
				algorithms: ['ES256'],
			},
		);
		expect(payload.sub).toBe('user-1');
	});

	it('publishes a retired key only within the grace window', async () => {
		const cipher = Container.get(Cipher);
		const insertRetired = async (id: string, retiredAt: Date) => {
			const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
			const jwk = { ...privateKey.export({ format: 'jwk' }), kid: id, alg: 'ES256', use: 'sig' };
			await keyStore.insert({
				id,
				type: OAUTH_SIGNING_KEY_TYPE,
				value: cipher.encryptDEKWithInstanceKey(JSON.stringify(jwk)),
				algorithm: OAUTH_SIGNING_ALGORITHM,
				status: 'inactive',
				updatedAt: retiredAt,
			});
		};
		await insertRetired('recently-retired', new Date(Date.now() - 60_000));
		await insertRetired(
			'long-retired',
			new Date(Date.now() - RETIRED_SIGNING_KEY_GRACE_MS - 60_000),
		);

		const service = createProcess();
		await service.initialize();

		const kids = (await service.getPublicJwks()).map((k) => k.kid);
		expect(kids).toHaveLength(2);
		expect(kids).toContain('recently-retired');
		expect(kids).not.toContain('long-retired');
	});
});
