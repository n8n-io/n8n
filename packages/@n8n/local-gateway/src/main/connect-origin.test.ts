import { assertConnectOriginAllowed, isAlreadyConnectedTo } from './connect-origin';

describe('assertConnectOriginAllowed', () => {
	it('does not throw when origin matches an allowed pattern', () => {
		expect(() =>
			assertConnectOriginAllowed('https://foo.app.n8n.cloud/', ['https://*.app.n8n.cloud']),
		).not.toThrow();
	});

	it('throws when origin is not allowed', () => {
		expect(() =>
			assertConnectOriginAllowed('https://evil.example/', ['https://*.app.n8n.cloud']),
		).toThrow(/not in your allowed origins/);
	});

	it('throws on invalid URL', () => {
		expect(() => assertConnectOriginAllowed('not-a-url', ['https://*.app.n8n.cloud'])).toThrow(
			/Invalid instance URL/,
		);
	});
});

describe('isAlreadyConnectedTo', () => {
	const connected = {
		status: 'connected' as const,
		connectedUrl: 'http://localhost:5678',
		lastError: null,
	};

	it('returns true for the connected URL, with or without a trailing slash', () => {
		expect(isAlreadyConnectedTo('http://localhost:5678', connected)).toBe(true);
		expect(isAlreadyConnectedTo('http://localhost:5678/', connected)).toBe(true);
	});

	it('returns false for a different URL', () => {
		expect(isAlreadyConnectedTo('http://127.0.0.1:5678', connected)).toBe(false);
	});

	it('returns false when the gateway is not connected', () => {
		expect(isAlreadyConnectedTo('http://localhost:5678', { ...connected, status: 'error' })).toBe(
			false,
		);
	});
});
