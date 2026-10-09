import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { CookieOptions, NextFunction, Request, Response } from 'express';

import { AuthError } from '@/errors/response-errors/auth.error';
import { OAuthTokenVerifierProxy } from '@/services/oauth-token-verifier-proxy.service';
import { OAuth2FlowProxy } from '@/services/oauth2-flow-proxy.service';
import { UrlService } from '@/services/url.service';

import { AppHostConfig } from './app-host.config';
import {
	APP_AUTH_PATH,
	APP_COOKIE,
	APP_SERVING_PATH,
	APP_STATE_COOKIE,
} from './app-host.constants';
import { AppRepository } from './app.repository';

@Service()
export class AppAuthService {
	constructor(
		private readonly config: AppHostConfig,
		private readonly oauthFlow: OAuth2FlowProxy,
		private readonly tokenVerifier: OAuthTokenVerifierProxy,
		private readonly urlService: UrlService,
		private readonly appRepository: AppRepository,
	) {}

	private get cookieOptions(): CookieOptions {
		return {
			httpOnly: true,
			secure: this.config.baseUrl.startsWith('https:'),
			sameSite: 'lax',
			path: '/',
		};
	}

	private readCookie(req: Request, name: string): string | undefined {
		const cookies: unknown = req.cookies;
		return isRecord(cookies) && typeof cookies[name] === 'string' ? cookies[name] : undefined;
	}

	checkHost(req: Request, res: Response, next: NextFunction) {
		if (!this.config.isAppHost(req.headers.host)) return next('router');
		res.setHeader('Cache-Control', 'private, no-store');
		next();
	}

	async authenticate(req: Request & { user?: User }, res: Response, next: NextFunction) {
		const token = this.readCookie(req, APP_COOKIE);
		if (token) {
			const { user } = await this.tokenVerifier.verifyOAuthAccessToken(
				token,
				this.config.callbackUrl,
			);
			if (user && !user.disabled) {
				req.user = user;
				next();
				return;
			}
		}
		res.clearCookie(APP_COOKIE, this.cookieOptions);
		const namespace = req.params.namespace;
		const isApi = /^\/[^/]+\/api(?:\/|$)/i.test(req.path);
		const isAsset = /\.[^/]+$/.test(req.path) && !req.path.endsWith('.html');
		if (
			req.method === 'GET' &&
			namespace &&
			!isApi &&
			!isAsset &&
			req.headers['sec-fetch-dest'] !== 'iframe' &&
			(req.headers.accept ?? '').includes('text/html')
		) {
			const version =
				typeof req.query.v === 'string' ? `?v=${encodeURIComponent(req.query.v)}` : '';
			res.redirect(`${APP_AUTH_PATH}/login/${encodeURIComponent(namespace)}${version}`);
		} else {
			res.status(401).json({ code: 'unauthorized', message: 'Unauthorized' });
		}
	}

	async beginLogin(namespace: string, res: Response, versionId?: string) {
		if (!(await this.appRepository.findByNamespace(namespace))) return null;
		const authorizeUrl = await this.oauthFlow.begin(this.config.callbackUrl, {
			namespace,
			...(versionId ? { versionId } : {}),
		});
		const state = new URL(authorizeUrl).searchParams.get('state');
		if (!state) throw new AuthError('Sign-in failed. Open the app again to sign in.');
		res.cookie(APP_STATE_COOKIE, state, {
			...this.cookieOptions,
			maxAge: 5 * Time.minutes.toMilliseconds,
		});
		return authorizeUrl;
	}

	async completeLogin(req: Request, res: Response) {
		const { code, state, iss } = req.query;
		const expectedState = this.readCookie(req, APP_STATE_COOKIE);
		res.clearCookie(APP_STATE_COOKIE, this.cookieOptions);
		if (
			typeof code !== 'string' ||
			typeof state !== 'string' ||
			!expectedState ||
			state !== expectedState ||
			iss !== this.urlService.getInstanceBaseUrl()
		) {
			throw new AuthError('Sign-in failed. Open the app again to sign in.');
		}
		const result = await this.oauthFlow.complete(code, state);
		if (!result.valid || !result.metadata?.namespace) {
			throw new AuthError('Sign-in failed. Open the app again to sign in.');
		}
		res.cookie(APP_COOKIE, result.token, {
			...this.cookieOptions,
			maxAge: result.expiresIn * Time.seconds.toMilliseconds,
		});
		const version = result.metadata.versionId
			? `?v=${encodeURIComponent(result.metadata.versionId)}`
			: '';
		return `${APP_SERVING_PATH}/${encodeURIComponent(result.metadata.namespace)}/${version}`;
	}
}
