import { testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { createUser } from '@test-integration/db/users';

import { OAuthClient } from '../database/entities/oauth-client.entity';
import { AccessTokenRepository } from '../database/repositories/oauth-access-token.repository';
import { UserConsentRepository } from '../database/repositories/oauth-user-consent.repository';

const MIN_INTERVAL_MS = 60_000;
const USED_AT = new Date('2026-11-13T10:00:00.000Z');
const at = (offsetMs: number) => new Date(USED_AT.getTime() + offsetMs);

let consents: UserConsentRepository;
let accessTokens: AccessTokenRepository;
let user: User;
const clientId = 'last-used-client';
const accessToken = 'access-token-1';

const lastUsedAt = async () =>
	(await consents.findOneBy({ userId: user.id, clientId }))?.lastUsedAt ?? null;

const recordLastUsed = async (usedAt: Date, token = accessToken, client = clientId) =>
	await consents.recordLastUsed({
		userId: user.id,
		clientId: client,
		accessToken: token,
		usedAt,
		minIntervalMs: MIN_INTERVAL_MS,
	});

/** Revokes the grant like `deleteClient` does: its tokens and its consent. */
const revokeGrant = async () => {
	await accessTokens.delete({ userId: user.id, clientId });
	await consents.delete({ userId: user.id, clientId });
};

beforeAll(async () => {
	await testModules.loadModules(['oauth-server']);
	await testDb.init();
	consents = Container.get(UserConsentRepository);
	accessTokens = Container.get(AccessTokenRepository);
	user = await createUser();
});

beforeEach(async () => {
	await Container.get(DataSource)
		.getRepository(OAuthClient)
		.save({
			id: clientId,
			name: 'Test client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});
	await consents.saveGrant(user.id, clientId, ['workflow:read'], {});
	await accessTokens.insertToken({ token: accessToken, userId: user.id, clientId }, {});
});

afterEach(async () => {
	await testDb.truncate(['AccessToken', 'OAuthClient', 'UserConsent']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('UserConsentRepository.recordLastUsed', () => {
	test('sets the time on a grant that was never used', async () => {
		await recordLastUsed(USED_AT);

		expect(await lastUsedAt()).toEqual(USED_AT);
	});

	test('skips a write inside the interval and writes after it', async () => {
		await recordLastUsed(USED_AT);
		await recordLastUsed(at(59_000));

		expect(await lastUsedAt()).toEqual(USED_AT);

		await recordLastUsed(at(61_000));

		expect(await lastUsedAt()).toEqual(at(61_000));
	});

	test('writes a use exactly at the interval boundary', async () => {
		await recordLastUsed(USED_AT);
		await recordLastUsed(at(MIN_INTERVAL_MS));

		expect(await lastUsedAt()).toEqual(at(MIN_INTERVAL_MS));
	});

	test('never moves the time backwards', async () => {
		await recordLastUsed(at(5 * 60_000));
		await recordLastUsed(USED_AT);

		expect(await lastUsedAt()).toEqual(at(5 * 60_000));
	});

	test('writes the first use of a grant that was revoked and created again', async () => {
		await recordLastUsed(USED_AT);
		await revokeGrant();
		await consents.saveGrant(user.id, clientId, ['workflow:read'], {});
		await accessTokens.insertToken({ token: 'access-token-2', userId: user.id, clientId }, {});

		expect(await lastUsedAt()).toBeNull();

		await recordLastUsed(at(1_000), 'access-token-2');

		expect(await lastUsedAt()).toEqual(at(1_000));
	});

	test('does not stamp a recreated grant with a use of the revoked grant', async () => {
		await revokeGrant();
		await consents.saveGrant(user.id, clientId, ['workflow:read'], {});
		await accessTokens.insertToken({ token: 'access-token-2', userId: user.id, clientId }, {});

		// A request admitted with the old token before revocation, or its delayed write.
		await recordLastUsed(USED_AT);
		await recordLastUsed(at(5 * 60_000));

		expect(await lastUsedAt()).toBeNull();
	});

	test('does not accept a token that belongs to another client', async () => {
		await Container.get(DataSource)
			.getRepository(OAuthClient)
			.save({
				id: 'other-client',
				name: 'Other client',
				redirectUris: ['https://example.com/callback'],
				grantTypes: ['authorization_code'],
				tokenEndpointAuthMethod: 'none',
			});
		await accessTokens.insertToken(
			{ token: 'other-client-token', userId: user.id, clientId: 'other-client' },
			{},
		);

		await recordLastUsed(USED_AT, 'other-client-token');

		expect(await lastUsedAt()).toBeNull();
	});

	test('does nothing for a missing grant', async () => {
		await expect(recordLastUsed(USED_AT, accessToken, 'missing-client')).resolves.toBeUndefined();
	});
});
