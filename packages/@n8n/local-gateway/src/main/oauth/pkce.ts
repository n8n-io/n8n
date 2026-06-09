import { createHash, randomBytes } from 'node:crypto';

/**
 * PKCE (RFC 7636) + CSRF helpers. Pure functions — no shared state, so each
 * authorization attempt gets its own independent verifier/challenge/state.
 */

/** A high-entropy `code_verifier` (43 chars, base64url — within the RFC's 43–128 range). */
export function createCodeVerifier(): string {
	return randomBytes(32).toString('base64url');
}

/** The S256 `code_challenge` for a given verifier: base64url(SHA-256(verifier)). */
export function deriveCodeChallenge(verifier: string): string {
	return createHash('sha256').update(verifier).digest('base64url');
}

/** An opaque `state` value used to bind the callback to the request (CSRF defense). */
export function createState(): string {
	return randomBytes(16).toString('base64url');
}
