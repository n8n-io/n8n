import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { UserRepository, WebauthnCredentialRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AUTH_COOKIE_NAME } from '@/constants';

import { buildRegistrationResponse, generateAuthenticator } from './webauthn-test-helper';
import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils';

jest.mock('@/telemetry');

const testServer = utils.setupTestServer({ endpointGroups: ['mfa', 'auth'] });

let owner: User;
let credentialRepo: WebauthnCredentialRepository;
let userRepo: UserRepository;

// `WebAuthnService` derives `rpId` and `origin` from `UrlService` which reads
// `globalConfig.host`, `port`, `protocol`. The test server doesn't override
// these, so the defaults (`localhost`, `5678`, `http`) apply.
const RP_ID = 'localhost';
const ORIGIN = 'http://localhost:5678';

beforeAll(() => {
	credentialRepo = Container.get(WebauthnCredentialRepository);
	userRepo = Container.get(UserRepository);
	// Make sure no rpId/origin override is in effect from a prior test file.
	const cfg = Container.get(GlobalConfig);
	cfg.mfa.webauthn.rpId = '';
	cfg.mfa.webauthn.origin = '';
});

beforeEach(async () => {
	// Challenge cache entries are keyed by userId; truncating users gets us a
	// fresh user per test, so cached challenges from prior tests can't collide.
	await testDb.truncate(['WebauthnCredential', 'User']);
	owner = await createOwner();
	owner = await userRepo.findOneOrFail({ where: { id: owner.id }, relations: ['role'] });
});

afterAll(async () => {
	await testDb.terminate();
});

async function fetchRegistrationChallenge(
	user: User,
	attachment: 'platform' | 'cross-platform',
): Promise<string> {
	const response = await testServer
		.authAgentFor(user)
		.get(`/mfa/webauthn/registration-options?attachment=${attachment}`)
		.expect(200);
	return response.body.data.challenge as string;
}

describe('POST /mfa/webauthn/registration-verify (real crypto)', () => {
	test('registers a passkey for platform attachment and rotates the session', async () => {
		const authenticator = generateAuthenticator();
		const challenge = await fetchRegistrationChallenge(owner, 'platform');

		const response = buildRegistrationResponse({
			authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			attachment: 'platform',
		});

		const httpRes = await testServer
			.authAgentFor(owner)
			.post('/mfa/webauthn/registration-verify')
			.send({ label: 'My Mac', response, attachment: 'platform' })
			.expect(200);

		expect(httpRes.body.data).toMatchObject({
			label: 'My Mac',
			method: 'passkey',
		});
		expect(typeof httpRes.body.data.id).toBe('string');
		expect(typeof httpRes.body.data.credentialId).toBe('string');
		// First credential → recovery codes returned to the user.
		expect(Array.isArray(httpRes.body.data.recoveryCodes)).toBe(true);
		expect(httpRes.body.data.recoveryCodes.length).toBeGreaterThan(0);

		// Persisted as we expect.
		const credentials = await credentialRepo.find({ where: { userId: owner.id } });
		expect(credentials).toHaveLength(1);
		expect(credentials[0]).toMatchObject({
			label: 'My Mac',
			counter: 0,
			transports: ['internal'],
		});
		expect(credentials[0].publicKey).toBeInstanceOf(Buffer);
		expect(credentials[0].publicKey.length).toBeGreaterThan(0);

		// MFA enabled on the user.
		const updatedUser = await userRepo.findOneByOrFail({ id: owner.id });
		expect(updatedUser.mfaEnabled).toBe(true);

		// Session rotated → fresh auth cookie + bumped tokensValidAfter.
		const setCookie = httpRes.headers['set-cookie'];
		const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
		expect(cookies.some((c) => typeof c === 'string' && c.startsWith(`${AUTH_COOKIE_NAME}=`))).toBe(
			true,
		);
		expect(updatedUser.tokensValidAfter).toBeInstanceOf(Date);
	});

	test('does not regenerate recovery codes when the user already has them', async () => {
		// First registration generates recovery codes.
		const firstAuth = generateAuthenticator();
		const firstChallenge = await fetchRegistrationChallenge(owner, 'platform');
		await testServer
			.authAgentFor(owner)
			.post('/mfa/webauthn/registration-verify')
			.send({
				label: 'First',
				response: buildRegistrationResponse({
					authenticator: firstAuth,
					challenge: firstChallenge,
					origin: ORIGIN,
					rpId: RP_ID,
					attachment: 'platform',
				}),
				attachment: 'platform',
			})
			.expect(200);

		// Second registration should NOT return recovery codes.
		const secondAuth = generateAuthenticator();
		const secondChallenge = await fetchRegistrationChallenge(owner, 'platform');
		const secondRes = await testServer
			.authAgentFor(owner)
			.post('/mfa/webauthn/registration-verify')
			.send({
				label: 'Second',
				response: buildRegistrationResponse({
					authenticator: secondAuth,
					challenge: secondChallenge,
					origin: ORIGIN,
					rpId: RP_ID,
					attachment: 'platform',
				}),
				attachment: 'platform',
			})
			.expect(200);

		expect(secondRes.body.data.recoveryCodes).toBeUndefined();

		const credentials = await credentialRepo.find({ where: { userId: owner.id } });
		expect(credentials).toHaveLength(2);
	});

	test('registers a security key for cross-platform attachment', async () => {
		const authenticator = generateAuthenticator();
		const challenge = await fetchRegistrationChallenge(owner, 'cross-platform');

		const httpRes = await testServer
			.authAgentFor(owner)
			.post('/mfa/webauthn/registration-verify')
			.send({
				label: 'YubiKey',
				response: buildRegistrationResponse({
					authenticator,
					challenge,
					origin: ORIGIN,
					rpId: RP_ID,
					attachment: 'cross-platform',
				}),
				attachment: 'cross-platform',
			})
			.expect(200);

		expect(httpRes.body.data.method).toBe('security_key');

		const credentials = await credentialRepo.find({ where: { userId: owner.id } });
		expect(credentials).toHaveLength(1);
		expect(credentials[0].transports).toEqual(['usb']);
	});

	// The two negative-path tests below assert 500 rather than 400 because
	// `@simplewebauthn/server` throws a plain `Error` (not a `BadRequestError`)
	// on adversarial input and the controller currently surfaces it as a 500.
	// Mapping those throws to 400 is a separate code-quality fix — these tests
	// pin current behaviour so the regression is visible if either side changes.
	test('rejects a response whose rpIdHash does not match the configured rpId', async () => {
		const authenticator = generateAuthenticator();
		const challenge = await fetchRegistrationChallenge(owner, 'platform');

		const tampered = buildRegistrationResponse({
			authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			attachment: 'platform',
			// authData hashes `evil.example` rather than `localhost`, so the
			// library rejects it as an RP mismatch. Real-crypto canary: proves
			// we're exercising the full binary parser, not silently passing.
			rpIdHashOverride: 'evil.example',
		});

		await testServer
			.authAgentFor(owner)
			.post('/mfa/webauthn/registration-verify')
			.send({ label: 'spoofed', response: tampered, attachment: 'platform' })
			.expect(500);

		expect(await credentialRepo.count({ where: { userId: owner.id } })).toBe(0);
		const user = await userRepo.findOneByOrFail({ id: owner.id });
		expect(user.mfaEnabled).toBe(false);
	});

	test('rejects a response without the user-presence flag set', async () => {
		const authenticator = generateAuthenticator();
		const challenge = await fetchRegistrationChallenge(owner, 'platform');

		const noUp = buildRegistrationResponse({
			authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			attachment: 'platform',
			flagOverrides: { up: false },
		});

		await testServer
			.authAgentFor(owner)
			.post('/mfa/webauthn/registration-verify')
			.send({ label: 'no-up', response: noUp, attachment: 'platform' })
			.expect(500);

		expect(await credentialRepo.count({ where: { userId: owner.id } })).toBe(0);
	});

	test('rejects a registration whose challenge is no longer in the cache', async () => {
		const authenticator = generateAuthenticator();
		const challenge = await fetchRegistrationChallenge(owner, 'platform');

		const response = buildRegistrationResponse({
			authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			attachment: 'platform',
		});

		// First verify consumes the cached challenge.
		await testServer
			.authAgentFor(owner)
			.post('/mfa/webauthn/registration-verify')
			.send({ label: 'first', response, attachment: 'platform' })
			.expect(200);

		// Replaying the same response without a fresh `/registration-options` call
		// must fail — the cache entry has been deleted by the first verify.
		const second = buildRegistrationResponse({
			authenticator: generateAuthenticator(),
			challenge, // same stale challenge
			origin: ORIGIN,
			rpId: RP_ID,
			attachment: 'platform',
		});
		await testServer
			.authAgentFor(owner)
			.post('/mfa/webauthn/registration-verify')
			.send({ label: 'replay', response: second, attachment: 'platform' })
			.expect(500);

		expect(await credentialRepo.count({ where: { userId: owner.id } })).toBe(1);
	});
});
