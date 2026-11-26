import {
	APP_PREVIEW_FRAME_PARAM,
	appSchema,
	appVersionSchema,
	type AppPreviewResponse,
} from '@n8n/api-types';
import { CacheService, JwtService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { AuthError, BadRequestError, NotFoundError } from '@n8n/errors';
import type { SecurityContext } from '@n8n/permissions';
import type { NextFunction, Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { appCookieName, embeddedAppCookieOptions, readCookie } from '../auth/app-cookies';
import { AppAuthService, type AppRequest } from '../auth/app-auth.service';
import { AppHostService } from '../serving/app-host.service';
import { AppVersionRepository } from '../versions/app-version.repository';
import { assertBuiltVersion } from '../versions/assert-built-version';

const CODE_PREFIX = 'apps-preview:';
const CODE_TTL_MS = 60_000;

const grantSchema = z.object({
	appId: z.string(),
	authorizeUrl: z.string(),
	state: z.string(),
	nonce: z.string(),
});
type PreviewGrant = z.infer<typeof grantSchema>;

const versionClaimsSchema = z.object({
	appId: z.string(),
	versionId: z.string(),
	tokenHash: z.string(),
});
type PreviewVersionClaims = z.infer<typeof versionClaimsSchema>;

export interface AppPreviewAdmission {
	app: App;
	/** The version that the preview session shows. It can be an unpublished draft. */
	versionId: string;
	security: SecurityContext;
	token: string;
}

/**
 * Signs the editor user in to the preview host with the same OAuth flow as a published app.
 * A second signed cookie holds the previewed version and is bound to the session token.
 */
@Service()
export class AppPreviewService {
	constructor(
		private readonly apps: AppRepository,
		private readonly versions: AppVersionRepository,
		private readonly hosts: AppHostService,
		private readonly auth: AppAuthService,
		private readonly cache: CacheService,
		private readonly jwt: JwtService,
	) {}

	async createGrant(
		userId: string,
		projectId: string,
		appId: string,
		versionId: string,
	): Promise<AppPreviewResponse> {
		if (
			!appSchema.shape.id.safeParse(appId).success ||
			!appVersionSchema.shape.id.safeParse(versionId).success
		) {
			throw new NotFoundError('App or version not found.');
		}
		const app = await this.apps.findInProject(projectId, appId);
		if (!app) throw new NotFoundError('App not found.');
		const origin = this.hosts.previewOrigin(app.namespace);
		if (!origin) throw new BadRequestError('Use a valid app namespace before previewing this app.');
		assertBuiltVersion(await this.versions.findVersionById(versionId), appId);

		const signIn = await this.auth.startSignIn(app, 'preview', { userId, versionId });
		const code = randomBytes(32).toString('hex');
		const grant: PreviewGrant = { appId, ...signIn };
		await this.cache.set(this.codeKey(code), JSON.stringify(grant), CODE_TTL_MS);
		const url = new URL('/_n8n/preview', origin);
		url.searchParams.set('code', code);
		return { url: url.toString(), authorizeUrl: signIn.authorizeUrl };
	}

	/** In a frame, only sets the flow cookie. The editor then opens the authorize URL itself. */
	async exchange(req: Request, res: Response): Promise<void> {
		res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
		this.assertNotFromPreviewHost(req);
		const namespace = this.hosts.previewNamespace(req);
		if (!namespace) throw new NotFoundError('App not found.');
		const code = typeof req.query.code === 'string' ? req.query.code : '';
		const grant = code ? this.parseGrant(await this.cache.take(this.codeKey(code))) : undefined;
		const app = grant ? await this.apps.findByNamespace(namespace) : null;
		if (!grant || !app || app.id !== grant.appId) throw this.invalidLink();

		this.auth.setFlowCookie(res, 'preview', grant);
		if (req.query[APP_PREVIEW_FRAME_PARAM] === '1') {
			res.type('html').end();
			return;
		}
		res.redirect(grant.authorizeUrl);
	}

	async complete(req: Request, res: Response, appId: string): Promise<void> {
		this.assertNotFromPreviewHost(req);
		const { app, token, expiresIn, userId, metadata } = await this.auth.finishSignIn(
			req,
			res,
			appId,
			'preview',
		);
		// The browser's n8n user must be the user who opened the preview.
		if (metadata.userId !== userId || !metadata.versionId) throw this.invalidLink();

		const cookieOptions = {
			...embeddedAppCookieOptions(this.hosts.baseUrl),
			maxAge: expiresIn * 1000,
		};
		const claims: PreviewVersionClaims = {
			appId: app.id,
			versionId: metadata.versionId,
			tokenHash: this.hash(token),
		};
		const versionToken = this.jwt.sign('appPreview', claims, { expiresIn });
		res.cookie(this.sessionCookieName(), token, cookieOptions);
		res.cookie(this.versionCookieName(), versionToken, cookieOptions);
		res.redirect('/');
	}

	async authenticate(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
		const admitted = await this.admit(req);
		if (!admitted) {
			res.set('Cache-Control', 'no-store').status(401).json({
				message: 'This preview session ended. Open the preview again.',
			});
			return;
		}
		req.appContext = {
			app: admitted.app,
			versionId: admitted.versionId,
			preview: true,
			previewUserId: admitted.security.subject.id,
		};
		next();
	}

	/** Returns `null` when the preview session is missing or ended. */
	async admit(req: Request): Promise<AppPreviewAdmission | null> {
		const admitted = await this.auth.admit(req, 'preview');
		if (!admitted.ok) return null;
		const claims = this.verifyVersion(readCookie(req, this.versionCookieName()));
		if (
			!claims ||
			claims.appId !== admitted.app.id ||
			claims.tokenHash !== this.hash(admitted.token)
		) {
			return null;
		}
		return {
			app: admitted.app,
			versionId: claims.versionId,
			security: admitted.security,
			token: admitted.token,
		};
	}

	/** App code on the preview host must not start or finish a sign-in. */
	private assertNotFromPreviewHost(req: Request) {
		if (req.get('sec-fetch-site') === 'same-origin') throw this.invalidLink();
	}

	private invalidLink() {
		return new AuthError('This preview link is no longer valid. Open the preview again.');
	}

	private parseGrant(value: unknown): PreviewGrant | undefined {
		if (typeof value !== 'string') return undefined;
		try {
			return grantSchema.parse(JSON.parse(value));
		} catch {
			return undefined;
		}
	}

	private verifyVersion(token: string | undefined): PreviewVersionClaims | undefined {
		if (!token) return undefined;
		try {
			return versionClaimsSchema.parse(this.jwt.verify<unknown>('appPreview', token));
		} catch {
			return undefined;
		}
	}

	private sessionCookieName(): string {
		return appCookieName(this.hosts.baseUrl, 'session');
	}

	private versionCookieName(): string {
		return appCookieName(this.hosts.baseUrl, 'preview');
	}

	private codeKey(code: string): string {
		return CODE_PREFIX + this.hash(code);
	}

	private hash(value: string): string {
		return createHash('sha256').update(value).digest('hex');
	}
}
