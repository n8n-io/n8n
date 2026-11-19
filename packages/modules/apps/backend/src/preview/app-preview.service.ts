import { appSchema, appVersionSchema, type AppPreviewResponse } from '@n8n/api-types';
import { CacheService } from '@n8n/backend-services';
import { OAuth2FlowProxy } from '@n8n/backend-services/auth';
import { Service } from '@n8n/di';
import { AuthError, BadRequestError, NotFoundError } from '@n8n/errors';
import type { SecurityContext } from '@n8n/permissions';
import type { NextFunction, Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { appCookieName, embeddedAppCookieOptions } from '../auth/app-cookies';
import { AppAuthService, type AppRequest } from '../auth/app-auth.service';
import { AppHostService } from '../serving/app-host.service';
import { AppVersionRepository } from '../versions/app-version.repository';
import { assertBuiltVersion } from '../versions/assert-built-version';

const CODE_PREFIX = 'apps-preview:';
const SESSION_PREFIX = 'apps-preview-session:';
const CODE_TTL_MS = 60_000;

const grantSchema = z.object({ userId: z.string(), appId: z.string(), versionId: z.string() });
type PreviewGrant = z.infer<typeof grantSchema>;

export interface AppPreviewAdmission {
	app: App;
	/** The version that the preview session shows. It can be an unpublished draft. */
	versionId: string;
	security: SecurityContext;
	token: string;
}

/**
 * The editor opens a preview with a one-time code. The code exchange signs the editor in to
 * the preview host with an n8n OAuth token, and the server keeps the previewed version for
 * that token.
 */
@Service()
export class AppPreviewService {
	constructor(
		private readonly apps: AppRepository,
		private readonly versions: AppVersionRepository,
		private readonly hosts: AppHostService,
		private readonly auth: AppAuthService,
		private readonly flow: OAuth2FlowProxy,
		private readonly cache: CacheService,
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

		const code = randomBytes(32).toString('hex');
		const grant: PreviewGrant = { userId, appId, versionId };
		await this.cache.set(this.key(CODE_PREFIX, code), JSON.stringify(grant), CODE_TTL_MS);
		const url = new URL('/_n8n/preview', origin);
		url.searchParams.set('code', code);
		return { url: url.toString() };
	}

	async exchange(req: Request, res: Response): Promise<void> {
		res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
		const namespace = this.hosts.previewNamespace(req);
		if (!namespace) throw new NotFoundError('App not found.');
		const code = typeof req.query.code === 'string' ? req.query.code : '';
		const grant = code
			? this.parseGrant(await this.cache.take(this.key(CODE_PREFIX, code)))
			: undefined;
		const app = grant ? await this.apps.findByNamespace(namespace) : null;
		if (!grant || !app || app.id !== grant.appId) throw this.invalidLink();

		// The code proves the editor's n8n session, so the token is issued without a redirect.
		const issued = await this.flow.issue(this.hosts.callbackUrl(app, 'preview'), grant.userId);
		if (!issued.valid) throw this.invalidLink();

		const ttlMs = issued.expiresIn * 1000;
		await this.cache.set(this.key(SESSION_PREFIX, issued.token), grant.versionId, ttlMs);
		res.cookie(this.cookieName(), issued.token, {
			...embeddedAppCookieOptions(this.hosts.baseUrl),
			maxAge: ttlMs,
		});
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
		const versionId = await this.cache.get<string>(this.key(SESSION_PREFIX, admitted.token));
		if (typeof versionId !== 'string') return null;
		return { app: admitted.app, versionId, security: admitted.security, token: admitted.token };
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

	private cookieName(): string {
		return appCookieName(this.hosts.baseUrl, 'session');
	}

	private key(prefix: string, value: string): string {
		return prefix + createHash('sha256').update(value).digest('hex');
	}
}
