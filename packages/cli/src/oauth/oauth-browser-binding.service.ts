import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import type { CookieOptions, Request, Response } from 'express';

export const OAUTH_BINDING_COOKIE_NAME = 'n8n-oauth-binding';

const NONCE_BYTES = 32;

export type BindingVerifyResult =
	| { ok: true }
	| { ok: false; reason: 'cookie-missing' | 'hash-mismatch' };

@Service()
export class OAuthBrowserBindingService {
	constructor(private readonly globalConfig: GlobalConfig) {}

	/** Whether binding should be applied to new flows. Callback-side verification is unconditional when a hash is present. */
	isEnabled(): boolean {
		return this.globalConfig.auth.oauthBrowserBinding;
	}

	/**
	 * Read or mint the browser-binding cookie. Returns the cookie nonce.
	 * Cookie attributes inherit Secure/SameSite from `globalConfig.auth.cookie`,
	 * with SameSite clamped to a `lax` minimum (strict would block the
	 * cross-site provider→n8n callback redirect).
	 * Session cookie (no Max-Age) so concurrent flows from the same browser
	 * share a nonce; binding evaporates when the browser closes.
	 */
	ensureBindingCookie(req: Request, res: Response): string {
		const existing = this.readCookie(req);
		if (existing) {
			return existing;
		}
		const nonce = randomBytes(NONCE_BYTES).toString('base64url');
		const { secure, samesite } = this.globalConfig.auth.cookie;
		const sameSite: CookieOptions['sameSite'] = samesite === 'strict' ? 'lax' : samesite;
		res.cookie(OAUTH_BINDING_COOKIE_NAME, nonce, {
			httpOnly: true,
			secure,
			sameSite,
			path: `/${this.globalConfig.endpoints.rest}`,
		});
		return nonce;
	}

	computeHash(nonce: string): string {
		return createHash('sha256').update(nonce).digest('base64url');
	}

	/**
	 * Verify the cookie against the hash captured at /auth. Returns a discriminated
	 * result so callers can attach domain context (credentialId, origin) when
	 * emitting events on rejection. Callers should only invoke when state carries
	 * a bindingHash; absent hash means binding wasn't requested at /auth.
	 */
	verifyBinding(req: Request, expectedHash: string): BindingVerifyResult {
		const cookieValue = this.readCookie(req);
		if (!cookieValue) {
			return { ok: false, reason: 'cookie-missing' };
		}
		const actualHash = this.computeHash(cookieValue);
		const actualBuf = Buffer.from(actualHash);
		const expectedBuf = Buffer.from(expectedHash);
		if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
			return { ok: false, reason: 'hash-mismatch' };
		}
		return { ok: true };
	}

	private readCookie(req: Request): string | undefined {
		const cookies = req.cookies as Record<string, unknown> | undefined;
		const value = cookies?.[OAUTH_BINDING_COOKIE_NAME];
		return typeof value === 'string' && value.length > 0 ? value : undefined;
	}
}
