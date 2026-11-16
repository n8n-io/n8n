import { JwtService, UrlService } from '@n8n/backend-services';
import { OAuth2FlowProxy } from '@n8n/backend-services/auth';
import { ResourceAdmission, type ProtectedResource } from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { createHash } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { AppAuthService, type AppRequest } from '../app-auth.service';
import { AppProtectedResource } from '../app-protected-resource';
import type { App } from '../../app.entity';
import { AppRepository } from '../../app.repository';
import { AppHostService } from '../../serving/app-host.service';

const issuer = 'https://n8n.example.net';
const state = 'opaque.State_~-1';
const flowCookieName = `__Host-n8n-app-flow-${createHash('sha256').update(state).digest('hex')}`;
const appId = '11111111-1111-4111-8111-111111111111';

function setup(visibility: App['visibility'] = 'project') {
	const app = mock<App>({
		id: appId,
		namespace: 'sales',
		visibility,
		publishedVersionId: 'version',
	});
	const apps = mock<AppRepository>();
	apps.findByNamespace.mockResolvedValue(app);
	const hosts = mock<AppHostService>({
		baseUrl: new URL('https://apps.example.com'),
		namespace: () => 'sales',
		callbackUrl: () => `https://sales.apps.example.com/_n8n/auth/${appId}/callback`,
	});
	const resources = mock<AppProtectedResource>();
	resources.forApp.mockReturnValue(mock<ProtectedResource>());
	const flow = mock<OAuth2FlowProxy>();
	flow.begin.mockResolvedValue(`${issuer}/oauth/authorize?state=${state}`);
	flow.complete.mockImplementation(async () => ({
		valid: true,
		token: 'app-token',
		expiresIn: 3600,
		user: { id: 'user', email: '', firstName: '', lastName: '' },
		metadata: flow.begin.mock.calls[0]?.[1],
	}));
	const admission = mock<ResourceAdmission>();
	admission.admitBearer.mockResolvedValue({ ok: true, context: mock<SecurityContext>() });
	const jwt = mock<JwtService>();
	jwt.decodeUnverified.mockReturnValue({});
	const service = new AppAuthService(
		apps,
		hosts,
		resources,
		flow,
		admission,
		mock<UrlService>({ getInstanceBaseUrl: () => issuer }),
		jwt,
	);
	const req = mock<AppRequest>({
		method: 'GET',
		path: '/',
		originalUrl: '/orders/123',
		cookies: {},
	});
	req.query = { code: 'code', state, iss: issuer };
	const res = mock<Response>();
	res.set.mockReturnValue(res);
	res.status.mockReturnValue(res);
	return { service, app, apps, admission, flow, jwt, req, res };
}

const sessionCookie = { '__Host-n8n-app-session': 'app-token' };

describe('AppAuthService', () => {
	it('requires a published app', async () => {
		const { service, req, res, apps } = setup('instance');
		apps.findByNamespace.mockResolvedValue(null);
		await expect(service.authenticate(req, res, vi.fn())).rejects.toThrow('App not found');
	});

	it('authenticates instance apps with the session cookie', async () => {
		const { service, req, res, admission } = setup('instance');
		req.cookies = { '__Host-n8n-app-session': 'app-token' };
		const next = vi.fn();
		await service.authenticate(req, res, next);
		expect(admission.admitBearer).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			'app-token',
		);
		expect(next).toHaveBeenCalledOnce();
	});

	it('authenticates app requests with the session cookie', async () => {
		const { service, req, res, admission } = setup();
		req.cookies = { '__Host-n8n-app-session': 'app-token' };
		const next = vi.fn();
		await service.authenticate(req, res, next);
		expect(admission.admitBearer).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				method: 'GET',
				url: `https://sales.apps.example.com/_n8n/auth/${appId}/callback`,
			}),
			'app-token',
		);
		expect(next).toHaveBeenCalledOnce();
	});

	it('returns an auth error for assets without starting navigation', async () => {
		const { service, req, res, admission, flow } = setup();
		admission.admitBearer.mockResolvedValue({
			ok: false,
			reason: 'no-credential',
			advertised: mock(),
		});
		await service.authenticate(req, res, vi.fn());
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.set).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer');
		expect(flow.begin).not.toHaveBeenCalled();
	});

	it('routes private document visits through the app sign-in controller', async () => {
		const { service, req, res, admission, flow } = setup();
		req.get.mockReturnValue('navigate');
		admission.admitBearer.mockResolvedValue({
			ok: false,
			reason: 'no-credential',
			advertised: mock(),
		});
		await service.authenticate(req, res, vi.fn());
		expect(res.redirect).toHaveBeenCalledWith(
			`https://sales.apps.example.com/_n8n/auth/${appId}/login?returnTo=%2Forders%2F123`,
		);
		expect(flow.begin).not.toHaveBeenCalled();
	});

	it('denies insufficient permissions instead of restarting sign-in', async () => {
		const { service, req, res, admission, flow } = setup();
		req.cookies = sessionCookie;
		admission.admitBearer.mockResolvedValue({
			ok: false,
			reason: 'insufficient_scope',
			advertised: mock(),
		});
		await service.authenticate(req, res, vi.fn());
		expect(res.status).toHaveBeenCalledWith(403);
		expect(flow.begin).not.toHaveBeenCalled();
	});

	describe('admission cache', () => {
		let elapsed: number;
		const advance = (ms: number) => {
			elapsed += ms;
			vi.advanceTimersByTime(ms);
		};

		beforeEach(() => {
			elapsed = 1_000;
			vi.useFakeTimers({ toFake: ['Date', 'setTimeout'] });
			vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
		});

		afterEach(() => {
			vi.restoreAllMocks();
			vi.useRealTimers();
		});

		it('admits a repeated request without queries', async () => {
			const { service, req, apps, admission } = setup();
			req.cookies = sessionCookie;

			const first = await service.admit(req);
			const second = await service.admit(req);

			expect(first.ok && second.ok).toBe(true);
			expect(second).toEqual(first);
			expect(apps.findByNamespace).toHaveBeenCalledOnce();
			expect(admission.admitBearer).toHaveBeenCalledOnce();
		});

		it('admits again after the TTL', async () => {
			const { service, req, admission } = setup();
			req.cookies = sessionCookie;

			await service.admit(req);
			advance(30_001);
			await service.admit(req);

			expect(admission.admitBearer).toHaveBeenCalledTimes(2);
		});

		it('stops admitting a revoked token after the TTL', async () => {
			const { service, req, admission } = setup();
			req.cookies = sessionCookie;
			await service.admit(req);
			admission.admitBearer.mockResolvedValue({
				ok: false,
				reason: 'revoked',
				advertised: mock(),
			});

			expect((await service.admit(req)).ok).toBe(true);
			advance(30_001);
			expect((await service.admit(req)).ok).toBe(false);
		});

		it('drops an entry when the token expires', async () => {
			const { service, req, admission, jwt } = setup();
			req.cookies = sessionCookie;
			jwt.decodeUnverified.mockReturnValue({ exp: Date.now() / 1000 + 5 });

			await service.admit(req);
			advance(4_000);
			await service.admit(req);
			expect(admission.admitBearer).toHaveBeenCalledOnce();

			advance(2_000);
			await service.admit(req);
			expect(admission.admitBearer).toHaveBeenCalledTimes(2);
		});

		it('does not cache refusals', async () => {
			const { service, req, admission } = setup();
			req.cookies = sessionCookie;
			admission.admitBearer.mockResolvedValue({
				ok: false,
				reason: 'insufficient_scope',
				advertised: mock(),
			});

			await service.admit(req);
			await service.admit(req);

			expect(admission.admitBearer).toHaveBeenCalledTimes(2);
		});

		it('does not share entries between tokens', async () => {
			const { service, req, admission } = setup();
			req.cookies = sessionCookie;
			await service.admit(req);
			req.cookies = { '__Host-n8n-app-session': 'other-token' };
			await service.admit(req);

			expect(admission.admitBearer).toHaveBeenCalledTimes(2);
		});

		it('refuses a request without a session cookie without running the admission', async () => {
			const { service, req, admission } = setup();

			expect(await service.admit(req)).toMatchObject({ ok: false, reason: 'unauthenticated' });
			expect(admission.admitBearer).not.toHaveBeenCalled();
		});
	});

	it('sets a host-only app cookie after a browser-bound exchange', async () => {
		const { service, app, req, res, flow } = setup();
		await service.begin(app, '/orders/123?view=all', res);
		const [name, nonce] = res.cookie.mock.calls[0];
		expect(name).toBe(flowCookieName);
		req.cookies = { [name]: nonce };
		await service.complete(req, res, appId);
		expect(flow.complete).toHaveBeenCalledWith(
			'code',
			state,
			expect.objectContaining({ method: 'GET' }),
		);
		expect(res.cookie).toHaveBeenLastCalledWith('__Host-n8n-app-session', 'app-token', {
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 3600000,
		});
		expect(res.redirect).toHaveBeenLastCalledWith('/orders/123?view=all');
	});

	it.each([
		['access_denied', 'App sign-in was canceled. Open the app again to restart sign-in.'],
		['server_error', 'App sign-in failed. Open the app again to restart sign-in.'],
	])('handles an OAuth %s callback without a code', async (error, message) => {
		const { service, app, req, res, flow, admission } = setup();
		await service.begin(app, '/', res);
		const [name, nonce] = res.cookie.mock.calls[0];
		req.cookies = { [name]: nonce };
		req.query = { error, error_description: 'Authorization server details', state, iss: issuer };
		res.cookie.mockClear();
		res.redirect.mockClear();

		await expect(service.complete(req, res, appId)).rejects.toMatchObject({
			message,
			httpStatusCode: 401,
		});

		expect(res.clearCookie).toHaveBeenCalledExactlyOnceWith(name, {
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			path: '/',
		});
		expect(res.set).toHaveBeenCalledWith({
			'Cache-Control': 'no-store',
			'Referrer-Policy': 'no-referrer',
		});
		expect(flow.complete).not.toHaveBeenCalled();
		expect(admission.admitBearer).not.toHaveBeenCalled();
		expect(res.cookie).not.toHaveBeenCalled();
		expect(res.redirect).not.toHaveBeenCalled();
	});

	it.each([
		{ name: 'an empty state', query: { state: '' } },
		{ name: 'a repeated state', query: { state: [state, state] } },
		{ name: 'another issuer', query: { iss: 'https://other.example' } },
		{ name: 'an empty OAuth error', query: { error: '' } },
		{ name: 'a repeated OAuth error', query: { error: ['access_denied', 'server_error'] } },
		{ name: 'no code or OAuth error', query: { error: undefined } },
	])('rejects callbacks with $name', async ({ query }) => {
		const { service, req, res, flow } = setup();
		req.cookies = { [flowCookieName]: 'nonce' };
		req.query = { error: 'access_denied', state, iss: issuer, ...query };

		await expect(service.complete(req, res, appId)).rejects.toThrow('Invalid app sign-in callback');

		expect(flow.complete).not.toHaveBeenCalled();
		expect(res.cookie).not.toHaveBeenCalled();
	});

	it('requires a browser flow cookie for an OAuth error callback', async () => {
		const { service, req, res, flow } = setup();
		req.query = { error: 'access_denied', state, iss: issuer };

		await expect(service.complete(req, res, appId)).rejects.toThrow('this browser');

		expect(flow.complete).not.toHaveBeenCalled();
		expect(res.cookie).not.toHaveBeenCalled();
	});

	it('rejects completion when the exchanged token is not admitted', async () => {
		const { service, app, req, res, admission } = setup();
		await service.begin(app, '/orders/123', res);
		const [name, nonce] = res.cookie.mock.calls[0];
		req.cookies = { [name]: nonce };
		admission.admitBearer.mockResolvedValue({
			ok: false,
			reason: 'insufficient_scope',
			advertised: mock(),
		});
		res.cookie.mockClear();
		res.redirect.mockClear();

		await expect(service.complete(req, res, appId)).rejects.toThrow(
			'App access is no longer available',
		);

		expect(admission.admitBearer).toHaveBeenCalledExactlyOnceWith(
			expect.anything(),
			expect.objectContaining({
				method: 'GET',
				url: `https://sales.apps.example.com/_n8n/auth/${appId}/callback`,
			}),
			'app-token',
		);
		expect(res.cookie).not.toHaveBeenCalled();
		expect(res.redirect).not.toHaveBeenCalled();
	});

	it('does not exchange a callback from another browser or issuer', async () => {
		const { service, req, res, flow } = setup();
		await expect(service.complete(req, res, appId)).rejects.toThrow('this browser');
		expect(flow.complete).not.toHaveBeenCalled();
		req.query.iss = 'https://other.example';
		await expect(service.complete(req, res, appId)).rejects.toThrow('Invalid app sign-in callback');
	});

	it('rejects a mismatched browser binding after exchange', async () => {
		const { service, app, req, res } = setup();
		await service.begin(app, '/', res);
		req.cookies = { [res.cookie.mock.calls[0][0]]: 'another-browser' };
		await expect(service.complete(req, res, appId)).rejects.toThrow('expired or is invalid');
		expect(res.cookie).toHaveBeenCalledTimes(1);
	});

	it('keeps the return destination local to the app', async () => {
		const { service, app, req, res } = setup();
		await service.begin(app, '//other.example/path', res);
		const [name, nonce] = res.cookie.mock.calls[0];
		req.cookies = { [name]: nonce };
		await service.complete(req, res, appId);
		expect(res.redirect).toHaveBeenLastCalledWith('/');
	});
});
