import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { UserRepository, WebauthnCredentialRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AUTH_COOKIE_NAME } from '@/constants';

import {
	buildAuthenticationResponse,
	buildRegistrationResponse,
	generateAuthenticator,
	type WebAuthnAuthenticator,
} from './webauthn-test-helper';
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

/**
 * Full registration ceremony: fetch a challenge, build a signed response,
 * verify. Returns the authenticator (so tests can sign assertions later) and
 * the credential row id assigned by the server.
 */
async function registerCredentialFor(
	user: User,
	attachment: 'platform' | 'cross-platform',
	label = `cred-${attachment}`,
): Promise<{ authenticator: WebAuthnAuthenticator; credentialRowId: string }> {
	const authenticator = generateAuthenticator();
	const challenge = await fetchRegistrationChallenge(user, attachment);
	const response = buildRegistrationResponse({
		authenticator,
		challenge,
		origin: ORIGIN,
		rpId: RP_ID,
		attachment,
	});
	const res = await testServer
		.authAgentFor(user)
		.post('/mfa/webauthn/registration-verify')
		.send({ label, response, attachment })
		.expect(200);
	return { authenticator, credentialRowId: res.body.data.id as string };
}

async function fetchAuthChallenge(user: User): Promise<string> {
	const res = await testServer.authlessAgent
		.post('/mfa/webauthn/authentication-options')
		.send({ email: user.email })
		.expect(200);
	return res.body.data.challenge as string;
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
		// WebAuthn registration never returns recovery codes — those belong to
		// the TOTP setup flow only.
		expect(httpRes.body.data.recoveryCodes).toBeUndefined();

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

	test('persists multiple passkey registrations side by side', async () => {
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

		const secondAuth = generateAuthenticator();
		const secondChallenge = await fetchRegistrationChallenge(owner, 'platform');
		await testServer
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

describe('WebAuthn authentication assertion (real crypto)', () => {
	// Authentication assertions are verified by `WebAuthnService.verifyAuthenticationResponse`,
	// reachable from any endpoint that takes a `webauthnResponse` proof. We
	// drive it through `POST /mfa/webauthn/credentials/:id/remove` because
	// that's the simplest endpoint that exercises the full path (challenge
	// from `/authentication-options` → assertion verify → counter update).

	const removeCredential = (
		user: User,
		credentialRowId: string,
		response: ReturnType<typeof buildAuthenticationResponse>,
	) =>
		testServer
			.authAgentFor(user)
			.post(`/mfa/webauthn/credentials/${credentialRowId}/remove`)
			.send({ webauthnResponse: response });

	test('accepts a valid passkey assertion (UV required)', async () => {
		// Register two credentials so removing one isn't blocked by the
		// "would leave 0 auth on enforced MFA" guard.
		const passkey = await registerCredentialFor(owner, 'platform', 'passkey');
		await registerCredentialFor(owner, 'platform', 'second passkey');

		const challenge = await fetchAuthChallenge(owner);
		const assertion = buildAuthenticationResponse({
			authenticator: passkey.authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			counter: 1,
			userVerified: true,
		});

		await removeCredential(owner, passkey.credentialRowId, assertion).expect(200);

		// Credential row was deleted after a successful verify-then-remove.
		// Counter / `lastUsedAt` side effects are asserted in the
		// passwordless-login tests where the row stays put.
		expect(await credentialRepo.findOne({ where: { id: passkey.credentialRowId } })).toBeNull();
	});

	test('accepts a security-key assertion without user verification (UV optional)', async () => {
		// Match the service's `requireUserVerification = isPlatformCredential(c)`
		// branch: security keys aren't platform credentials so the verify path
		// must accept an assertion with `UV=0`.
		const securityKey = await registerCredentialFor(owner, 'cross-platform', 'yubikey');
		await registerCredentialFor(owner, 'platform', 'backup passkey');

		const challenge = await fetchAuthChallenge(owner);
		const assertion = buildAuthenticationResponse({
			authenticator: securityKey.authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			counter: 1,
			userVerified: false,
		});

		await removeCredential(owner, securityKey.credentialRowId, assertion).expect(200);
	});

	test('rejects a passkey assertion missing the user-verified flag', async () => {
		// Mirror image of the case above: passkeys must be UV — sending
		// `UV=0` must fail verification.
		const passkey = await registerCredentialFor(owner, 'platform', 'passkey');
		await registerCredentialFor(owner, 'platform', 'backup');

		const challenge = await fetchAuthChallenge(owner);
		const assertion = buildAuthenticationResponse({
			authenticator: passkey.authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			counter: 1,
			userVerified: false,
		});

		// Missing UV makes `@simplewebauthn/server` throw, which the router
		// maps to 500. Pinning current behaviour — same 400-vs-500 note as
		// the registration tests.
		await removeCredential(owner, passkey.credentialRowId, assertion).expect(500);
		// Row still exists.
		expect(await credentialRepo.findOne({ where: { id: passkey.credentialRowId } })).not.toBeNull();
	});

	test('rejects an assertion signed with the wrong private key', async () => {
		const passkey = await registerCredentialFor(owner, 'platform', 'passkey');
		await registerCredentialFor(owner, 'platform', 'backup');

		// Generate an unrelated authenticator, then sign as if we were the
		// real one. `@simplewebauthn/server` recomputes the digest against
		// the stored COSE public key — `verify()` returns false (no throw,
		// well-formed DER signature is just invalid for this key), and the
		// controller surfaces it as 400 "Invalid two-factor proof".
		const attacker = generateAuthenticator();

		const challenge = await fetchAuthChallenge(owner);
		const assertion = buildAuthenticationResponse({
			authenticator: passkey.authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			counter: 1,
			userVerified: true,
			signWithKey: attacker.privateKey,
		});

		await removeCredential(owner, passkey.credentialRowId, assertion).expect(400);
	});

	test('rejects an assertion whose signature byte has been tampered', async () => {
		// Canary that proves we exercise the signature path. The DER envelope
		// stays valid; only the trailing byte flips, so verification fails on
		// integrity rather than on a parser error.
		const passkey = await registerCredentialFor(owner, 'platform', 'passkey');
		await registerCredentialFor(owner, 'platform', 'backup');

		const challenge = await fetchAuthChallenge(owner);
		const assertion = buildAuthenticationResponse({
			authenticator: passkey.authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			counter: 1,
			userVerified: true,
			tamperSignature: true,
		});

		// Same as wrong-key: `verify()` returns false → 400.
		await removeCredential(owner, passkey.credentialRowId, assertion).expect(400);
	});

	test('rejects an assertion whose rpIdHash does not match', async () => {
		const passkey = await registerCredentialFor(owner, 'platform', 'passkey');
		await registerCredentialFor(owner, 'platform', 'backup');

		const challenge = await fetchAuthChallenge(owner);
		const assertion = buildAuthenticationResponse({
			authenticator: passkey.authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			counter: 1,
			userVerified: true,
			rpIdHashOverride: 'evil.example',
		});

		// The service throws a plain Error here, which the router maps to 500.
		// Pinning current behaviour — see registration tests for the same
		// 400-vs-500 note.
		await removeCredential(owner, passkey.credentialRowId, assertion).expect(500);
	});
});

describe('POST /login/webauthn/verify (passwordless, real crypto)', () => {
	type PasswordlessOptions = { challengeId: string; challenge: string };
	const fetchPasswordlessOptions = async (): Promise<PasswordlessOptions> => {
		const res = await testServer.authlessAgent.post('/login/webauthn/options').expect(200);
		return {
			challengeId: res.body.data.challengeId as string,
			challenge: res.body.data.challenge as string,
		};
	};

	test('signs the user in and increments the credential counter + lastUsedAt', async () => {
		const passkey = await registerCredentialFor(owner, 'platform', 'passkey');

		const { challengeId, challenge } = await fetchPasswordlessOptions();
		const assertion = buildAuthenticationResponse({
			authenticator: passkey.authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			counter: 7,
			userVerified: true,
		});

		const res = await testServer.authlessAgent
			.post('/login/webauthn/verify')
			.send({ challengeId, response: assertion })
			.expect(200);

		// Public user payload returned + cookie set.
		expect(res.body.data.id).toBe(owner.id);
		const setCookie = res.headers['set-cookie'];
		const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
		expect(cookies.some((c) => typeof c === 'string' && c.startsWith(`${AUTH_COOKIE_NAME}=`))).toBe(
			true,
		);

		// Counter + lastUsedAt persisted on the credential row.
		const after = await credentialRepo.findOneByOrFail({ id: passkey.credentialRowId });
		expect(after.counter).toBe(7);
		expect(after.lastUsedAt).toBeInstanceOf(Date);
	});

	test('rejects a passwordless assertion signed with the wrong key', async () => {
		const passkey = await registerCredentialFor(owner, 'platform', 'passkey');
		const attacker = generateAuthenticator();

		const { challengeId, challenge } = await fetchPasswordlessOptions();
		const assertion = buildAuthenticationResponse({
			authenticator: passkey.authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			counter: 1,
			userVerified: true,
			signWithKey: attacker.privateKey,
		});

		await testServer.authlessAgent
			.post('/login/webauthn/verify')
			.send({ challengeId, response: assertion })
			.expect(401);

		// No counter advance on failed verify.
		const after = await credentialRepo.findOneByOrFail({ id: passkey.credentialRowId });
		expect(after.counter).toBe(0);
	});

	test('rejects passwordless login when the user is disabled', async () => {
		const passkey = await registerCredentialFor(owner, 'platform', 'passkey');
		await userRepo.update(owner.id, { disabled: true });

		const { challengeId, challenge } = await fetchPasswordlessOptions();
		const assertion = buildAuthenticationResponse({
			authenticator: passkey.authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			counter: 1,
			userVerified: true,
		});

		await testServer.authlessAgent
			.post('/login/webauthn/verify')
			.send({ challengeId, response: assertion })
			.expect(401);
	});

	test('rejects passwordless login when the credentialId is unknown', async () => {
		// Register a real credential, then forge a response from an unrelated
		// authenticator — its credentialId is not in any row.
		await registerCredentialFor(owner, 'platform', 'passkey');
		const stranger = generateAuthenticator();

		const { challengeId, challenge } = await fetchPasswordlessOptions();
		const assertion = buildAuthenticationResponse({
			authenticator: stranger,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			counter: 1,
			userVerified: true,
		});

		await testServer.authlessAgent
			.post('/login/webauthn/verify')
			.send({ challengeId, response: assertion })
			.expect(401);
	});

	test('rejects passwordless login when the challengeId is unknown', async () => {
		const passkey = await registerCredentialFor(owner, 'platform', 'passkey');

		const { challenge } = await fetchPasswordlessOptions();
		const assertion = buildAuthenticationResponse({
			authenticator: passkey.authenticator,
			challenge,
			origin: ORIGIN,
			rpId: RP_ID,
			counter: 1,
			userVerified: true,
		});

		// Well-formed UUID (passes DTO validation) but no matching cache entry.
		await testServer.authlessAgent
			.post('/login/webauthn/verify')
			.send({ challengeId: '00000000-0000-4000-8000-000000000000', response: assertion })
			.expect(401);
	});
});

describe('POST /mfa/webauthn/authentication-options (kind filter)', () => {
	const fetchOptions = async (email: string, kind?: 'passkey' | 'security_key') => {
		const res = await testServer.authlessAgent
			.post('/mfa/webauthn/authentication-options')
			.send({ email, ...(kind ? { kind } : {}) })
			.expect(200);
		return res.body.data as { allowCredentials: Array<{ id: string }> };
	};

	const credentialIdOf = async (rowId: string): Promise<string> =>
		(await credentialRepo.findOneByOrFail({ id: rowId })).credentialId;

	test('with no kind, allowCredentials lists all registered credentials', async () => {
		const passkey = await registerCredentialFor(owner, 'platform', 'passkey');
		const securityKey = await registerCredentialFor(owner, 'cross-platform', 'yubikey');

		const options = await fetchOptions(owner.email);
		const ids = options.allowCredentials.map((c) => c.id);
		expect(ids).toContain(await credentialIdOf(passkey.credentialRowId));
		expect(ids).toContain(await credentialIdOf(securityKey.credentialRowId));
	});

	test('with kind=passkey, allowCredentials lists only platform credentials', async () => {
		const passkey = await registerCredentialFor(owner, 'platform', 'passkey');
		await registerCredentialFor(owner, 'cross-platform', 'yubikey');

		const options = await fetchOptions(owner.email, 'passkey');
		expect(options.allowCredentials).toHaveLength(1);
		expect(options.allowCredentials[0].id).toBe(await credentialIdOf(passkey.credentialRowId));
	});

	test('with kind=security_key, allowCredentials lists only roaming credentials', async () => {
		await registerCredentialFor(owner, 'platform', 'passkey');
		const securityKey = await registerCredentialFor(owner, 'cross-platform', 'yubikey');

		const options = await fetchOptions(owner.email, 'security_key');
		expect(options.allowCredentials).toHaveLength(1);
		expect(options.allowCredentials[0].id).toBe(await credentialIdOf(securityKey.credentialRowId));
	});

	test('rejects requests without an email', async () => {
		await testServer.authlessAgent
			.post('/mfa/webauthn/authentication-options')
			.send({})
			.expect(400);
	});

	test('returns the MFA Error (998) when the user does not have MFA enabled', async () => {
		// Owner exists with `mfaEnabled: false` until a credential is registered.
		const res = await testServer.authlessAgent
			.post('/mfa/webauthn/authentication-options')
			.send({ email: owner.email });

		// Controller throws BadRequestError('MFA Error', 998); n8n's error
		// handler surfaces the numeric code separately from the HTTP status.
		expect(res.status).toBe(400);
		expect(res.body.code).toBe(998);
	});
});
