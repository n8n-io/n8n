import { assertConnectOriginAllowed } from './connect-origin';

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
