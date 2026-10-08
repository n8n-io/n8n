import { UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Request } from 'express';

import { AuthService } from '@/auth/auth.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { SandboxPreviewEntry } from './sandbox-preview.service';

/** How long a passed check of the URL's user counts, so that a burst of assets costs one check. */
export const ACCESS_CHECK_TTL_MS = 30_000;

/**
 * Whether a preview request may reach the app. The URL is a bearer
 * credential, so these checks do not identify the person who holds it. They
 * end the preview when the user it was made for loses `agent:execute` on the
 * project, and on a page load they also check the browser's n8n session.
 */
@Service()
export class SandboxPreviewAccess {
	/** `jti` → epoch milliseconds until which the user of that URL counts as allowed. */
	private readonly passedUntil = new Map<string, number>();

	constructor(
		private readonly authService: AuthService,
		private readonly userRepository: UserRepository,
	) {}

	/** Asked for every request, so a user who lost access loses the app within the TTL. */
	async tokenUserAllowed(entry: SandboxPreviewEntry): Promise<boolean> {
		const now = Date.now();
		if ((this.passedUntil.get(entry.jti) ?? 0) > now) return true;
		const user = await this.userRepository.findByIdWithRole(entry.userId);
		const allowed = await this.hasAccess(user, entry);
		this.forgetExpired(now);
		if (allowed) this.passedUntil.set(entry.jti, now + ACCESS_CHECK_TTL_MS);
		return allowed;
	}

	/**
	 * On a page load the browser's session user must have access too, when the
	 * browser sends the n8n cookie. A session that does not validate is refused.
	 */
	async sessionUserAllowed(req: Request, entry: SandboxPreviewEntry): Promise<boolean> {
		const cookie = this.authService.getCookieToken(req);
		if (!cookie) return true;
		const viewer = await this.authService.authenticateUserByCookie(cookie).catch(() => null);
		return await this.hasAccess(viewer, entry);
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
