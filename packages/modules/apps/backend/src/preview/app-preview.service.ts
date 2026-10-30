import { appSchema, appVersionSchema, type AppPreviewResponse } from '@n8n/api-types';
import { CacheService, JwtService, UrlService } from '@n8n/backend-services';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { AuthError, BadRequestError, NotFoundError } from '@n8n/errors';
import type { NextFunction, Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { appCookieName, embeddedAppCookieOptions, readCookie } from '../auth/app-cookies';
import type { AppRequest } from '../auth/app-auth.service';
import { AppProtectedResource } from '../auth/app-protected-resource';
import { AppHostService } from '../serving/app-host.service';
import { AppVersionRepository } from '../versions/app-version.repository';
import { assertBuiltVersion } from '../versions/assert-built-version';

const CODE_PREFIX = 'apps-preview:';
const CODE_TTL_MS = 60_000;
const SESSION_TTL_SECONDS = 60 * 60;

const grantSchema = z.object({ userId: z.string(), appId: z.string(), versionId: z.string() });
type PreviewGrant = z.infer<typeof grantSchema>;

const sessionSchema = z.object({
	sub: z.string(),
	appId: z.string(),
	versionId: z.string(),
});
type PreviewSession = z.infer<typeof sessionSchema>;

@Service()
export class AppPreviewService {
	readonly editorOrigin: string;

	constructor(
		private readonly apps: AppRepository,
		private readonly versions: AppVersionRepository,
		private readonly hosts: AppHostService,
		private readonly resources: AppProtectedResource,
		private readonly users: UserRepository,
		private readonly cache: CacheService,
		private readonly jwt: JwtService,
		urls: UrlService,
	) {
		this.editorOrigin = new URL(urls.getInstanceBaseUrl()).origin;
	}

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

		const code = randomBytes(32).toString('hex');
		const grant: PreviewGrant = { userId, appId, versionId };
		await this.cache.set(this.codeKey(code), JSON.stringify(grant), CODE_TTL_MS);
		const url = new URL('/_n8n/preview', origin);
		url.searchParams.set('code', code);
		return { url: url.toString() };
	}

	async exchange(req: Request, res: Response): Promise<void> {
		res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
		const namespace = this.hosts.previewNamespace(req);
		if (!namespace) throw new NotFoundError('App not found.');
		const code = typeof req.query.code === 'string' ? req.query.code : '';
		const grant = code ? this.parseGrant(await this.cache.take(this.codeKey(code))) : undefined;
		const app = grant ? await this.apps.findByNamespace(namespace) : null;
		if (!grant || app?.id !== grant.appId) {
			throw new AuthError('This preview link is no longer valid. Open the preview again.');
		}
		this.setSession(res, { sub: grant.userId, appId: grant.appId, versionId: grant.versionId });
		res.redirect('/');
	}

	async authenticate(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
		const session = this.verifySession(readCookie(req, this.cookieName()));
		const app = session ? await this.findSessionApp(req, session) : null;
		if (!session || !app) {
			res.set('Cache-Control', 'no-store').status(401).json({
				message: 'This preview session ended. Open the preview again.',
			});
			return;
		}
		req.appContext = { app, versionId: session.versionId, preview: true };
		next();
	}

	private async findSessionApp(req: Request, session: PreviewSession): Promise<App | null> {
		const namespace = this.hosts.previewNamespace(req);
		const app = namespace ? await this.apps.findByNamespace(namespace) : null;
		if (app?.id !== session.appId) return null;
		const user = await this.users.findByIdWithRole(session.sub);
		if (!user || user.disabled || !(await this.resources.canRead(app, user))) return null;
		return app;
	}

	private setSession(res: Response, { sub, appId, versionId }: PreviewSession) {
		const token = this.jwt.sign(
			'appPreview',
			{ sub, appId, versionId },
			{ expiresIn: SESSION_TTL_SECONDS },
		);
		res.cookie(this.cookieName(), token, embeddedAppCookieOptions(this.hosts.baseUrl));
	}

	private verifySession(token: string | undefined): PreviewSession | undefined {
		if (!token) return undefined;
		try {
			return sessionSchema.parse(this.jwt.verify<unknown>('appPreview', token));
		} catch {
			return undefined;
		}
	}

	private parseGrant(value: unknown): PreviewGrant | undefined {
		if (typeof value !== 'string') return undefined;
		try {
			return grantSchema.parse(JSON.parse(value));
		} catch {
			return undefined;
		}
	}

	private cookieName(): string {
		return appCookieName(this.hosts.baseUrl, 'preview');
	}

	private codeKey(code: string): string {
		return CODE_PREFIX + createHash('sha256').update(code).digest('hex');
	}
}
