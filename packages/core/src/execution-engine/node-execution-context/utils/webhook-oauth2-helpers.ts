import { Container } from '@n8n/di';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';

import { Cipher } from '../../../encryption/cipher';

const STATE_TTL_MS = 5 * 60 * 1000;

const webhookOAuth2StateSchema = z.object({
	returnUrl: z.string(),
	iat: z.number(),
	cv: z.string().optional(),
});

type WebhookOAuth2StatePayload = z.infer<typeof webhookOAuth2StateSchema>;

/** Encrypt OAuth2 state carrying the form's return URL and optional PKCE code_verifier. */
export function createWebhookOAuth2State(returnUrl: string, codeVerifier?: string): string {
	const payload: WebhookOAuth2StatePayload = { returnUrl, iat: Date.now() };
	if (codeVerifier) payload.cv = codeVerifier;
	return Container.get(Cipher).encrypt(JSON.stringify(payload));
}

/** Decrypt and validate the OAuth2 state. Returns null if invalid, tampered, or expired. */
export function verifyWebhookOAuth2State(
	state: string,
): { returnUrl: string; codeVerifier?: string } | null {
	try {
		const plaintext = Container.get(Cipher).decrypt(state);
		const payload = webhookOAuth2StateSchema.parse(JSON.parse(plaintext));
		if (Date.now() - payload.iat > STATE_TTL_MS) return null;
		return { returnUrl: payload.returnUrl, codeVerifier: payload.cv };
	} catch {
		return null;
	}
}

export function generatePKCECodeVerifier(): string {
	return randomBytes(32).toString('base64url');
}

export function generatePKCECodeChallenge(verifier: string): string {
	return createHash('sha256').update(verifier).digest('base64url');
}
