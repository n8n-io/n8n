import { PlaywrightAdapter } from './playwright';
import type { CDPRelayServer } from '../cdp-relay';
import { UnsupportedOperationError } from '../errors';
import { configureLogger } from '../logger';
import type { ResolvedConfig } from '../types';

configureLogger({ level: 'silent' });

const { connectOverCDP } = vi.hoisted(() => ({ connectOverCDP: vi.fn() }));

vi.mock('playwright-core', () => ({
	chromium: { connectOverCDP },
}));

function fakeBrowser() {
	return {
		contexts: () => [{ on: vi.fn() }],
		newContext: vi.fn(),
		on: vi.fn(),
	};
}

function fakeRelay(): CDPRelayServer {
	return {
		waitForExtension: vi.fn().mockResolvedValue(undefined),
		cdpEndpoint: vi.fn().mockReturnValue('ws://127.0.0.1:9999/cdp/relay-default'),
		onExtensionDisconnect: undefined,
	} as unknown as CDPRelayServer;
}

const config: ResolvedConfig = {
	defaultBrowser: 'chrome',
	browsers: new Map(),
	adapter: 'playwright',
	mode: 'remote',
};

beforeEach(() => {
	vi.clearAllMocks();
	connectOverCDP.mockResolvedValue(fakeBrowser());
});

describe('PlaywrightAdapter remote mode', () => {
	it('connects to the provided cdpEndpoint with the supplied headers', async () => {
		const relay = fakeRelay();
		const adapter = new PlaywrightAdapter(config, {
			relay,
			cdpEndpoint: 'ws://127.0.0.1:5678/browser-use/cdp/sess',
			cdpConnectHeaders: { authorization: 'tok' },
		});

		await adapter.launch({ browser: 'chrome' });

		expect(relay.waitForExtension).toHaveBeenCalled();
		expect(connectOverCDP).toHaveBeenCalledWith('ws://127.0.0.1:5678/browser-use/cdp/sess', {
			headers: { authorization: 'tok' },
			noDefaults: true,
		});
	});

	it('falls back to relay.cdpEndpoint() when no explicit endpoint is provided', async () => {
		const relay = fakeRelay();
		const adapter = new PlaywrightAdapter(config, { relay });

		await adapter.launch({ browser: 'chrome' });

		expect(connectOverCDP).toHaveBeenCalledWith('ws://127.0.0.1:9999/cdp/relay-default', {
			headers: undefined,
			noDefaults: true,
		});
	});

	it('rejects file uploads', async () => {
		const adapter = new PlaywrightAdapter(config, { relay: fakeRelay() });

		await expect(adapter.upload('page1', { ref: 'e1' }, ['/tmp/a.txt'])).rejects.toThrow(
			UnsupportedOperationError,
		);
	});

	it.each([
		{ name: 'remote mode', adapterConfig: config, relay: fakeRelay(), registered: false },
		{
			name: 'an external relay',
			adapterConfig: { ...config, mode: 'local' as const },
			relay: fakeRelay(),
			registered: false,
		},
		{
			name: 'local mode',
			adapterConfig: { ...config, mode: 'local' as const },
			relay: undefined,
			registered: true,
		},
	])(
		'file chooser listener with $name: registered=$registered',
		({ adapterConfig, relay, registered }) => {
			const adapter = new PlaywrightAdapter(adapterConfig, { relay });
			const page = { on: vi.fn(), url: () => 'https://example.com' };
			(adapter as unknown as { trackPage(page: unknown): void }).trackPage(page);

			const events = page.on.mock.calls.map(([event]) => event);
			expect(events).toContain('console');
			expect(events.includes('filechooser')).toBe(registered);
		},
	);
});
