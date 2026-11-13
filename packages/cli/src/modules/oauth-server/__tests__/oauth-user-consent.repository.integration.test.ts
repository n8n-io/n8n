import { testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { createUser } from '@test-integration/db/users';

import { OAuthClient } from '../database/entities/oauth-client.entity';
import { UserConsentRepository } from '../database/repositories/oauth-user-consent.repository';

const MIN_INTERVAL_MS = 60_000;
const USED_AT = new Date('2026-11-13T10:00:00.000Z');
const at = (offsetMs: number) => new Date(USED_AT.getTime() + offsetMs);

let consents: UserConsentRepository;
let user: User;
const clientId = 'last-used-client';

const lastUsedAt = async () =>
	(await consents.findOneBy({ userId: user.id, clientId }))?.lastUsedAt ?? null;

beforeAll(async () => {
	await testModules.loadModules(['oauth-server']);
	await testDb.init();
	consents = Container.get(UserConsentRepository);
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
});

afterEach(async () => {
	await testDb.truncate(['OAuthClient', 'UserConsent']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('UserConsentRepository.recordLastUsed', () => {
	test('sets the time on a grant that was never used', async () => {
		await consents.recordLastUsed(user.id, clientId, USED_AT, MIN_INTERVAL_MS);

		expect(await lastUsedAt()).toEqual(USED_AT);
	});

	test('skips a write inside the interval and writes after it', async () => {
		await consents.recordLastUsed(user.id, clientId, USED_AT, MIN_INTERVAL_MS);
		await consents.recordLastUsed(user.id, clientId, at(59_000), MIN_INTERVAL_MS);

		expect(await lastUsedAt()).toEqual(USED_AT);

		await consents.recordLastUsed(user.id, clientId, at(61_000), MIN_INTERVAL_MS);

		expect(await lastUsedAt()).toEqual(at(61_000));
	});

	test('never moves the time backwards', async () => {
		await consents.recordLastUsed(user.id, clientId, at(5 * 60_000), MIN_INTERVAL_MS);
		await consents.recordLastUsed(user.id, clientId, USED_AT, MIN_INTERVAL_MS);

		expect(await lastUsedAt()).toEqual(at(5 * 60_000));
	});

	test('writes the first use of a grant that was revoked and created again', async () => {
		await consents.recordLastUsed(user.id, clientId, USED_AT, MIN_INTERVAL_MS);
		await consents.delete({ userId: user.id, clientId });
		await consents.saveGrant(user.id, clientId, ['workflow:read'], {});

		expect(await lastUsedAt()).toBeNull();

		await consents.recordLastUsed(user.id, clientId, at(1_000), MIN_INTERVAL_MS);

		expect(await lastUsedAt()).toEqual(at(1_000));
	});

	test('does nothing for a missing grant', async () => {
		await expect(
			consents.recordLastUsed(user.id, 'missing-client', USED_AT, MIN_INTERVAL_MS),
		).resolves.toBeUndefined();
	});
});
