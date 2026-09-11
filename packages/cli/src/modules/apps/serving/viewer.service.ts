import { UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Request } from 'express';

import { AuthService } from '@/auth/auth.service';

import { AppTokenService, bearerToken, type AppAccessPayload } from './app-token.service';

/** The signed-in n8n user opening an App page, as `ctx.viewer` sees them. */
export type Viewer = { id: string; email: string };

const toViewer = ({ id, email }: User): Viewer => ({ id, email });

/**
 * Resolves who is looking at an App. Never throws and never touches cookies:
 * an unknown or expired credential is an anonymous visit, which the App's
 * `auth` setting decides how to handle.
 */
@Service()
export class ViewerService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly authService: AuthService,
		private readonly appTokenService: AppTokenService,
	) {}

	async fromToken(payload: AppAccessPayload): Promise<Viewer | null> {
		if (!payload.viewerId) return null;
		const user = await this.userRepository.findOneBy({ id: payload.viewerId });
		return user ? toViewer(user) : null;
	}

	/**
	 * An access token (`Authorization: Bearer`) wins over the n8n session cookie:
	 * the served script sends the former, a top-level navigation the latter.
	 */
	async fromRequest(req: Request, appId: string): Promise<Viewer | null> {
		const token = bearerToken(req);
		if (token !== undefined) {
			const payload = this.appTokenService.verifyAccess(token);
			return payload?.appId === appId ? await this.fromToken(payload) : null;
		}

		const cookie = this.authService.getCookieToken(req);
		if (!cookie) return null;
		try {
			return toViewer(await this.authService.authenticateUserByCookie(cookie));
		} catch {
			return null;
		}
	}
}
