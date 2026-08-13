import { getRelayHost, isAllowedRelayUrl, isLocalhostRelay } from './relayAllowlist';

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

describe('isLocalhostRelay', () => {
	it('is true only for local hosts', () => {
		expect(isLocalhostRelay('ws://localhost:5680/x')).toBe(true);
		expect(isLocalhostRelay('ws://127.0.0.1:5680/x')).toBe(true);
		expect(isLocalhostRelay('ws://[::1]:5680/x')).toBe(true);
		expect(isLocalhostRelay('wss://acme.app.n8n.cloud/x')).toBe(false);
		expect(isLocalhostRelay(null)).toBe(false);
	});
});

describe('getRelayHost', () => {
	it('returns the hostname for a valid URL', () => {
		expect(getRelayHost('wss://acme.app.n8n.cloud/x')).toBe('acme.app.n8n.cloud');
	});

	it('returns null for malformed or empty input', () => {
		expect(getRelayHost('not a url')).toBeNull();
		expect(getRelayHost(null)).toBeNull();
		expect(getRelayHost(undefined)).toBeNull();
	});
});
