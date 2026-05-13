import { sign } from 'jsonwebtoken';

import {
	FORM_OAUTH_ISSUER,
	FORM_OAUTH_SESSION_JWT_EXPIRY_SEC,
	FORM_OAUTH_STATE_JWT_EXPIRY_SEC,
	generateFormOauthNonce,
	signFormOauthJwt,
	verifyFormOauthJwt,
	type FormOauthSessionJwtPayload,
	type FormOauthStateJwtPayload,
} from '../form-oauth-jwt';

const SECRET = 'test-secret-do-not-use-in-prod';

const stateJwtPayload: FormOauthStateJwtPayload = {
	nonce: 'a'.repeat(32),
	wf: 'wf-123',
	node: 'node-abc',
};

const sessionJwtPayload: FormOauthSessionJwtPayload = {
	wf: 'wf-123',
	node: 'node-abc',
	claims: { sub: 'user-1', email: 'jane@example.com', name: 'Jane Doe' },
};

describe('signFormOauthJwt / verifyFormOauthJwt', () => {
	it('round-trips a state JWT', () => {
		const token = signFormOauthJwt(stateJwtPayload, SECRET, FORM_OAUTH_STATE_JWT_EXPIRY_SEC);
		const decoded = verifyFormOauthJwt<FormOauthStateJwtPayload>(token, SECRET);

		expect(decoded).not.toBeNull();
		expect(decoded?.nonce).toBe(stateJwtPayload.nonce);
		expect(decoded?.wf).toBe(stateJwtPayload.wf);
		expect(decoded?.node).toBe(stateJwtPayload.node);
	});

	it('round-trips a session JWT', () => {
		const token = signFormOauthJwt(sessionJwtPayload, SECRET, FORM_OAUTH_SESSION_JWT_EXPIRY_SEC);
		const decoded = verifyFormOauthJwt<FormOauthSessionJwtPayload>(token, SECRET);

		expect(decoded).not.toBeNull();
		expect(decoded?.wf).toBe(sessionJwtPayload.wf);
		expect(decoded?.claims).toEqual(sessionJwtPayload.claims);
	});

	it('returns null for a token signed with a different secret', () => {
		const token = signFormOauthJwt(stateJwtPayload, SECRET, FORM_OAUTH_STATE_JWT_EXPIRY_SEC);
		expect(verifyFormOauthJwt(token, 'other-secret')).toBeNull();
	});

	it('returns null for a malformed token', () => {
		expect(verifyFormOauthJwt('not-a-jwt', SECRET)).toBeNull();
		expect(verifyFormOauthJwt('', SECRET)).toBeNull();
	});

	it('returns null when the issuer does not match', () => {
		const token = sign({ ...stateJwtPayload, iss: 'something-else' }, SECRET, {
			algorithm: 'HS256',
			expiresIn: 60,
		});
		expect(verifyFormOauthJwt(token, SECRET)).toBeNull();
	});

	it('returns null for an expired token', () => {
		// Sign a token that is already expired
		const token = sign(stateJwtPayload, SECRET, {
			algorithm: 'HS256',
			expiresIn: -1,
			issuer: FORM_OAUTH_ISSUER,
		});
		expect(verifyFormOauthJwt(token, SECRET)).toBeNull();
	});

	it('returns null when the signing algorithm differs from HS256 (e.g. `none` attack)', () => {
		const token = sign(stateJwtPayload, '', {
			algorithm: 'none',
			expiresIn: 60,
			issuer: FORM_OAUTH_ISSUER,
		});
		expect(verifyFormOauthJwt(token, SECRET)).toBeNull();
	});

	it('returns null for a token with a tampered payload', () => {
		const token = signFormOauthJwt(stateJwtPayload, SECRET, FORM_OAUTH_STATE_JWT_EXPIRY_SEC);
		const [header, , signature] = token.split('.');
		const tamperedPayloadB64 = Buffer.from(
			JSON.stringify({ ...stateJwtPayload, wf: 'attacker-wf', iss: FORM_OAUTH_ISSUER }),
		).toString('base64url');
		const tampered = [header, tamperedPayloadB64, signature].join('.');

		expect(verifyFormOauthJwt(tampered, SECRET)).toBeNull();
	});
});

describe('generateFormOauthNonce', () => {
	it('returns a 32-character hex string', () => {
		const nonce = generateFormOauthNonce();
		expect(nonce).toMatch(/^[0-9a-f]{32}$/);
	});

	it('produces unique values on repeated calls', () => {
		const a = generateFormOauthNonce();
		const b = generateFormOauthNonce();
		expect(a).not.toBe(b);
	});
});
