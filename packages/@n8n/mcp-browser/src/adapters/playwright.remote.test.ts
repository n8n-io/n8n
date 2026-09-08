import { PlaywrightAdapter } from './playwright';
import type { CDPRelayServer } from '../cdp-relay';
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
});
