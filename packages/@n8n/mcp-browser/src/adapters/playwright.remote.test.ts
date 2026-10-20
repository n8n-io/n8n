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

	it('closes a page through the relay', async () => {
		const relay = fakeRelay();
		relay.closeTab = vi.fn().mockResolvedValue(undefined);
		const adapter = new PlaywrightAdapter(config, { relay });
		await adapter.launch({ browser: 'chrome' });

		await adapter.closePage('tab-1');

		expect(relay.closeTab).toHaveBeenCalledWith('tab-1');
	});
});

describe('PlaywrightAdapter direct CDP mode', () => {
	const directConfig: ResolvedConfig = { ...config, mode: 'direct_cdp' };

	function fakePage(url: string) {
		return { url: () => url, on: vi.fn(), close: vi.fn().mockResolvedValue(undefined) };
	}

	function browserWithPages(pages: Array<ReturnType<typeof fakePage>>) {
		const context = {
			on: vi.fn(),
			pages: () => pages,
			newPage: vi.fn(async () => {
				const page = fakePage('about:blank');
				pages.push(page);
				return page;
			}),
		};
		return {
			context,
			contexts: () => [context],
			newContext: vi.fn(),
			on: vi.fn(),
		};
	}

	it('connects straight to the endpoint', async () => {
		connectOverCDP.mockResolvedValue(browserWithPages([]));
		const adapter = new PlaywrightAdapter(directConfig, {
			cdpEndpoint: 'wss://connect.example.com/?signingKey=abc',
		});

		await adapter.launch({ browser: 'chrome' });

		expect(connectOverCDP).toHaveBeenCalledWith('wss://connect.example.com/?signingKey=abc', {
			headers: undefined,
			noDefaults: true,
		});
	});

	it('does not log the query string of the endpoint', async () => {
		connectOverCDP.mockResolvedValue(browserWithPages([]));
		const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
		configureLogger({ level: 'debug' });
		const adapter = new PlaywrightAdapter(directConfig, {
			cdpEndpoint: 'wss://connect.example.com/?signingKey=abc',
		});

		let logged: string;
		try {
			await adapter.launch({ browser: 'chrome' });
		} finally {
			logged = consoleLog.mock.calls.flat().map(String).join('\n');
			configureLogger({ level: 'silent' });
			consoleLog.mockRestore();
		}

		expect(logged).toContain('wss://connect.example.com/');
		expect(logged).not.toContain('signingKey');
	});

	it('throws when no endpoint is given', async () => {
		const adapter = new PlaywrightAdapter(directConfig);

		await expect(adapter.launch({ browser: 'chrome' })).rejects.toThrow(
			'Direct CDP mode requires a CDP endpoint',
		);
		expect(connectOverCDP).not.toHaveBeenCalled();
	});

	it('tracks the pages that were open before it connected', async () => {
		connectOverCDP.mockResolvedValue(browserWithPages([fakePage('about:blank')]));
		const adapter = new PlaywrightAdapter(directConfig, {
			cdpEndpoint: 'wss://connect.example.com',
		});

		await adapter.launch({ browser: 'chrome' });

		expect(await adapter.listTabs()).toEqual([expect.objectContaining({ url: 'about:blank' })]);
	});

	it('opens a page when the browser has none, so tools have a page to act on', async () => {
		const browser = browserWithPages([]);
		connectOverCDP.mockResolvedValue(browser);
		const adapter = new PlaywrightAdapter(directConfig, {
			cdpEndpoint: 'wss://connect.example.com',
		});

		await adapter.launch({ browser: 'chrome' });

		expect(browser.context.newPage).toHaveBeenCalledTimes(1);
		expect(await adapter.listTabs()).toEqual([expect.objectContaining({ url: 'about:blank' })]);
	});

	it('does not open a page when the browser already has one', async () => {
		const browser = browserWithPages([fakePage('https://example.com/')]);
		connectOverCDP.mockResolvedValue(browser);
		const adapter = new PlaywrightAdapter(directConfig, {
			cdpEndpoint: 'wss://connect.example.com',
		});

		await adapter.launch({ browser: 'chrome' });

		expect(browser.context.newPage).not.toHaveBeenCalled();
		expect(await adapter.listTabs()).toEqual([
			expect.objectContaining({ url: 'https://example.com/' }),
		]);
	});

	it('closes a page through Playwright', async () => {
		const page = fakePage('about:blank');
		connectOverCDP.mockResolvedValue(browserWithPages([page]));
		const adapter = new PlaywrightAdapter(directConfig, {
			cdpEndpoint: 'wss://connect.example.com',
		});
		await adapter.launch({ browser: 'chrome' });
		const [tab] = await adapter.listTabs();

		await adapter.closePage(tab.id);

		expect(page.close).toHaveBeenCalled();
		expect(await adapter.listTabs()).toEqual([]);
	});
});
