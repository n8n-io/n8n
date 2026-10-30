import { UrlService } from '@n8n/backend-services';
import { OAuth2FlowProxy } from '@n8n/backend-services/auth';
import { Service } from '@n8n/di';
import { AuthError, BadRequestError, NotFoundError } from '@n8n/errors';
import { ResourceAdmission } from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';
import type { NextFunction, Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';

import { appCookieName, appCookieOptions, readCookie } from './app-cookies';
import { AppProtectedResource } from './app-protected-resource';
import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { AppHostService } from '../serving/app-host.service';

export interface AppRequest extends Request {
	appContext?: {
		app: App;
		versionId: string | null;
		preview?: boolean;
		security?: SecurityContext;
	};
}

@Service()
export class AppAuthService {
	constructor(
		private readonly apps: AppRepository,
		private readonly hosts: AppHostService,
		private readonly resources: AppProtectedResource,
		private readonly flow: OAuth2FlowProxy,
		private readonly admission: ResourceAdmission,
		private readonly urls: UrlService,
	) {}

	async requireApp(req: Request, appId?: string): Promise<App> {
		const namespace = this.hosts.namespace(req);
		const app = namespace ? await this.apps.findByNamespace(namespace) : null;
		if (!app?.publishedVersionId || (appId !== undefined && app.id !== appId)) {
			throw new NotFoundError('App not found.');
		}
		return app;
	}

	async authenticate(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
		const app = await this.requireApp(req);
		req.appContext = { app, versionId: app.publishedVersionId };
		if (app.visibility === 'public') {
			next();
			return;
		}
		const resource = this.resources.forApp(app);
		const request = { method: req.method, url: this.hosts.callbackUrl(app), ip: req.ip ?? '' };
		const result = await this.admission.admitBearer(
			resource,
			request,
			readCookie(req, appCookieName(this.hosts.baseUrl, 'session')) ?? '',
		);
		if (result.ok) {
			req.appContext.security = result.context;
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
		const nonce = randomBytes(32).toString('hex');
		const url = await this.flow.begin(this.hosts.callbackUrl(app), {
			appId: app.id,
			namespace: app.namespace,
			returnPath: this.returnPath(returnPath),
			nonceHash: this.hash(nonce),
		});
		const state = new URL(url).searchParams.get('state');
		if (!state) throw new AuthError('Invalid app sign-in state.');
		res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
		res.cookie(this.flowCookieName(state), nonce, {
			...appCookieOptions(this.hosts.baseUrl),
			maxAge: 5 * 60 * 1000,
		});
		res.redirect(url);
	}

	async complete(req: Request, res: Response, appId: string): Promise<void> {
		res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
		const app = await this.requireApp(req, appId);
		const { code, state, iss, error } = req.query;
		if (typeof state !== 'string' || !state || iss !== this.urls.getInstanceBaseUrl()) {
			throw new BadRequestError('Invalid app sign-in callback.');
		}
		const name = this.flowCookieName(state);
		const nonce = readCookie(req, name);
		res.clearCookie(name, appCookieOptions(this.hosts.baseUrl));
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
		const result = await this.flow.complete(code, state, {
			method: req.method,
			url: this.hosts.callbackUrl(app),
			ip: req.ip ?? '',
		});
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
			this.resources.forApp(app),
			{
				method: req.method,
				url: this.hosts.callbackUrl(app),
				ip: req.ip ?? '',
			},
			result.token,
		);
		if (!admitted.ok)
			throw new AuthError('App access is no longer available. Open the app again to check access.');
		res.cookie(appCookieName(this.hosts.baseUrl, 'session'), result.token, {
			...appCookieOptions(this.hosts.baseUrl),
			maxAge: result.expiresIn * 1000,
		});
		res.redirect(this.returnPath(result.metadata.returnPath));
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

	private hash(value: string): string {
		return createHash('sha256').update(value).digest('hex');
	}
}
