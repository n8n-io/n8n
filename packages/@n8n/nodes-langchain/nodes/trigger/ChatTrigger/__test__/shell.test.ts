import type { Request } from 'express';

import {
	buildAbsoluteChatUrl,
	buildInnerFrameSrc,
	isChatOAuth2Enabled,
	isShellInnerRequest,
	readAuthCookie,
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

describe('buildAbsoluteChatUrl', () => {
	it('prefers the forwarding headers over the request', () => {
		const req = request({
			headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'chat.example.com' },
		});

		expect(buildAbsoluteChatUrl(req)).toBe('https://chat.example.com/webhook/abc/chat');
	});

	it('falls back to the request protocol and Host', () => {
		const req = request({ headers: { host: 'localhost:5678' } });

		expect(buildAbsoluteChatUrl(req)).toBe('http://localhost:5678/webhook/abc/chat');
	});
});

describe('readAuthCookie', () => {
	it('reads the session cookie from the raw header', () => {
		const req = request({ headers: { cookie: 'other=1; n8n-auth=token-value; more=2' } });

		expect(readAuthCookie(req)).toBe('token-value');
	});

	it('returns null when the cookie is absent', () => {
		expect(readAuthCookie(request({ headers: { cookie: 'other=1' } }))).toBeNull();
		expect(readAuthCookie(request())).toBeNull();
	});

	// `n8n-auth` must not be matched inside a longer cookie name.
	it('does not match a cookie whose name merely ends with n8n-auth', () => {
		const req = request({ headers: { cookie: 'notn8n-auth=nope' } });

		expect(readAuthCookie(req)).toBeNull();
	});
});
