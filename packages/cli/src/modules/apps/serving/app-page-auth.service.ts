import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Request, Response } from 'express';

import { AppResourceResolver } from '@/modules/oauth-server/protected-resource-resolvers/app-resource.resolver';
import { OAuth2FlowProxy } from '@/services/oauth2-flow-proxy.service';

import {
	APP_PAGE_TOKEN_TTL_SECONDS,
	AppPageTokenService,
	type AppPageTokenClaims,
} from './app-page-token';
import type { App } from '../app.entity';

type ServedApp = Pick<App, 'id' | 'namespace' | 'projectId' | 'authMode'>;

const cookieNameFor = (app: ServedApp) => `n8n-app-${app.namespace}`;
const appRootPath = (app: ServedApp) => `/apps/${app.namespace}/`;

/** From the request scheme, not config, so the cookie is sent back over http in dev. */
const isSecureRequest = (req: Request) => {
	const forwarded = req.headers['x-forwarded-proto'];
	const proto = (typeof forwarded === 'string' ? forwarded.trim() : '') || req.protocol;
	return proto === 'https';
};

/**
 * Who opens a served app. A public app admits everyone. An `n8n` app needs the
 * page cookie, which only the instance's OAuth flow hands out: the page is an
 * opaque origin and cannot use the editor session, and a top-level navigation
 * is the only request that carries a cookie at all.
 */
@Service()
export class AppPageAuthService {
	constructor(
		private readonly appPageTokenService: AppPageTokenService,
		private readonly appResourceResolver: AppResourceResolver,
		private readonly oauth2FlowProxy: OAuth2FlowProxy,
		private readonly userRepository: UserRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * The visitor's claims, or `null` once the response was sent: a redirect into
	 * the OAuth flow, the redirect that completes it, or a refusal.
	 *
	 * A document renews the cookie for another 15 minutes, so `recheckAccess` makes
	 * a cookie count only while its user still has `app:read`; assets skip the
	 * lookup because they renew nothing.
	 */
	async admit(
		req: Request,
		res: Response,
		app: ServedApp,
		{ recheckAccess }: { recheckAccess: boolean },
	): Promise<AppPageTokenClaims | null> {
		if (app.authMode !== 'n8n') return {};

		const cookie: unknown = req.cookies?.[cookieNameFor(app)];
		const claims =
			typeof cookie === 'string' ? this.appPageTokenService.verify(cookie, app.id) : null;
		if (claims?.userId) {
			if (!recheckAccess || (await this.canOpen(claims.userId, app))) return claims;
			res.clearCookie(cookieNameFor(app), { path: appRootPath(app) });
		}

		const { code, state, error } = req.query;
		if (typeof error === 'string') {
			// The user denied consent; restarting the flow would loop straight back here.
			this.logger.warn('App OAuth2 authorization was denied or failed', { error });
			res.status(403).type('text').send('Access denied');
			return null;
		}

		const isCallback = typeof code === 'string' && typeof state === 'string';
		if (isCallback) {
			// `complete` verifies the token against the resource the flow was begun for
			// (gate: the visitor's `app:read` on that project), not against this app, so
			// the flow must also have been begun for this app.
			const result = await this.oauth2FlowProxy.complete(code, state);
			if (result.valid && result.metadata?.appId === app.id) {
				this.issuePageToken(req, res, app, { userId: result.user.id });
				// `code` and `state` must not reach the page: land on the URL the visitor asked for.
				const returnTo = result.metadata.returnTo;
				res.redirect(302, returnTo?.startsWith(appRootPath(app)) ? returnTo : appRootPath(app));
				return null;
			}
			this.logger.warn('App OAuth2 flow failed, restarting', {
				reason: result.valid ? 'app_mismatch' : result.reason,
			});
		}

		// A failed callback carries no usable return URL; the restart lands on the app root.
		const authorizationUrl = await this.oauth2FlowProxy.begin(
			this.appResourceResolver.resourceUrlFor(app),
			{ appId: app.id, ...(isCallback ? {} : { returnTo: req.originalUrl }) },
		);
		res.redirect(302, authorizationUrl);
		return null;
	}

	/** The same check the runtime API applies to every call. */
	private async canOpen(userId: string, app: ServedApp) {
		const user = await this.userRepository.findByIdWithRole(userId);
		return user !== null && (await this.appResourceResolver.canOpen(user, app));
	}

	/**
	 * Mints the token the page carries. For an `n8n` app the same token becomes the
	 * page cookie, so later navigations skip the OAuth round trip while it lasts.
	 */
	issuePageToken(req: Request, res: Response, app: ServedApp, claims: AppPageTokenClaims) {
		const token = this.appPageTokenService.mint(app.id, claims.userId);
		if (app.authMode === 'n8n') {
			res.cookie(cookieNameFor(app), token, {
				httpOnly: true,
				// Lax: sent on our own top-level 302 → GET, never on the page's fetches.
				sameSite: 'lax',
				secure: isSecureRequest(req),
				path: appRootPath(app),
				maxAge: APP_PAGE_TOKEN_TTL_SECONDS * 1000,
			});
		}
		return token;
	}
}
