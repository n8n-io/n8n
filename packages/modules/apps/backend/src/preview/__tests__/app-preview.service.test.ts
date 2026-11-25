import { CacheService, JwtService, UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import type { SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { createHash } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { AppPreviewService } from '../app-preview.service';
import type { App } from '../../app.entity';
import { AppRepository } from '../../app.repository';
import { AppsConfig } from '../../apps.config';
import { AppAuthService, type AppRequest } from '../../auth/app-auth.service';
import { AppHostService } from '../../serving/app-host.service';
import type { AppVersion } from '../../versions/app-version.entity';
import { AppVersionRepository } from '../../versions/app-version.repository';

const appId = '11111111-1111-4111-8111-111111111111';
const versionId = '22222222-2222-4222-8222-222222222222';
const authorizeUrl = 'https://n8n.example.net/oauth/authorize?state=state-1';
const signIn = { authorizeUrl, state: 'state-1', nonce: 'nonce-1' };
const sessionCookie = '__Host-n8n-app-session';
const versionCookie = '__Host-n8n-app-preview';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const versionClaims = (overrides: Record<string, string> = {}) =>
	JSON.stringify({ appId, versionId, tokenHash: hash('preview-token'), ...overrides });
const security = mock<SecurityContext>({ subject: { id: 'user-1' } });

function setup(baseUrl = 'https://apps.example.com') {
	const app = mock<App>({ id: appId, namespace: 'sales', projectId: 'project-1' });
	const apps = mock<AppRepository>();
	apps.findInProject.mockResolvedValue(app);
	apps.findByNamespace.mockResolvedValue(app);
	const versions = mock<AppVersionRepository>();
	versions.findVersionById.mockResolvedValue(
		mock<AppVersion>({ id: versionId, appId, buildStatus: 'succeeded', bundleArtifactId: 1 }),
	);
	const hosts = new AppHostService(
		mock<AppsConfig>({ baseUrl }),
		mock<GlobalConfig>({ deployment: mock<GlobalConfig['deployment']>({ type: 'default' }) }),
		mock<UrlService>({
			getInstanceBaseUrl: () => 'https://n8n.example.net',
			getWebhookBaseUrl: () => 'https://hooks.example.net',
		}),
	);
	const auth = mock<AppAuthService>();
	auth.admit.mockResolvedValue({ ok: true, app, security, token: 'preview-token' });
	auth.startSignIn.mockResolvedValue(signIn);
	auth.finishSignIn.mockResolvedValue({
		app,
		token: 'preview-token',
		expiresIn: 3600,
		userId: 'user-1',
		metadata: { userId: 'user-1', versionId },
	});
	const store = new Map<string, unknown>();
	const cache = mock<CacheService>();
	cache.set.mockImplementation(async (key, value) => {
		store.set(key, value);
	});
	cache.get.mockImplementation(async (key) => store.get(key) as never);
	cache.take.mockImplementation(async (key) => {
		const value = store.get(key);
		store.delete(key);
		return value as never;
	});
	const jwt = mock<JwtService>();
	jwt.sign.mockImplementation((_purpose, payload) => JSON.stringify(payload));
	jwt.verify.mockImplementation((_purpose, token) => JSON.parse(token) as never);
	const service = new AppPreviewService(apps, versions, hosts, auth, cache, jwt);
	const res = mock<Response>();
	res.set.mockReturnValue(res);
	res.status.mockReturnValue(res);
	res.type.mockReturnValue(res);
	return { service, app, apps, versions, auth, store, cache, jwt, res };
}

function previewRequest(
	query: Record<string, string> = {},
	cookies: Record<string, string> = {},
	fetchHeaders: Record<string, string> = { 'sec-fetch-site': 'cross-site' },
) {
	const req = mock<AppRequest>({ headers: { host: 'sales--preview.apps.example.com' }, cookies });
	req.query = query;
	req.appContext = undefined;
	req.get.mockImplementation(((name: string) => fetchHeaders[name]) as AppRequest['get']);
	return req;
}

async function grantCode(service: AppPreviewService) {
	const { url } = await service.createGrant('user-1', 'project-1', appId, versionId);
	return new URL(url).searchParams.get('code') ?? '';
}

describe('AppPreviewService', () => {
	describe('createGrant', () => {
		it('starts the sign-in and stores it under a one-time code for one minute', async () => {
			const { service, store, cache, auth, app } = setup();

			const result = await service.createGrant('user-1', 'project-1', appId, versionId);

			expect(auth.startSignIn).toHaveBeenCalledExactlyOnceWith(app, 'preview', {
				userId: 'user-1',
				versionId,
			});
			expect(cache.set).toHaveBeenCalledWith(expect.any(String), expect.any(String), 60_000);
			expect(result.authorizeUrl).toBe(authorizeUrl);

			const parsed = new URL(result.url);
			expect(parsed.origin).toBe('https://sales--preview.apps.example.com');
			expect(parsed.pathname).toBe('/_n8n/preview');
			expect(parsed.searchParams.get('code')).toMatch(/^[0-9a-f]{64}$/);
			expect([...store.keys()]).toEqual([expect.stringMatching(/^apps-preview:[0-9a-f]{64}$/)]);
			expect([...store.keys()][0]).not.toContain(parsed.searchParams.get('code'));
			expect(JSON.parse([...store.values()][0] as string)).toEqual({ appId, ...signIn });
		});

		it.each([
			['an unknown app', 'not-a-uuid', versionId],
			['an unknown version', appId, 'not-a-uuid'],
		])('rejects %s', async (_case, app, version) => {
			const { service } = setup();
			await expect(service.createGrant('user-1', 'project-1', app, version)).rejects.toThrow(
				'App or version not found.',
			);
		});

		it('rejects an app outside the project', async () => {
			const { service, apps } = setup();
			apps.findInProject.mockResolvedValue(null);
			await expect(service.createGrant('user-1', 'project-1', appId, versionId)).rejects.toThrow(
				'App not found.',
			);
		});

		it.each([
			['of another app', { appId: '33333333-3333-4333-8333-333333333333' }, 'not found'],
			['without a successful build', { buildStatus: 'failed' }, 'successful app version'],
			['without a bundle', { bundleArtifactId: null }, 'successful app version'],
		] as const)('rejects a version %s', async (_case, fields, message) => {
			const { service, versions, store } = setup();
			versions.findVersionById.mockResolvedValue(
				mock<AppVersion>({
					id: versionId,
					appId,
					buildStatus: 'succeeded',
					bundleArtifactId: 1,
					...fields,
				}),
			);
			await expect(service.createGrant('user-1', 'project-1', appId, versionId)).rejects.toThrow(
				message,
			);
			expect(store.size).toBe(0);
		});
	});

	describe('exchange', () => {
		it.each<[string, Record<string, string>]>([
			[
				'with fetch metadata headers',
				{ 'sec-fetch-site': 'cross-site', 'sec-fetch-dest': 'iframe' },
			],
			['without fetch metadata headers', {}],
		])(
			'sets the flow cookie and leaves the sign-in to the editor in a marked frame load %s',
			async (_case, fetchHeaders) => {
				const { service, res, auth, store } = setup();
				const code = await grantCode(service);
				const req = previewRequest({ code, frame: '1' }, {}, fetchHeaders);

				await service.exchange(req, res);

				expect(auth.setFlowCookie).toHaveBeenCalledExactlyOnceWith(
					res,
					'preview',
					expect.objectContaining({ state: signIn.state, nonce: signIn.nonce }),
				);
				expect(store.size).toBe(0);
				expect(res.set).toHaveBeenCalledWith({
					'Cache-Control': 'no-store',
					'Referrer-Policy': 'no-referrer',
				});
				expect(res.type).toHaveBeenCalledWith('html');
				expect(res.end).toHaveBeenCalledOnce();
				expect(res.redirect).not.toHaveBeenCalled();
			},
		);

		it.each<[string, Record<string, string>]>([
			['a new tab', { 'sec-fetch-site': 'cross-site', 'sec-fetch-dest': 'document' }],
			['an unmarked frame load', { 'sec-fetch-site': 'cross-site', 'sec-fetch-dest': 'iframe' }],
			['a request without fetch metadata headers', {}],
		])('redirects to the sign-in for %s', async (_case, fetchHeaders) => {
			const { service, res, auth } = setup();
			const code = await grantCode(service);
			const req = previewRequest({ code }, {}, fetchHeaders);

			await service.exchange(req, res);

			expect(auth.setFlowCookie).toHaveBeenCalledOnce();
			expect(res.end).not.toHaveBeenCalled();
			expect(res.redirect).toHaveBeenCalledExactlyOnceWith(authorizeUrl);
		});

		it('rejects a request from the preview host itself', async () => {
			const { service, res, auth, store } = setup();
			const code = await grantCode(service);
			const req = previewRequest({ code }, {}, { 'sec-fetch-site': 'same-origin' });

			await expect(service.exchange(req, res)).rejects.toThrow('no longer valid');
			expect(auth.setFlowCookie).not.toHaveBeenCalled();
			expect(store.size).toBe(1);
		});

		it('accepts a code only once', async () => {
			const { service, res } = setup();
			const code = await grantCode(service);
			await service.exchange(previewRequest({ code }), res);

			await expect(service.exchange(previewRequest({ code }), res)).rejects.toThrow(
				'no longer valid',
			);
		});

		it.each<Record<string, string>>([{}, { code: 'unknown' }])(
			'rejects a missing or unknown code: %j',
			async (query) => {
				const { service, res, auth } = setup();
				await expect(service.exchange(previewRequest(query), res)).rejects.toThrow(
					'no longer valid',
				);
				expect(auth.setFlowCookie).not.toHaveBeenCalled();
			},
		);

		it('rejects a code for another app', async () => {
			const { service, apps, res, auth } = setup();
			const code = await grantCode(service);
			apps.findByNamespace.mockResolvedValue(mock<App>({ id: 'other-app' }));

			await expect(service.exchange(previewRequest({ code }), res)).rejects.toThrow(
				'no longer valid',
			);
			expect(auth.setFlowCookie).not.toHaveBeenCalled();
		});

		it('rejects the exchange on a published app host', async () => {
			const { service, res } = setup();
			const code = await grantCode(service);
			const req = previewRequest({ code });
			req.headers.host = 'sales.apps.example.com';

			await expect(service.exchange(req, res)).rejects.toThrow('App not found.');
		});
	});

	describe('complete', () => {
		it('signs the editor in with the token and a version bound to it', async () => {
			const { service, res, auth, jwt } = setup();
			const req = previewRequest();

			await service.complete(req, res, appId);

			const cookieOptions = {
				httpOnly: true,
				secure: true,
				sameSite: 'none',
				partitioned: true,
				path: '/',
				maxAge: 3_600_000,
			};
			expect(auth.finishSignIn).toHaveBeenCalledExactlyOnceWith(req, res, appId, 'preview');
			expect(jwt.sign).toHaveBeenCalledExactlyOnceWith(
				'appPreview',
				{ appId, versionId, tokenHash: hash('preview-token') },
				{ expiresIn: 3600 },
			);
			expect(res.cookie).toHaveBeenCalledWith(sessionCookie, 'preview-token', cookieOptions);
			expect(res.cookie).toHaveBeenCalledWith(versionCookie, versionClaims(), cookieOptions);
			expect(res.redirect).toHaveBeenCalledWith('/');
		});

		it('uses a same-site cookie on a plain HTTP apps domain', async () => {
			const { service, res } = setup('http://apps.localhost:5678');

			await service.complete(previewRequest(), res, appId);

			expect(res.cookie).toHaveBeenCalledWith('n8n-app-session', 'preview-token', {
				httpOnly: true,
				secure: false,
				sameSite: 'lax',
				path: '/',
				maxAge: 3_600_000,
			});
		});

		it('rejects a request from the preview host itself', async () => {
			const { service, res, auth } = setup();
			const req = previewRequest({}, {}, { 'sec-fetch-site': 'same-origin' });

			await expect(service.complete(req, res, appId)).rejects.toThrow('no longer valid');
			expect(auth.finishSignIn).not.toHaveBeenCalled();
		});

		it.each([
			['another n8n user', { userId: 'user-2', versionId }],
			['no version', { userId: 'user-1' }],
		])('rejects a sign-in for %s', async (_case, metadata) => {
			const { service, res, auth, app } = setup();
			auth.finishSignIn.mockResolvedValue({
				app,
				token: 'preview-token',
				expiresIn: 3600,
				userId: 'user-1',
				metadata,
			});

			await expect(service.complete(previewRequest(), res, appId)).rejects.toThrow(
				'no longer valid',
			);
			expect(res.cookie).not.toHaveBeenCalled();
		});
	});

	describe('authenticate', () => {
		async function authenticate(
			ctx: ReturnType<typeof setup>,
			cookies: Record<string, string> = { [versionCookie]: versionClaims() },
		) {
			const req = previewRequest({}, cookies);
			const next = vi.fn();
			await ctx.service.authenticate(req, ctx.res, next);
			return { req, next };
		}

		it('serves the version bound to the token without server-side state', async () => {
			const ctx = setup();

			const { req, next } = await authenticate(ctx);

			expect(next).toHaveBeenCalledOnce();
			expect(req.appContext).toEqual({
				app: ctx.app,
				versionId,
				preview: true,
				previewUserId: 'user-1',
			});
			expect(ctx.auth.admit).toHaveBeenCalledExactlyOnceWith(req, 'preview');
		});

		it.each<[string, Record<string, string>, (ctx: ReturnType<typeof setup>) => void]>([
			['a session without a version cookie', {}, () => {}],
			[
				'a version cookie for another token',
				{ [versionCookie]: versionClaims({ tokenHash: hash('other-token') }) },
				() => {},
			],
			[
				'a version cookie for another app',
				{ [versionCookie]: versionClaims({ appId: '33333333-3333-4333-8333-333333333333' }) },
				() => {},
			],
			[
				'a version cookie that does not verify',
				{ [versionCookie]: versionClaims() },
				(ctx) =>
					ctx.jwt.verify.mockImplementation(() => {
						throw new Error('jwt expired');
					}),
			],
			[
				'a session that is not admitted',
				{ [versionCookie]: versionClaims() },
				(ctx) =>
					ctx.auth.admit.mockResolvedValue({
						ok: false,
						app: ctx.app,
						reason: 'unauthenticated',
					}),
			],
		])('rejects %s', async (_case, cookies, arrange) => {
			const ctx = setup();
			arrange(ctx);

			const { req, next } = await authenticate(ctx, cookies);

			expect(next).not.toHaveBeenCalled();
			expect(req.appContext).toBeUndefined();
			expect(ctx.res.status).toHaveBeenCalledWith(401);
		});
	});
});
