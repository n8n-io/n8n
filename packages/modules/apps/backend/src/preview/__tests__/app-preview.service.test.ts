import { CacheService, JwtService, UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AppPreviewService } from '../app-preview.service';
import type { App } from '../../app.entity';
import { AppRepository } from '../../app.repository';
import { AppsConfig } from '../../apps.config';
import type { AppRequest } from '../../auth/app-auth.service';
import { AppProtectedResource } from '../../auth/app-protected-resource';
import { AppHostService } from '../../serving/app-host.service';
import type { AppVersion } from '../../versions/app-version.entity';
import { AppVersionRepository } from '../../versions/app-version.repository';

const appId = '11111111-1111-4111-8111-111111111111';
const versionId = '22222222-2222-4222-8222-222222222222';
const now = Math.floor(Date.now() / 1000);

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
	const resources = mock<AppProtectedResource>();
	resources.canRead.mockResolvedValue(true);
	const users = mock<UserRepository>();
	users.findByIdWithRole.mockResolvedValue(mock<User>({ id: 'user-1', disabled: false }));
	const store = new Map<string, unknown>();
	const cache = mock<CacheService>();
	cache.set.mockImplementation(async (key, value) => {
		store.set(key, value);
	});
	cache.take.mockImplementation(async (key) => {
		const value = store.get(key);
		store.delete(key);
		return value as never;
	});
	const jwt = mock<JwtService>();
	jwt.sign.mockImplementation((_purpose, payload) =>
		JSON.stringify({ ...payload, exp: now + 3600 }),
	);
	jwt.verify.mockImplementation((_purpose, token) => JSON.parse(token) as never);
	const service = new AppPreviewService(
		apps,
		versions,
		hosts,
		resources,
		users,
		cache,
		jwt,
		mock<UrlService>({ getInstanceBaseUrl: () => 'https://n8n.example.net/base' }),
	);
	const res = mock<Response>();
	res.set.mockReturnValue(res);
	res.status.mockReturnValue(res);
	return { service, app, apps, versions, resources, users, store, cache, jwt, res };
}

function previewRequest(query: Record<string, string> = {}, cookies: Record<string, string> = {}) {
	const req = mock<AppRequest>({ headers: { host: 'sales--preview.apps.example.com' }, cookies });
	req.query = query;
	req.appContext = undefined;
	return req;
}

async function grantCode(service: AppPreviewService) {
	const { url } = await service.createGrant('user-1', 'project-1', appId, versionId);
	return new URL(url).searchParams.get('code') ?? '';
}

describe('AppPreviewService', () => {
	it('exposes the editor origin for frame-ancestors', () => {
		expect(setup().service.editorOrigin).toBe('https://n8n.example.net');
	});

	describe('createGrant', () => {
		it('returns a preview host URL with a code that is stored for one minute', async () => {
			const { service, store, cache } = setup();

			const { url } = await service.createGrant('user-1', 'project-1', appId, versionId);

			expect(cache.set).toHaveBeenCalledWith(expect.any(String), expect.any(String), 60_000);

			const parsed = new URL(url);
			expect(parsed.origin).toBe('https://sales--preview.apps.example.com');
			expect(parsed.pathname).toBe('/_n8n/preview');
			expect(parsed.searchParams.get('code')).toMatch(/^[0-9a-f]{64}$/);
			expect([...store.keys()]).toEqual([expect.stringMatching(/^apps-preview:[0-9a-f]{64}$/)]);
			expect([...store.keys()][0]).not.toContain(parsed.searchParams.get('code'));
			expect(JSON.parse([...store.values()][0] as string)).toEqual({
				userId: 'user-1',
				appId,
				versionId,
			});
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
		it('sets a partitioned session cookie and redirects to a clean URL', async () => {
			const { service, res, jwt } = setup();
			const code = await grantCode(service);

			await service.exchange(previewRequest({ code }), res);

			expect(jwt.sign).toHaveBeenCalledWith(
				'appPreview',
				{ sub: 'user-1', appId, versionId },
				{ expiresIn: 3600 },
			);
			expect(res.cookie).toHaveBeenCalledWith('__Host-n8n-app-preview', expect.any(String), {
				httpOnly: true,
				secure: true,
				sameSite: 'none',
				partitioned: true,
				path: '/',
			});
			expect(res.set).toHaveBeenCalledWith({
				'Cache-Control': 'no-store',
				'Referrer-Policy': 'no-referrer',
			});
			expect(res.redirect).toHaveBeenCalledWith('/');
		});

		it('uses a same-site cookie on a plain HTTP apps domain', async () => {
			const { service, res } = setup('http://apps.localhost:5678');
			const code = await grantCode(service);
			const req = previewRequest({ code });
			req.headers.host = 'sales--preview.apps.localhost:5678';

			await service.exchange(req, res);

			expect(res.cookie).toHaveBeenCalledWith('n8n-app-preview', expect.any(String), {
				httpOnly: true,
				secure: false,
				sameSite: 'lax',
				path: '/',
			});
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
				const { service, res } = setup();
				await expect(service.exchange(previewRequest(query), res)).rejects.toThrow(
					'no longer valid',
				);
				expect(res.cookie).not.toHaveBeenCalled();
			},
		);

		it('rejects a code for another app', async () => {
			const { service, apps, res } = setup();
			const code = await grantCode(service);
			apps.findByNamespace.mockResolvedValue(mock<App>({ id: 'other-app' }));

			await expect(service.exchange(previewRequest({ code }), res)).rejects.toThrow(
				'no longer valid',
			);
		});

		it('rejects the exchange on a published app host', async () => {
			const { service, res } = setup();
			const code = await grantCode(service);
			const req = previewRequest({ code });
			req.headers.host = 'sales.apps.example.com';

			await expect(service.exchange(req, res)).rejects.toThrow('App not found.');
		});
	});

	describe('authenticate', () => {
		const session = (fields: Record<string, unknown> = {}) =>
			JSON.stringify({ sub: 'user-1', appId, versionId, exp: now + 3600, ...fields });

		async function authenticate(ctx: ReturnType<typeof setup>, cookie = session()) {
			const req = previewRequest({}, cookie ? { '__Host-n8n-app-preview': cookie } : {});
			const next = vi.fn();
			await ctx.service.authenticate(req, ctx.res, next);
			return { req, next };
		}

		it('serves the session version', async () => {
			const ctx = setup();

			const { req, next } = await authenticate(ctx);

			expect(next).toHaveBeenCalledOnce();
			expect(req.appContext).toEqual({ app: ctx.app, versionId, preview: true });
			expect(ctx.res.cookie).not.toHaveBeenCalled();
		});

		it('keeps the session expiry close to its end', async () => {
			const ctx = setup();

			await authenticate(ctx, session({ exp: now + 1000 }));

			expect(ctx.res.cookie).not.toHaveBeenCalled();
		});

		it.each<[string, (ctx: ReturnType<typeof setup>) => string]>([
			['no cookie', () => ''],
			['an invalid token', () => 'invalid'],
			['an incomplete token', () => JSON.stringify({ sub: 'user-1' })],
			[
				'a token for another app',
				(ctx) => {
					ctx.apps.findByNamespace.mockResolvedValue(mock<App>({ id: 'other-app' }));
					return session();
				},
			],
			[
				'an unknown user',
				(ctx) => {
					ctx.users.findByIdWithRole.mockResolvedValue(null);
					return session();
				},
			],
			[
				'a disabled user',
				(ctx) => {
					ctx.users.findByIdWithRole.mockResolvedValue(mock<User>({ disabled: true }));
					return session();
				},
			],
			[
				'a user without read access',
				(ctx) => {
					ctx.resources.canRead.mockResolvedValue(false);
					return session();
				},
			],
		])('rejects %s', async (_case, arrange) => {
			const ctx = setup();

			const { req, next } = await authenticate(ctx, arrange(ctx));

			expect(next).not.toHaveBeenCalled();
			expect(req.appContext).toBeUndefined();
			expect(ctx.res.status).toHaveBeenCalledWith(401);
		});
	});
});
