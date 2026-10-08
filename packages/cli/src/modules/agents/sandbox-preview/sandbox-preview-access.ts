import { UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { AuthError } from '@n8n/errors';
import type { Request } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';

import { AuthService } from '@/auth/auth.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { SandboxPreviewEntry } from './sandbox-preview.service';

/** How long a passed check of the URL's user counts, so that a burst of assets costs one check. */
export const ACCESS_CHECK_TTL_MS = 30_000;

/**
 * Whether a preview request may reach the app. The URL is a bearer
 * credential, so these checks do not identify the person who holds it. They
 * end the preview when the user it was made for loses `agent:execute` on the
 * project, and on a page load they also check the browser's n8n session. A
 * logout or a password change does not end a URL that n8n already gave out:
 * it stays valid until it expires or this check fails.
 */
@Service()
export class SandboxPreviewAccess {
	/** `jti` → epoch milliseconds until which the user of that URL counts as allowed. */
	private readonly passedUntil = new Map<string, number>();

	constructor(
		private readonly authService: AuthService,
		private readonly userRepository: UserRepository,
	) {}

	/**
	 * Asked for every request, so a user who lost access loses the app within
	 * the TTL. `fresh` ignores a recent pass, as a page load must.
	 */
	async tokenUserAllowed(
		entry: SandboxPreviewEntry,
		options: { fresh?: boolean } = {},
	): Promise<boolean> {
		const now = Date.now();
		if (!options.fresh && (this.passedUntil.get(entry.jti) ?? 0) > now) return true;
		const user = await this.userRepository.findByIdWithRole(entry.userId);
		const allowed = await this.hasAccess(user, entry);
		this.forgetExpired(now);
		// A refusal also removes an older pass, so that no later request uses it.
		if (allowed) this.passedUntil.set(entry.jti, now + ACCESS_CHECK_TTL_MS);
		else this.passedUntil.delete(entry.jti);
		return allowed;
	}

	/**
	 * On a page load the browser's session user must have access too, when the
	 * browser sends a valid n8n cookie. A cookie that no longer validates
	 * (expired, signed out elsewhere) names no viewer, so the check of the URL's
	 * user decides, as for a request without the cookie: a refusal would add no
	 * protection, because the holder of the URL can leave the cookie out.
	 */
	async sessionUserAllowed(req: Request, entry: SandboxPreviewEntry): Promise<boolean> {
		const cookie = this.authService.getCookieToken(req);
		const viewer = cookie ? await this.sessionUser(cookie) : undefined;
		return viewer === undefined || (await this.hasAccess(viewer, entry));
	}

	/** The user of a valid session cookie. A fault that is not about the cookie is passed on. */
	private async sessionUser(cookie: string): Promise<User | undefined> {
		try {
			return await this.authService.authenticateUserByCookie(cookie);
		} catch (error) {
			if (error instanceof AuthError || error instanceof JsonWebTokenError) return undefined;
			throw error;
		}
	}

	private async hasAccess(user: User | null, entry: SandboxPreviewEntry): Promise<boolean> {
		if (!user || user.disabled) return false;
		return await userHasScopes(user, ['agent:execute'], false, { projectId: entry.projectId });
	}

	private forgetExpired(now: number): void {
		for (const [jti, until] of this.passedUntil) {
			if (until <= now) this.passedUntil.delete(jti);
		}
	}
}
