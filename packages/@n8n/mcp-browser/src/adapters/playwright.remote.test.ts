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

describe('PlaywrightAdapter direct-cdp mode', () => {
	const directConfig: ResolvedConfig = { ...config, mode: 'direct-cdp' };
	const endpoint = 'wss://connect.example.com/session?token=abc';

	function fakePage(url = 'https://example.com/') {
		return {
			url: () => url,
			title: vi.fn().mockResolvedValue('Example'),
			on: vi.fn(),
			close: vi.fn().mockResolvedValue(undefined),
		};
	}

	function fakeDirectBrowser(pages: Array<ReturnType<typeof fakePage>>) {
		return {
			contexts: () => [{ on: vi.fn(), pages: () => pages }],
			newContext: vi.fn(),
			on: vi.fn(),
		};
	}

	it('connects to the cdpEndpoint with the supplied headers', async () => {
		connectOverCDP.mockResolvedValue(fakeDirectBrowser([]));
		const adapter = new PlaywrightAdapter(directConfig, {
			cdpEndpoint: endpoint,
			cdpConnectHeaders: { authorization: 'tok' },
		});

		await adapter.launch({ browser: 'chrome' });

		expect(connectOverCDP).toHaveBeenCalledWith(endpoint, {
			headers: { authorization: 'tok' },
			noDefaults: true,
		});
	});

	it('lists the pages already open in the browser', async () => {
		connectOverCDP.mockResolvedValue(fakeDirectBrowser([fakePage('https://example.com/')]));
		const adapter = new PlaywrightAdapter(directConfig, { cdpEndpoint: endpoint });

		await adapter.launch({ browser: 'chrome' });

		expect(await adapter.listTabs()).toEqual([
			expect.objectContaining({ title: 'Example', url: 'https://example.com/' }),
		]);
	});

	it('closes the page itself when asked to close a tab', async () => {
		const page = fakePage();
		connectOverCDP.mockResolvedValue(fakeDirectBrowser([page]));
		const adapter = new PlaywrightAdapter(directConfig, { cdpEndpoint: endpoint });
		await adapter.launch({ browser: 'chrome' });
		const [tab] = await adapter.listTabs();

		await adapter.closePage(tab.id);

		expect(page.close).toHaveBeenCalled();
		expect(await adapter.listTabs()).toEqual([]);
	});

	it('throws when no cdpEndpoint is provided', async () => {
		const adapter = new PlaywrightAdapter(directConfig);

		await expect(adapter.launch({ browser: 'chrome' })).rejects.toThrow(
			'Direct CDP mode requires a cdpEndpoint',
		);
		expect(connectOverCDP).not.toHaveBeenCalled();
	});
});
