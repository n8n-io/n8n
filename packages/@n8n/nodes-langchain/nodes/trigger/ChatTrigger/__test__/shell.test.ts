import type { Request, Response } from 'express';

import {
	buildChatRefreshUrl,
	buildInnerFrameSrc,
	clearChatOAuthToken,
	clearChatRefreshToken,
	isChatOAuth2Enabled,
	isChatRefreshRequest,
	isShellInnerRequest,
	readChatOAuthToken,
	readChatRefreshToken,
	setChatOAuthToken,
	setChatRefreshToken,
} from '../shell';

const request = (overrides: Partial<Request> = {}) =>
	({
		headers: {},
		query: {},
		originalUrl: '/webhook/abc/chat',
		protocol: 'http',
		...overrides,
	}) as unknown as Request;

describe('isChatOAuth2Enabled', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it.each([
		['true', true],
		['false', false],
		[undefined, false],
	])('is %s for N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2=%s', (value, expected) => {
		vi.stubEnv('N8N_ENV_FEAT_CHAT_TRIGGER_OAUTH2', value);

		expect(isChatOAuth2Enabled()).toBe(expected);
	});
});

describe('isShellInnerRequest', () => {
	it('honors the flag for an iframe navigation', () => {
		const req = request({
			query: { n8nShellInner: '1' },
			headers: { 'sec-fetch-dest': 'iframe' },
		});

		expect(isShellInnerRequest(req)).toBe(true);
	});

	// A request with no header at all (any non-browser client, or a stripping proxy)
	// must not be treated as an iframe navigation.
	it('refuses the flag when Sec-Fetch-Dest is absent', () => {
		const req = request({ query: { n8nShellInner: '1' } });

		expect(isShellInnerRequest(req)).toBe(false);
	});

	// A hand-typed URL is a top-level navigation, so it must land on the shell —
	// otherwise a visitor could skip the trusted document and the connect UI on it.
	it('refuses the flag for a document navigation', () => {
		const req = request({
			query: { n8nShellInner: '1' },
			headers: { 'sec-fetch-dest': 'document' },
		});

		expect(isShellInnerRequest(req)).toBe(false);
	});

	it('is false without the flag', () => {
		const req = request({ headers: { 'sec-fetch-dest': 'iframe' } });

		expect(isShellInnerRequest(req)).toBe(false);
	});
});

describe('buildInnerFrameSrc', () => {
	it('flags the same endpoint as the inner render', () => {
		expect(buildInnerFrameSrc(request())).toBe('/webhook/abc/chat?n8nShellInner=1');
	});

	it('keeps the page own query parameters', () => {
		const req = request({ originalUrl: '/webhook-test/abc/chat?foo=bar' });

		expect(buildInnerFrameSrc(req)).toBe('/webhook-test/abc/chat?foo=bar&n8nShellInner=1');
	});

	it('does not duplicate an already-present flag', () => {
		const req = request({ originalUrl: '/webhook/abc/chat?n8nShellInner=1' });

		expect(buildInnerFrameSrc(req)).toBe('/webhook/abc/chat?n8nShellInner=1');
	});
});

describe('buildChatRefreshUrl', () => {
	it('flags the same endpoint as the refresh leg', () => {
		expect(buildChatRefreshUrl(request())).toBe('/webhook/abc/chat?n8nChatRefresh=1');
	});

	it('keeps the page own query parameters', () => {
		const req = request({ originalUrl: '/webhook-test/abc/chat?foo=bar' });

		expect(buildChatRefreshUrl(req)).toBe('/webhook-test/abc/chat?foo=bar&n8nChatRefresh=1');
	});
});

describe('chat OAuth2 one-hop cookie', () => {
	const resourceUrl = 'http://localhost:5678/webhook/abc/chat';
	const payload = { token: 'as-token', expiresAt: 1_700_000_000_000 };
	const serialized = JSON.stringify({ t: 'as-token', e: 1_700_000_000_000 });

	const response = () =>
		({
			cookie: vi.fn(),
			clearCookie: vi.fn(),
		}) as unknown as Response;

	it('sets the cookie scoped to the resource path, httpOnly and short-lived', () => {
		const req = request({ headers: { host: 'localhost:5678' }, protocol: 'http' });
		const res = response();

		setChatOAuthToken(res, req, resourceUrl, payload);

		expect(res.cookie).toHaveBeenCalledWith('n8n-chat-oauth', serialized, {
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			path: '/webhook/abc/chat',
			maxAge: 60_000,
		});
	});

	it('marks the cookie secure over https (honouring x-forwarded-proto)', () => {
		const req = request({ headers: { 'x-forwarded-proto': 'https' }, protocol: 'http' });
		const res = response();

		setChatOAuthToken(res, req, resourceUrl, payload);

		expect(res.cookie).toHaveBeenCalledWith(
			'n8n-chat-oauth',
			serialized,
			expect.objectContaining({ secure: true }),
		);
	});

	// A multi-hop proxy chain sends the closest proxy's scheme first (e.g. the
	// external request was https, an internal hop back to the app is http) —
	// only that first value decides whether the client's own leg was secure.
	it('marks the cookie secure from the first hop of a comma-separated proxy chain', () => {
		const req = request({
			headers: { 'x-forwarded-proto': 'https, http' },
			protocol: 'http',
		});
		const res = response();

		setChatOAuthToken(res, req, resourceUrl, payload);

		expect(res.cookie).toHaveBeenCalledWith(
			'n8n-chat-oauth',
			serialized,
			expect.objectContaining({ secure: true }),
		);
	});

	it('marks the cookie secure from the first hop when the header repeats as an array', () => {
		const req = request({
			headers: { 'x-forwarded-proto': ['https', 'http'] },
			protocol: 'http',
		});
		const res = response();

		setChatOAuthToken(res, req, resourceUrl, payload);

		expect(res.cookie).toHaveBeenCalledWith(
			'n8n-chat-oauth',
			serialized,
			expect.objectContaining({ secure: true }),
		);
	});

	// The shell schedules its refresh off the expiry, so it has to survive the round
	// trip through the cookie exactly as written.
	it('round-trips the token and its expiry', () => {
		const req = request({
			headers: { cookie: `other=1; n8n-chat-oauth=${encodeURIComponent(serialized)}; more=2` },
		});

		expect(readChatOAuthToken(req)).toEqual(payload);
	});

	it('returns null when the cookie is absent', () => {
		expect(readChatOAuthToken(request({ headers: { cookie: 'other=1' } }))).toBeNull();
		expect(readChatOAuthToken(request())).toBeNull();
	});

	// The refresh cookie's name begins with this one's, so a request carrying only the
	// refresh cookie must not be read as a payload.
	it('does not read the refresh cookie as the one-hop payload', () => {
		const req = request({ headers: { cookie: 'n8n-chat-oauth-refresh=refresh-token' } });

		expect(readChatOAuthToken(req)).toBeNull();
	});

	it('treats an undecodable value as no cookie', () => {
		const req = request({ headers: { cookie: 'n8n-chat-oauth=%' } });

		expect(readChatOAuthToken(req)).toBeNull();
	});

	// Anything that isn't the payload shape — a bare token from an older build, a
	// truncated value — must not schedule a refresh off a number we invented.
	it.each([
		['a bare token', 'as-token'],
		['a payload with no expiry', '{"t":"as-token"}'],
		['a payload with no token', '{"e":1700000000000}'],
		['a payload with an empty token', '{"t":"","e":1700000000000}'],
		['a non-finite expiry', '{"t":"as-token","e":null}'],
	])('treats %s as no cookie', (_label, value) => {
		const req = request({ headers: { cookie: `n8n-chat-oauth=${encodeURIComponent(value)}` } });

		expect(readChatOAuthToken(req)).toBeNull();
	});

	it('clears the cookie scoped to the same path', () => {
		const req = request({ headers: { host: 'localhost:5678' }, protocol: 'http' });
		const res = response();

		clearChatOAuthToken(res, req, resourceUrl);

		expect(res.clearCookie).toHaveBeenCalledWith('n8n-chat-oauth', {
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			path: '/webhook/abc/chat',
		});
	});
});

describe('chat OAuth2 refresh cookie', () => {
	const resourceUrl = 'http://localhost:5678/webhook/abc/chat';

	const response = () =>
		({
			cookie: vi.fn(),
			clearCookie: vi.fn(),
		}) as unknown as Response;

	// httpOnly is the whole design: no document and no script may read this value.
	// 30 days matches the AS's own refresh-token life, so the cookie never outlives
	// the grant it names.
	it('sets an httpOnly, path-scoped, 30-day cookie', () => {
		const req = request({ headers: { host: 'localhost:5678' }, protocol: 'http' });
		const res = response();

		setChatRefreshToken(res, req, resourceUrl, 'refresh-token');

		expect(res.cookie).toHaveBeenCalledWith('n8n-chat-oauth-refresh', 'refresh-token', {
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			path: '/webhook/abc/chat',
			maxAge: 30 * 24 * 60 * 60 * 1000,
		});
	});

	it('marks the cookie secure over https (honouring x-forwarded-proto)', () => {
		const req = request({ headers: { 'x-forwarded-proto': 'https' }, protocol: 'http' });
		const res = response();

		setChatRefreshToken(res, req, resourceUrl, 'refresh-token');

		expect(res.cookie).toHaveBeenCalledWith(
			'n8n-chat-oauth-refresh',
			'refresh-token',
			expect.objectContaining({ secure: true }),
		);
	});

	it('reads the cookie back alongside the one-hop cookie', () => {
		const req = request({
			headers: { cookie: 'n8n-chat-oauth=%7B%7D; n8n-chat-oauth-refresh=refresh-token' },
		});

		expect(readChatRefreshToken(req)).toBe('refresh-token');
	});

	it('returns null when the cookie is absent', () => {
		expect(readChatRefreshToken(request({ headers: { cookie: 'n8n-chat-oauth=x' } }))).toBeNull();
	});

	it('clears the cookie scoped to the same path', () => {
		const req = request({ headers: { host: 'localhost:5678' }, protocol: 'http' });
		const res = response();

		clearChatRefreshToken(res, req, resourceUrl);

		expect(res.clearCookie).toHaveBeenCalledWith('n8n-chat-oauth-refresh', {
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			path: '/webhook/abc/chat',
		});
	});
});

describe('isChatRefreshRequest', () => {
	const refreshRequest = (overrides: Partial<Request> = {}) =>
		request({
			query: { n8nChatRefresh: '1' },
			headers: { 'x-n8n-chat-refresh': '1', 'sec-fetch-site': 'same-origin' },
			...overrides,
		});

	it('accepts the shell own same-origin fetch', () => {
		expect(isChatRefreshRequest(refreshRequest())).toBe(true);
	});

	it('is false without the query flag', () => {
		expect(isChatRefreshRequest(refreshRequest({ query: {} }))).toBe(false);
	});

	// The custom header is the CSRF guard: another origin cannot set it without a
	// preflight this endpoint never answers. A plain forged GET has to be refused.
	it('refuses a request with no custom header', () => {
		expect(
			isChatRefreshRequest(refreshRequest({ headers: { 'sec-fetch-site': 'same-origin' } })),
		).toBe(false);
	});

	it.each(['cross-site', 'same-site', 'none'])('refuses Sec-Fetch-Site %s', (site) => {
		expect(
			isChatRefreshRequest(
				refreshRequest({ headers: { 'x-n8n-chat-refresh': '1', 'sec-fetch-site': site } }),
			),
		).toBe(false);
	});

	// A proxy that strips Sec-Fetch-Site must not break the leg; the custom header
	// still stands.
	it('accepts a request with no Sec-Fetch-Site at all', () => {
		expect(isChatRefreshRequest(refreshRequest({ headers: { 'x-n8n-chat-refresh': '1' } }))).toBe(
			true,
		);
	});
});
