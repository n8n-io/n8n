import {
	getRelayHostKey,
	isAllowedPageOrigin,
	isAllowedRelayUrl,
	isLocalhostRelay,
} from './relayAllowlist';

describe('isAllowedRelayUrl', () => {
	it('allows n8n cloud tenant subdomains over wss', () => {
		expect(isAllowedRelayUrl('wss://acme.app.n8n.cloud/browser-use/extension/s?token=t')).toBe(
			true,
		);
		expect(isAllowedRelayUrl('wss://acme.stage-app.n8n.cloud/browser-use/extension/s')).toBe(true);
	});

	it('allows the bare cloud apex', () => {
		expect(isAllowedRelayUrl('wss://app.n8n.cloud/x')).toBe(true);
	});

	it('allows localhost relays for local development', () => {
		expect(isAllowedRelayUrl('ws://localhost:5680/browser-use/cdp/s')).toBe(true);
		// Plaintext is loopback-only, so a stored approval can't be spent over one.
		expect(isAllowedRelayUrl('ws://acme.app.n8n.cloud/x')).toBe(false);
		expect(isAllowedRelayUrl('ws://127.0.0.1:5680/x')).toBe(true);
		expect(isAllowedRelayUrl('ws://[::1]:5680/x')).toBe(true);
	});

	it('rejects unrecognized hosts', () => {
		expect(isAllowedRelayUrl('wss://evil.com/x')).toBe(false);
		expect(isAllowedRelayUrl('wss://notn8ncloud.com/x')).toBe(false);
	});

	it('rejects suffix-spoofing hosts', () => {
		expect(isAllowedRelayUrl('wss://app.n8n.cloud.evil.com/x')).toBe(false);
		expect(isAllowedRelayUrl('wss://evil-app.n8n.cloud.attacker.net/x')).toBe(false);
	});

	it('rejects non-websocket schemes', () => {
		expect(isAllowedRelayUrl('https://acme.app.n8n.cloud/x')).toBe(false);
		expect(isAllowedRelayUrl('http://localhost:5680/x')).toBe(false);
	});

	it('rejects malformed or empty input', () => {
		expect(isAllowedRelayUrl('not a url')).toBe(false);
		expect(isAllowedRelayUrl('')).toBe(false);
		expect(isAllowedRelayUrl(null)).toBe(false);
		expect(isAllowedRelayUrl(undefined)).toBe(false);
	});
});

describe('isAllowedPageOrigin', () => {
	it('allows n8n cloud origins over https', () => {
		expect(isAllowedPageOrigin('https://acme.app.n8n.cloud')).toBe(true);
		expect(isAllowedPageOrigin('https://acme.stage-app.n8n.cloud')).toBe(true);
	});

	it('allows local origins over http and https', () => {
		expect(isAllowedPageOrigin('http://localhost:5678')).toBe(true);
		expect(isAllowedPageOrigin('https://localhost:5678')).toBe(true);
		expect(isAllowedPageOrigin('http://127.0.0.1:5678')).toBe(true);
	});

	it('rejects cloud hosts over plain http', () => {
		expect(isAllowedPageOrigin('http://acme.app.n8n.cloud')).toBe(false);
	});

	it('rejects unrecognized and suffix-spoofing origins', () => {
		expect(isAllowedPageOrigin('https://evil.example.com')).toBe(false);
		expect(isAllowedPageOrigin('https://app.n8n.cloud.evil.com')).toBe(false);
	});

	it('rejects malformed or empty input', () => {
		expect(isAllowedPageOrigin('not a url')).toBe(false);
		expect(isAllowedPageOrigin('')).toBe(false);
		expect(isAllowedPageOrigin(null)).toBe(false);
		expect(isAllowedPageOrigin(undefined)).toBe(false);
	});
});

describe('isLocalhostRelay', () => {
	it('is true only for local hosts', () => {
		expect(isLocalhostRelay('ws://localhost:5680/x')).toBe(true);
		expect(isLocalhostRelay('ws://127.0.0.1:5680/x')).toBe(true);
		expect(isLocalhostRelay('ws://[::1]:5680/x')).toBe(true);
		expect(isLocalhostRelay('wss://acme.app.n8n.cloud/x')).toBe(false);
		expect(isLocalhostRelay(null)).toBe(false);
	});
});

describe('getRelayHostKey', () => {
	it('keeps the port so two local instances stay distinct', () => {
		expect(getRelayHostKey('ws://localhost:5678/x')).toBe('localhost:5678');
		expect(getRelayHostKey('ws://localhost:5679/x')).toBe('localhost:5679');
	});

	it('omits the port when it is the default for the protocol', () => {
		expect(getRelayHostKey('wss://acme.app.n8n.cloud/x')).toBe('acme.app.n8n.cloud');
		expect(getRelayHostKey('wss://acme.app.n8n.cloud:443/x')).toBe('acme.app.n8n.cloud');
	});

	it('returns null for malformed or empty input', () => {
		expect(getRelayHostKey('not a url')).toBeNull();
		expect(getRelayHostKey(null)).toBeNull();
		expect(getRelayHostKey(undefined)).toBeNull();
	});
});
