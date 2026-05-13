/**
 * Node-side helper for crafting valid WebAuthn responses in integration
 * tests, exercising the real `@simplewebauthn/server` verifier rather than
 * mocking it. Uses only built-in `crypto` + a tiny hand-rolled CBOR encoder
 * for the COSE_Key — no new npm deps.
 *
 * Chunk 1 ships only `buildRegistrationResponse`. `buildAuthenticationResponse`
 * lands with the authentication-ceremony chunk.
 *
 * Spec references: WebAuthn L3 §6.1 (authenticator data layout), §6.5
 * (attested credential data), and RFC 8152 (COSE_Key for ES256).
 */

import { createHash, generateKeyPairSync, randomBytes, type KeyObject } from 'crypto';

export type WebAuthnAuthenticator = {
	credentialId: Uint8Array;
	privateKey: KeyObject;
	publicKey: KeyObject;
	/** CBOR-encoded COSE_Key for ES256 (P-256). */
	cosePublicKey: Buffer;
	/** All-zero for self-attested credentials with `fmt: 'none'`. */
	aaguid: Uint8Array;
};

export function generateAuthenticator(): WebAuthnAuthenticator {
	const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });

	const jwk = publicKey.export({ format: 'jwk' });
	if (!jwk.x || !jwk.y) {
		throw new Error('Generated EC key is missing x/y components');
	}
	const x = Buffer.from(jwk.x, 'base64url');
	const y = Buffer.from(jwk.y, 'base64url');
	if (x.length !== 32 || y.length !== 32) {
		throw new Error(`Unexpected P-256 coordinate length: x=${x.length} y=${y.length}`);
	}

	const cosePublicKey = encodeCosePublicKey(x, y);

	// 16-byte credentialId — same size real authenticators use; arbitrary
	// content, just needs to be unique per authenticator.
	const credentialId = new Uint8Array(randomBytes(16));
	const aaguid = new Uint8Array(16);

	return { credentialId, privateKey, publicKey, cosePublicKey, aaguid };
}

export type BuildRegistrationOptions = {
	authenticator: WebAuthnAuthenticator;
	/** Base64url, exactly as returned by `/mfa/webauthn/registration-options`. */
	challenge: string;
	origin: string;
	rpId: string;
	attachment: 'platform' | 'cross-platform';
	/**
	 * Overrides for the authenticator data flag byte, used by negative tests.
	 * `up` defaults to true; `uv` defaults to true for platform.
	 */
	flagOverrides?: { up?: boolean; uv?: boolean };
	/** Override the rpIdHash before signing — used by the "mismatched RP" test. */
	rpIdHashOverride?: string;
};

/**
 * Build a `RegistrationResponseJSON` with `fmt: 'none'` attestation —
 * `@simplewebauthn/server` parses the binary layout, verifies the
 * rpIdHash + challenge round-trip + flag bits, and extracts the public key.
 * No signature verification is performed for `fmt: 'none'`, so we don't
 * need to sign the attestation statement.
 */
export function buildRegistrationResponse(opts: BuildRegistrationOptions) {
	const { authenticator, challenge, origin, rpId, attachment } = opts;

	const clientData = JSON.stringify({
		type: 'webauthn.create',
		challenge,
		origin,
		crossOrigin: false,
	});
	const clientDataJSON = Buffer.from(clientData, 'utf-8');

	const rpIdHash = createHash('sha256')
		.update(opts.rpIdHashOverride ?? rpId)
		.digest();

	const up = opts.flagOverrides?.up ?? true;
	// Platform authenticators (passkeys) require user verification; roaming
	// security keys may register without UV (no FIDO2 PIN set). Mirrors the
	// service's `requireUserVerification` decision.
	const uv = opts.flagOverrides?.uv ?? attachment === 'platform';
	const at = true; // attested credential data is always present on registration
	const flags = (up ? 0x01 : 0) | (uv ? 0x04 : 0) | (at ? 0x40 : 0);

	const counter = Buffer.alloc(4); // 0

	const credIdLen = Buffer.alloc(2);
	credIdLen.writeUInt16BE(authenticator.credentialId.length, 0);
	const attestedCredentialData = Buffer.concat([
		Buffer.from(authenticator.aaguid),
		credIdLen,
		Buffer.from(authenticator.credentialId),
		authenticator.cosePublicKey,
	]);

	const authData = Buffer.concat([rpIdHash, Buffer.from([flags]), counter, attestedCredentialData]);

	const attestationObject = encodeAttestationObjectNone(authData);

	const transports = attachment === 'platform' ? ['internal'] : ['usb'];

	return {
		id: toBase64Url(authenticator.credentialId),
		rawId: toBase64Url(authenticator.credentialId),
		response: {
			clientDataJSON: toBase64Url(clientDataJSON),
			attestationObject: toBase64Url(attestationObject),
			transports,
		},
		authenticatorAttachment: attachment,
		clientExtensionResults: {},
		type: 'public-key' as const,
	};
}

// --- CBOR encoders (minimal, only what we need) ---

/**
 * Encode the public key as a COSE_Key for ES256 (RFC 8152 §13.1):
 *   {1: 2, 3: -7, -1: 1, -2: <x>, -3: <y>}
 * That's a 5-entry CBOR map with mixed positive/negative integer keys.
 */
function encodeCosePublicKey(x: Buffer, y: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([0xa5]), // map(5)
		cborInt(1),
		cborInt(2), // kty: EC2
		cborInt(3),
		cborInt(-7), // alg: ES256
		cborInt(-1),
		cborInt(1), // crv: P-256
		cborInt(-2),
		cborBytes(x),
		cborInt(-3),
		cborBytes(y),
	]);
}

/** `{fmt:'none', attStmt:{}, authData:<bytes>}` */
function encodeAttestationObjectNone(authData: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([0xa3]), // map(3)
		cborText('fmt'),
		cborText('none'),
		cborText('attStmt'),
		Buffer.from([0xa0]), // map(0) — empty attStmt
		cborText('authData'),
		cborBytes(authData),
	]);
}

function cborInt(n: number): Buffer {
	if (n >= 0 && n <= 23) return Buffer.from([n]);
	if (n < 0 && n >= -24) return Buffer.from([0x20 + (-1 - n)]);
	if (n >= 0 && n <= 0xff) return Buffer.from([0x18, n]);
	throw new Error(`cborInt: ${n} not supported (kept tiny on purpose)`);
}

function cborBytes(buf: Buffer): Buffer {
	if (buf.length <= 23) return Buffer.concat([Buffer.from([0x40 + buf.length]), buf]);
	if (buf.length <= 0xff) return Buffer.concat([Buffer.from([0x58, buf.length]), buf]);
	if (buf.length <= 0xffff) {
		const len = Buffer.alloc(2);
		len.writeUInt16BE(buf.length, 0);
		return Buffer.concat([Buffer.from([0x59]), len, buf]);
	}
	throw new Error(`cborBytes: ${buf.length} too large`);
}

function cborText(s: string): Buffer {
	const buf = Buffer.from(s, 'utf-8');
	if (buf.length <= 23) return Buffer.concat([Buffer.from([0x60 + buf.length]), buf]);
	throw new Error(`cborText: ${s} too long`);
}

function toBase64Url(buf: Buffer | Uint8Array): string {
	return Buffer.from(buf).toString('base64url');
}
