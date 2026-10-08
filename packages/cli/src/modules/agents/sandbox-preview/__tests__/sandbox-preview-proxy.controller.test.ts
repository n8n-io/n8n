import type { User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import { SandboxPreviewProxyController } from '../sandbox-preview-proxy.controller';
import { SANDBOX_PREVIEW_TTL_SECONDS } from '../sandbox-preview.service';
import {
	ORIGIN_WIDE_HEADERS,
	PAGE,
	PORT_PATH,
	SESSION_COOKIE,
	expectHardened,
	usePreviewHarness,
} from './sandbox-preview-harness';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

describe('SandboxPreviewProxyController', () => {
	const h = usePreviewHarness();
	const {
		seen,
		apiKey,
		jwtService,
		authService,
		userRepository,
		tokenUser,
		sessionUser,
		openPreview,
		send,
	} = h;

	it('is a root-level route without session auth', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			SandboxPreviewProxyController as never,
		);

		expect(metadata.basePath).toBe('/sandbox-preview');
		expect(metadata.registerOnRootPath).toBe(true);
		expect(SandboxPreviewProxyController.routers).toEqual([
			expect.objectContaining({ path: '/', skipAuth: true }),
		]);
	});

	it('proxies a GET under the port route with the API key, the rest of the path and the query', async () => {
		const { url } = await openPreview();

		const answer = await send(`${url}src/main.ts?t=1&v=2`);

		expect(answer.status).toBe(200);
		expect(answer.body).toBe('export {}');
		expect(seen).toHaveLength(1);
		expect(seen[0].method).toBe('GET');
		expect(seen[0].url).toBe(`${PORT_PATH}/src/main.ts?t=1&v=2`);
		expect(seen[0].headers['x-api-key']).toBe(apiKey);
		expect(seen[0].headers.host).toBe(new URL(h.servers.upstreamUrl).host);
	});

	it('strips n8n credentials and conditional headers, and replaces a client API key', async () => {
		const { url } = await openPreview();

		await send(`${url}src/main.ts`, {
			headers: {
				cookie: 'n8n-auth=secret-session; other=1',
				authorization: 'Bearer secret',
				'if-none-match': '"etag"',
				'if-modified-since': 'Wed, 07 Oct 2026 10:00:00 GMT',
				'x-api-key': 'client-supplied',
			},
		});

		const { headers } = seen[0];
		expect(headers.cookie).toBeUndefined();
		expect(headers.authorization).toBeUndefined();
		expect(headers['if-none-match']).toBeUndefined();
		expect(headers['if-modified-since']).toBeUndefined();
		expect(headers['x-api-key']).toBe(apiKey);
	});

	it('applies the header allowlist and the API key to a request that sends Expect: 100-continue', async () => {
		const { url } = await openPreview();

		const answer = await send(`${url}api/items`, {
			method: 'POST',
			headers: {
				expect: '100-continue',
				'content-type': 'text/plain',
				cookie: 'n8n-auth=secret-session',
				authorization: 'Bearer secret',
				'x-forwarded-user': 'ada',
			},
			body: 'hello',
		});

		expect(answer.status).toBe(200);
		const { headers, body } = seen[0];
		expect(body).toBe('hello');
		expect(headers['x-api-key']).toBe(apiKey);
		expect(headers.expect).toBeUndefined();
		expect(headers.cookie).toBeUndefined();
		expect(headers.authorization).toBeUndefined();
		expect(headers['x-forwarded-user']).toBeUndefined();
	});

	it('applies the allowlist to a streamed multipart body that sends Expect: 100-continue', async () => {
		const { url } = await openPreview();
		const body = ['--b', 'Content-Disposition: form-data; name="a"', '', '1', '--b--', ''].join(
			'\r\n',
		);

		await send(`${url}api/upload`, {
			method: 'POST',
			headers: {
				expect: '100-continue',
				'content-type': 'multipart/form-data; boundary=b',
				cookie: 'n8n-auth=secret-session',
			},
			body,
		});

		expect(seen[0].body).toBe(body);
		expect(seen[0].headers['x-api-key']).toBe(apiKey);
		expect(seen[0].headers.expect).toBeUndefined();
		expect(seen[0].headers.cookie).toBeUndefined();
	});

	it('keeps headers that a reverse proxy in front of n8n adds away from the app', async () => {
		const { url } = await openPreview();

		await send(`${url}src/main.ts`, {
			headers: {
				'x-forwarded-for': '203.0.113.7',
				'x-forwarded-user': 'ada',
				'x-forwarded-access-token': `token-${crypto.randomUUID()}`,
				'cf-access-jwt-assertion': `assertion-${crypto.randomUUID()}`,
				'proxy-authorization': 'Basic placeholder',
				'browser-id': 'browser-1',
				referer: `http://127.0.0.1:${h.servers.port}/projects/p/agents/a`,
			},
		});

		expect(Object.keys(seen[0].headers).sort()).toEqual(['connection', 'host', 'x-api-key']);
	});

	it('forwards the headers that the app needs to answer', async () => {
		const { url } = await openPreview();
		const sent = {
			accept: 'application/json',
			'accept-language': 'en-GB',
			'content-type': 'application/json',
			origin: 'null',
			range: 'bytes=0-99',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'user-agent': 'preview-test',
			'x-requested-with': 'XMLHttpRequest',
		};

		await send(`${url}api/items`, { headers: sent });

		expect(seen[0].headers).toEqual(expect.objectContaining(sent));
	});

	it('replaces the security headers of a script and keeps its other headers', async () => {
		const { url } = await openPreview();

		const answer = await send(`${url}src/main.ts`, { headers: { accept: '*/*' } });

		expectHardened(answer);
		expect(answer.headers['x-frame-options']).toBeUndefined();
		expect(answer.headers['set-cookie']).toBeUndefined();
		expect(answer.headers['access-control-allow-credentials']).toBeUndefined();
		expect(answer.headers['x-app-version']).toBe('1.2.3');
	});

	it('removes the headers of the app that would act on the whole n8n origin', async () => {
		const { url } = await openPreview();

		const answer = await send(url, { headers: PAGE });

		for (const name of Object.keys(ORIGIN_WIDE_HEADERS)) {
			expect(answer.headers).not.toHaveProperty(name);
		}
	});

	it('serves the page with the hardening headers', async () => {
		const { url } = await openPreview();

		const answer = await send(url, { headers: PAGE });

		expect(answer.status).toBe(200);
		expect(answer.body).toBe('<html>app</html>');
		expectHardened(answer);
		expect(answer.headers['set-cookie']).toBeUndefined();
	});

	it('proxies under the base path of a service URL', async () => {
		const { url } = await openPreview({
			serviceUrl: `${h.servers.upstreamUrl}/base`,
			path: PORT_PATH,
		});

		const answer = await send(`${url}src/main.ts`);

		expect(answer.status).toBe(200);
		expect(seen[0].url).toBe(`/base${PORT_PATH}/src/main.ts`);
	});

	it.each([
		'/../../sandboxes/other/exec',
		'/src/..%2F..%2Fsandboxes/other/exec',
		'/%2e%2e/%2e%2e/sandboxes/other/exec',
		'/src/.%2e/..',
		'/..%5c..%5csandboxes',
		'/%252e%252e/sandboxes/other/exec',
		'/%zz',
	])('answers 400 without proxying when the path leaves the port route (%s)', async (suffix) => {
		const { token } = await openPreview();

		const answer = await send(`/sandbox-preview/${token}${suffix}`);

		expect(answer.status).toBe(400);
		expectHardened(answer);
		expect(seen).toHaveLength(0);
	});

	it('proxies a dot segment that stays inside the port route', async () => {
		const { url } = await openPreview();

		const answer = await send(`${url}src/./main.ts`);

		expect(answer.status).toBe(200);
		expect(seen[0].url).toBe(`${PORT_PATH}/src/./main.ts`);
	});

	it('redirects the URL without a trailing slash to the slashed form', async () => {
		const { token } = await openPreview();

		const answer = await send(`/sandbox-preview/${token}?x=1`);

		expect(answer.status).toBe(302);
		expect(answer.headers.location).toBe(`./${token}/?x=1`);
		expectHardened(answer);
		expect(seen).toHaveLength(0);
	});

	describe('token checks', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it.each(['/sandbox-preview', '/sandbox-preview/', '/sandbox-preview/unknown/src/main.ts'])(
			'answers 404 for %s',
			async (path) => {
				const answer = await send(path, { headers: { cookie: `n8n-auth=${SESSION_COOKIE}` } });

				expect(answer.status).toBe(404);
				expectHardened(answer);
				expect(seen).toHaveLength(0);
			},
		);

		it('answers 404 for a token with another audience', async () => {
			const { token } = await openPreview();
			const { jti } = jwtService.decodeUnverified<{ jti: string }>(token);
			const forged = jwtService.sign('session', { sub: 'user-1', jti });

			const answer = await send(`/sandbox-preview/${forged}/`, { headers: PAGE });

			expect(answer.status).toBe(404);
			expect(seen).toHaveLength(0);
		});

		it('answers 404 once the token has expired', async () => {
			const { url } = await openPreview();
			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(Date.now() + SANDBOX_PREVIEW_TTL_SECONDS * 1000);

			const answer = await send(url, { headers: PAGE });

			expect(answer.status).toBe(404);
			expect(seen).toHaveLength(0);
		});
	});

	describe('access', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it('answers 403 when the user of the token lost agent:execute, and 404 afterwards', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);
			const { url } = await openPreview();

			const denied = await send(url, { headers: PAGE });
			const later = await send(`${url}src/main.ts`, { headers: { accept: '*/*' } });

			expect(denied.status).toBe(403);
			expectHardened(denied);
			expect(later.status).toBe(404);
			expect(seen).toHaveLength(0);
			expect(userRepository.findByIdWithRole).toHaveBeenCalledWith('user-1');
			expect(userHasScopes).toHaveBeenCalledTimes(1);
			expect(userHasScopes).toHaveBeenCalledWith(tokenUser, ['agent:execute'], false, {
				projectId: 'project-1',
			});
		});

		it('answers 403 to a script request, whatever its Accept header, once the user lost access', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);
			const { url } = await openPreview();

			const answer = await send(`${url}api/items`, {
				method: 'DELETE',
				headers: { accept: '*/*' },
			});

			expect(answer.status).toBe(403);
			expect(seen).toHaveLength(0);
		});

		it('checks the user of the token once for a burst of the page, scripts and API calls', async () => {
			const { url } = await openPreview();

			await send(url, { headers: PAGE });
			await send(`${url}src/main.ts`, { headers: { accept: '*/*' } });
			await send(`${url}api/items`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: '{}',
			});

			expect(seen).toHaveLength(3);
			expect(userRepository.findByIdWithRole).toHaveBeenCalledTimes(1);
			expect(userHasScopes).toHaveBeenCalledTimes(1);
		});

		it('ends the preview within thirty seconds after the user of the token lost access', async () => {
			// Date stands still from here, so the first check passes at `start` exactly.
			vi.useFakeTimers({ toFake: ['Date'] });
			const start = Date.now();
			const { url } = await openPreview();
			await send(`${url}src/main.ts`);
			vi.mocked(userHasScopes).mockResolvedValue(false);

			vi.setSystemTime(start + 30_000 - 1);
			const cached = await send(`${url}src/main.ts`);
			vi.setSystemTime(start + 30_000);
			const checked = await send(`${url}src/main.ts`);

			expect(cached.status).toBe(200);
			expect(checked.status).toBe(403);
			expect(userHasScopes).toHaveBeenCalledTimes(2);
		});

		it('checks the user of the token again on each page load without a cookie', async () => {
			vi.useFakeTimers({ toFake: ['Date'] });
			const start = Date.now();
			const { url } = await openPreview();
			const passed = await send(url, { headers: PAGE });
			vi.mocked(userHasScopes).mockResolvedValue(false);

			vi.setSystemTime(start + 1_000);
			const reload = await send(url, { headers: PAGE });
			const later = await send(`${url}src/main.ts`, { headers: { accept: '*/*' } });

			expect(passed.status).toBe(200);
			expect(reload.status).toBe(403);
			expect(later.status).toBe(404);
			expect(userHasScopes).toHaveBeenCalledTimes(2);
			expect(seen).toHaveLength(1);
		});

		it('checks a page load again after a script passed, and keeps the pass for scripts', async () => {
			const { url } = await openPreview();

			await send(`${url}src/main.ts`, { headers: { accept: '*/*' } });
			await send(url, { headers: { 'sec-fetch-dest': 'iframe' } });
			await send(`${url}src/app.ts`, { headers: { accept: '*/*' } });

			expect(seen).toHaveLength(3);
			expect(userRepository.findByIdWithRole).toHaveBeenCalledTimes(2);
			expect(userHasScopes).toHaveBeenCalledTimes(2);
		});

		it('checks the session user too when the page load sends the n8n cookie', async () => {
			const { url } = await openPreview();

			const answer = await send(url, {
				headers: { ...PAGE, cookie: `n8n-auth=${SESSION_COOKIE}` },
			});

			expect(answer.status).toBe(200);
			expect(authService.authenticateUserByCookie).toHaveBeenCalledWith(SESSION_COOKIE);
			expect(vi.mocked(userHasScopes).mock.calls.map(([user]) => user)).toEqual([
				tokenUser,
				sessionUser,
			]);
			expect(seen[0].headers.cookie).toBeUndefined();
		});

		it('answers 403 to a session user without access, and keeps the URL for its own user', async () => {
			vi.mocked(userHasScopes).mockImplementation(
				async (user) => await Promise.resolve(user === tokenUser),
			);
			const { url } = await openPreview();

			const denied = await send(url, {
				headers: { ...PAGE, cookie: `n8n-auth=${SESSION_COOKIE}` },
			});
			const ownUser = await send(url, { headers: PAGE });

			expect(denied.status).toBe(403);
			expect(ownUser.status).toBe(200);
			expect(seen).toHaveLength(1);
		});

		it('serves the page for the user of the URL when the session cookie no longer validates', async () => {
			const { url } = await openPreview();

			const answer = await send(url, { headers: { ...PAGE, cookie: 'n8n-auth=signed-out' } });

			expect(answer.status).toBe(200);
			expect(seen).toHaveLength(1);
			expect(seen[0].headers.cookie).toBeUndefined();
			expect(vi.mocked(userHasScopes).mock.calls.map(([user]) => user)).toEqual([tokenUser]);
		});

		it('answers 403 for a session cookie that does not validate when the user of the URL lost access', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);
			const { url } = await openPreview();

			const answer = await send(url, { headers: { ...PAGE, cookie: 'n8n-auth=signed-out' } });

			expect(answer.status).toBe(403);
			expect(seen).toHaveLength(0);
		});

		it('answers 500 without the app when the session check fails for another reason', async () => {
			authService.authenticateUserByCookie.mockRejectedValue(new Error('database not reachable'));
			const { url } = await openPreview();

			const answer = await send(url, {
				headers: { ...PAGE, cookie: `n8n-auth=${SESSION_COOKIE}` },
			});

			expect(answer.status).toBe(500);
			expect(answer.body).toBe('Internal Server Error');
			expectHardened(answer);
			expect(seen).toHaveLength(0);
			expect(h.logger.error).toHaveBeenCalledWith('Could not serve an app preview', {
				error: 'database not reachable',
			});
		});

		it('checks the session on a form submit that loads a new page into the frame', async () => {
			vi.mocked(userHasScopes).mockImplementation(
				async (user) => await Promise.resolve(user === tokenUser),
			);
			const { url } = await openPreview();

			const answer = await send(`${url}login`, {
				method: 'POST',
				headers: {
					'sec-fetch-dest': 'iframe',
					'content-type': 'application/x-www-form-urlencoded',
					cookie: `n8n-auth=${SESSION_COOKIE}`,
				},
				body: 'name=ada',
			});

			expect(answer.status).toBe(403);
			expect(seen).toHaveLength(0);
		});

		it('does not check the session for scripts and API calls that carry the cookie', async () => {
			const { url } = await openPreview();

			const answer = await send(`${url}src/main.ts`, {
				headers: { accept: '*/*', cookie: `n8n-auth=${SESSION_COOKIE}` },
			});

			expect(answer.status).toBe(200);
			expect(authService.authenticateUserByCookie).not.toHaveBeenCalled();
		});

		it.each([
			['is disabled', mock<User>({ id: 'user-1', disabled: true })],
			['no longer exists', null],
		])('answers 403 when the user of the token %s', async (_case, user) => {
			userRepository.findByIdWithRole.mockResolvedValue(user);
			const { url } = await openPreview();

			const answer = await send(url, { headers: { 'sec-fetch-dest': 'iframe' } });

			expect(answer.status).toBe(403);
			expect(userHasScopes).not.toHaveBeenCalled();
			expect(seen).toHaveLength(0);
		});
	});

	describe('CORS preflight from the opaque-origin page', () => {
		const preflight = {
			origin: 'null',
			'access-control-request-method': 'PUT',
			'access-control-request-headers': 'content-type',
		};

		it('answers the preflight itself, without the app and without an access check', async () => {
			const { url } = await openPreview();

			const answer = await send(`${url}api/items/1`, { method: 'OPTIONS', headers: preflight });

			expect(answer.status).toBe(204);
			expectHardened(answer);
			expect(answer.headers['access-control-allow-methods']).toContain('PUT');
			expect(answer.headers['access-control-allow-headers']).toContain('content-type');
			expect(answer.headers['access-control-max-age']).toBe('600');
			expect(seen).toHaveLength(0);
			expect(userHasScopes).not.toHaveBeenCalled();
		});

		it('answers 404 to a preflight with an unknown token', async () => {
			const answer = await send('/sandbox-preview/unknown/api/items', {
				method: 'OPTIONS',
				headers: preflight,
			});

			expect(answer.status).toBe(404);
			expect(answer.headers['access-control-allow-methods']).toBeUndefined();
		});

		it('proxies an OPTIONS request that is not a preflight to the app', async () => {
			const { url } = await openPreview();

			const answer = await send(`${url}api/items`, { method: 'OPTIONS' });

			expect(answer.status).toBe(200);
			expect(seen[0].method).toBe('OPTIONS');
		});
	});
});
