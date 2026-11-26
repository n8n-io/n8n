import { JwtService, UrlService } from '@n8n/backend-services';
import { OAuth2FlowProxy } from '@n8n/backend-services/auth';
import { Service } from '@n8n/di';
import { AuthError, BadRequestError, NotFoundError } from '@n8n/errors';
import { ResourceAdmission } from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import { LRUCache } from 'lru-cache';
import { ExecutionContextService } from 'n8n-core';
import { createHash, randomBytes } from 'node:crypto';

import {
	appCookieName,
	appCookieOptions,
	embeddedAppCookieOptions,
	readCookie,
} from './app-cookies';
import { AppProtectedResource } from './app-protected-resource';
import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { AppHostService, type AppHostKind } from '../serving/app-host.service';

export interface AppRequest extends Request {
	appContext?: {
		app: App;
		versionId: string | null;
		preview?: boolean;
		previewUserId?: string;
		security?: SecurityContext;
	};
}

export type AppAdmission =
	| { ok: true; app: App; security: SecurityContext; token: string }
	| { ok: false; app: App; reason: 'unauthenticated' | 'insufficient_scope' };

/** The nonce binds the callback to the browser that holds the flow cookie. */
export type AppSignIn = { authorizeUrl: string; state: string; nonce: string };

export type AppSignedIn = {
	app: App;
	token: string;
	expiresIn: number;
	userId: string;
	metadata: Record<string, string>;
};

type CachedAdmission = { app: App; security: SecurityContext };

const ADMISSION_CACHE_TTL_MS = 30_000;
const ADMISSION_CACHE_MAX_ENTRIES = 10_000;
const FLOW_COOKIE_TTL_MS = 5 * 60 * 1000;

@Service()
export class AppAuthService {
	/**
	 * Both host kinds share this cache on purpose, so an access change applies within 30 seconds.
	 * Workflow runs check access again when they resolve credentials.
	 */
	private readonly admitted = new LRUCache<string, CachedAdmission>({
		max: ADMISSION_CACHE_MAX_ENTRIES,
		ttl: ADMISSION_CACHE_TTL_MS,
	});

	constructor(
		private readonly apps: AppRepository,
		private readonly hosts: AppHostService,
		private readonly resources: AppProtectedResource,
		private readonly flow: OAuth2FlowProxy,
		private readonly admission: ResourceAdmission,
		private readonly urls: UrlService,
		private readonly jwt: JwtService,
		private readonly executionContext: ExecutionContextService,
	) {}

	async requireApp(req: Request, appId?: string, kind: AppHostKind = 'published'): Promise<App> {
		const namespace = this.namespace(req, kind);
		const app = namespace ? await this.apps.findByNamespace(namespace) : null;
		if (
			!app ||
			(kind === 'published' && !app.publishedVersionId) ||
			(appId !== undefined && app.id !== appId)
		) {
			throw new NotFoundError('App not found.');
		}
		return app;
	}

	/** Resolves the app of the request host and checks the visitor's session. */
	async admit(req: Request, kind: AppHostKind = 'published'): Promise<AppAdmission> {
		const token = readCookie(req, appCookieName(this.hosts.baseUrl, 'session')) ?? '';
		const cacheKey = this.cacheKey(kind, this.namespace(req, kind), token);
		const cached = token ? this.admitted.get(cacheKey) : undefined;
		if (cached) return { ok: true, ...cached, token };

		const app = await this.requireApp(req, undefined, kind);
		if (!token) return { ok: false, app, reason: 'unauthenticated' };

		const result = await this.admission.admitBearer(
			this.resources.forApp(app, { kind, revalidate: false }),
			{ method: req.method, url: this.hosts.callbackUrl(app, kind), ip: req.ip ?? '' },
			token,
		);
		if (result.ok) {
			const admitted = { app, security: result.context };
			this.admitted.set(cacheKey, admitted, { ttl: this.admissionTtl(token) });
			return { ok: true, ...admitted, token };
		}
		return {
			ok: false,
			app,
			reason: result.reason === 'insufficient_scope' ? 'insufficient_scope' : 'unauthenticated',
		};
	}

	/** Seals the user ID too, so the run resolves credentials after the session token expires. */
	async sealVisitor(
		app: App,
		token: string,
		userId: string,
		kind: AppHostKind = 'published',
	): Promise<string> {
		return await this.executionContext.buildTriggerIdentityCredentials(
			token,
			this.hosts.callbackUrl(app, kind),
			this.resources.grantFor(app, kind),
			userId,
		);
	}

	async authenticate(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
		const result = await this.admit(req);
		const { app } = result;
		req.appContext = { app, versionId: app.publishedVersionId };
		if (result.ok) {
			req.appContext.security = result.security;
			next();
			return;
		}
		res.set('Cache-Control', 'no-store');
		if (result.reason === 'insufficient_scope') {
			res.status(403).json({
				message: "You don't have access to this app. Contact your project administrator.",
			});
		} else if (this.isNavigation(req)) {
			const loginUrl = new URL(`/_n8n/auth/${app.id}/login`, this.hosts.callbackUrl(app));
			loginUrl.searchParams.set('returnTo', req.originalUrl);
			res.redirect(loginUrl.toString());
		} else {
			res.set('WWW-Authenticate', 'Bearer');
			res.status(401).json({ message: 'Sign in to access this app.' });
		}
	}

	isNavigation(req: Request): boolean {
		const mode = req.get('sec-fetch-mode');
		return (
			req.method === 'GET' &&
			!req.path.startsWith('/_n8n/') &&
			(mode ? mode === 'navigate' : (req.get('accept') ?? '').includes('text/html'))
		);
	}

	async begin(app: App, returnPath: string, res: Response): Promise<void> {
		const signIn = await this.startSignIn(app, 'published', {
			returnPath: this.returnPath(returnPath),
		});
		res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
		this.setFlowCookie(res, 'published', signIn);
		res.redirect(signIn.authorizeUrl);
	}

	async complete(req: Request, res: Response, appId: string): Promise<void> {
		const { token, expiresIn, metadata } = await this.finishSignIn(req, res, appId, 'published');
		res.cookie(appCookieName(this.hosts.baseUrl, 'session'), token, {
			...appCookieOptions(this.hosts.baseUrl),
			maxAge: expiresIn * 1000,
		});
		res.redirect(this.returnPath(metadata.returnPath));
	}

	async startSignIn(
		app: App,
		kind: AppHostKind,
		metadata: Record<string, string>,
	): Promise<AppSignIn> {
		const nonce = randomBytes(32).toString('hex');
		const authorizeUrl = await this.flow.begin(this.hosts.callbackUrl(app, kind), {
			...metadata,
			appId: app.id,
			namespace: app.namespace,
			nonceHash: this.hash(nonce),
		});
		const state = new URL(authorizeUrl).searchParams.get('state');
		if (!state) throw new AuthError('Invalid app sign-in state.');
		return { authorizeUrl, state, nonce };
	}

	setFlowCookie(
		res: Response,
		kind: AppHostKind,
		{ state, nonce }: Omit<AppSignIn, 'authorizeUrl'>,
	) {
		res.cookie(this.flowCookieName(state), nonce, {
			...this.cookieOptions(kind),
			maxAge: FLOW_COOKIE_TTL_MS,
		});
	}

	async finishSignIn(
		req: Request,
		res: Response,
		appId: string,
		kind: AppHostKind,
	): Promise<AppSignedIn> {
		res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
		const app = await this.requireApp(req, appId, kind);
		const callbackUrl = this.hosts.callbackUrl(app, kind);
		const { code, state, iss, error } = req.query;
		if (typeof state !== 'string' || !state || iss !== this.urls.getInstanceBaseUrl()) {
			throw new BadRequestError('Invalid app sign-in callback.');
		}
		const name = this.flowCookieName(state);
		const nonce = readCookie(req, name);
		res.clearCookie(name, this.cookieOptions(kind));
		if (!nonce) throw new AuthError('Restart app sign-in in this browser.');
		if (typeof error === 'string' && error) {
			throw new AuthError(
				error === 'access_denied'
					? 'App sign-in was canceled. Open the app again to restart sign-in.'
					: 'App sign-in failed. Open the app again to restart sign-in.',
			);
		}
		if (typeof code !== 'string' || error !== undefined) {
			throw new BadRequestError('Invalid app sign-in callback.');
		}
		const request = { method: req.method, url: callbackUrl, ip: req.ip ?? '' };
		const result = await this.flow.complete(code, state, request);
		if (
			!result.valid ||
			result.metadata?.appId !== app.id ||
			result.metadata.namespace !== app.namespace ||
			result.metadata.nonceHash !== this.hash(nonce)
		) {
			throw new AuthError(
				'App sign-in expired or is invalid. Open the app again to restart sign-in.',
			);
		}
		// Verify against this callback's resource as well as the flow's stored resource.
		const admitted = await this.admission.admitBearer(
			this.resources.forApp(app, { kind }),
			request,
			result.token,
		);
		if (!admitted.ok)
			throw new AuthError('App access is no longer available. Open the app again to check access.');
		return {
			app,
			token: result.token,
			expiresIn: result.expiresIn,
			userId: result.user.id,
			metadata: result.metadata,
		};
	}

	private returnPath(value: string | undefined): string {
		if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value))
			return '/';
		const url = new URL(value, 'http://app');
		return url.origin === 'http://app' && !url.pathname.startsWith('/_n8n/')
			? url.pathname + url.search
			: '/';
	}

	private flowCookieName(state: string): string {
		return appCookieName(this.hosts.baseUrl, `flow-${this.hash(state)}`);
	}

	/** The editor embeds the preview host in a frame on another site. */
	private cookieOptions(kind: AppHostKind): CookieOptions {
		return kind === 'preview'
			? embeddedAppCookieOptions(this.hosts.baseUrl)
			: appCookieOptions(this.hosts.baseUrl);
	}

	/** A cache hit skips token verification, so an entry must not outlive the token. */
	private admissionTtl(token: string): number {
		const { exp } = this.jwt.decodeUnverified(token) ?? {};
		return typeof exp === 'number'
			? Math.max(1, Math.min(ADMISSION_CACHE_TTL_MS, exp * 1000 - Date.now()))
			: ADMISSION_CACHE_TTL_MS;
	}

	private namespace(req: Request, kind: AppHostKind): string | undefined {
		return kind === 'preview' ? this.hosts.previewNamespace(req) : this.hosts.namespace(req);
	}

	private cacheKey(kind: AppHostKind, namespace: string | undefined, token: string): string {
		return `${kind}:${namespace}:${this.hash(token)}`;
	}

	private hash(value: string): string {
		return createHash('sha256').update(value).digest('hex');
	}
}
