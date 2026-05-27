import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import type { CookieOptions, Request, Response } from 'express';

import { AuthError } from '@/errors/response-errors/auth.error';

export const OAUTH_BINDING_COOKIE_NAME = 'n8n-oauth-binding';

const NONCE_BYTES = 32;
const COOKIE_PATH = '/rest';

@Service()
export class OAuthBrowserBindingService {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
	) {}

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
			path: COOKIE_PATH,
		});
		return nonce;
	}

	computeHash(nonce: string): string {
		return createHash('sha256').update(nonce).digest('base64url');
	}

	/**
	 * Verify the cookie against the hash captured at /auth. Throws AuthError on
	 * missing cookie or mismatch. Callers should only invoke when state carries
	 * a bindingHash; absent hash means binding wasn't requested at /auth.
	 */
	verifyBindingOrThrow(req: Request, expectedHash: string): void {
		const cookieValue = this.readCookie(req);
		if (!cookieValue) {
			this.logger.warn('OAuth callback rejected: browser-binding cookie missing');
			throw new AuthError(
				'This OAuth flow was started in a different browser. Please retry from your original window.',
			);
		}
		const actualHash = this.computeHash(cookieValue);
		const actualBuf = Buffer.from(actualHash);
		const expectedBuf = Buffer.from(expectedHash);
		if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
			this.logger.warn('OAuth callback rejected: browser-binding hash mismatch');
			throw new AuthError(
				'This OAuth flow was started in a different browser. Please retry from your original window.',
			);
		}
	}

	private readCookie(req: Request): string | undefined {
		const cookies = req.cookies as Record<string, unknown> | undefined;
		const value = cookies?.[OAUTH_BINDING_COOKIE_NAME];
		return typeof value === 'string' && value.length > 0 ? value : undefined;
	}
}
