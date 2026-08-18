import type { Browser, Page } from 'playwright-core';
import { chromium } from 'playwright-core';

import { OPT_OUT_SCRIPT } from './extension-opt-out';
import { PlaywrightAdapter } from './playwright';
import type { CDPRelayServer } from '../cdp-relay';
import { configureLogger } from '../logger';
import type { ResolvedConfig } from '../types';

vi.mock('playwright-core', () => ({
	chromium: { connectOverCDP: vi.fn() },
}));

configureLogger({ level: 'silent' });

const config: ResolvedConfig = {
	defaultBrowser: 'chrome',
	browsers: new Map(),
	adapter: 'playwright',
	mode: 'local',
};

function fakeLocator() {
	return {
		clear: vi.fn().mockResolvedValue(undefined),
		pressSequentially: vi.fn().mockResolvedValue(undefined),
		press: vi.fn().mockResolvedValue(undefined),
	};
}

function fakePage() {
	const locator = fakeLocator();
	const handlers = new Map<string, (arg: unknown) => void>();
	return {
		evaluate: vi.fn().mockResolvedValue(undefined),
		locator: vi.fn().mockReturnValue(locator),
		on: vi.fn((event: string, handler: (arg: unknown) => void) => handlers.set(event, handler)),
		url: vi.fn().mockReturnValue('https://example.com/login'),
		mainFrame: vi.fn().mockReturnValue({ id: 'main' }),
		emit: (event: string, arg: unknown) => handlers.get(event)?.(arg),
		fakeLocator: locator,
	};
}

function adapterWithTrackedPage(page: ReturnType<typeof fakePage>, { armed = false } = {}) {
	const adapter = new PlaywrightAdapter(config);
	const internals = adapter as unknown as {
		trackPage: (page: Page, explicitId?: string) => unknown;
		ensurePage: (pageId: string) => Promise<unknown>;
		optOutArmed: boolean;
	};
	internals.optOutArmed = armed;
	internals.trackPage(page as unknown as Page, 'p1');
	return { adapter, ensurePage: async () => await internals.ensurePage('p1') };
}

/** A page whose opt-out evaluate stays pending until the returned release is called. */
function pageWithPendingStamp() {
	const page = fakePage();
	let release = () => {};
	page.evaluate.mockReturnValue(
		new Promise<void>((resolve) => {
			release = resolve;
		}),
	);
	return { page, release: () => release() };
}

describe('PlaywrightAdapter extension opt-out', () => {
	it('arms the init script on the context while connecting, before any page exists', async () => {
		const addInitScript = vi.fn().mockResolvedValue(undefined);
		const context = { addInitScript, on: vi.fn() };
		const browser = { contexts: () => [context], on: vi.fn() };
		vi.mocked(chromium.connectOverCDP).mockResolvedValue(browser as unknown as Browser);

		const adapter = new PlaywrightAdapter(config);
		const internals = adapter as unknown as {
			relay?: CDPRelayServer;
			connectPlaywright: (endpoint: string) => Promise<void>;
		};
		internals.relay = {} as unknown as CDPRelayServer;

		await internals.connectPlaywright('ws://relay/cdp');

		expect(addInitScript).toHaveBeenCalledWith(OPT_OUT_SCRIPT);
	});

	it('stamps the pre-existing document when a page is first used', async () => {
		const page = fakePage();
		const { ensurePage } = adapterWithTrackedPage(page);

		await ensurePage();

		expect(page.evaluate).toHaveBeenCalledWith(OPT_OUT_SCRIPT);
	});

	it('stamps a given page only once', async () => {
		const page = fakePage();
		const { ensurePage } = adapterWithTrackedPage(page);

		await ensurePage();
		await ensurePage();
		await ensurePage();

		expect(page.evaluate).toHaveBeenCalledTimes(1);
	});

	it('does not act on a page until its opt-out pass has resolved', async () => {
		const { page, release } = pageWithPendingStamp();
		// Armed, so the only thing that can hold typing back is the per-page latch.
		const { adapter } = adapterWithTrackedPage(page, { armed: true });
		const locator = page.fakeLocator;

		const typing = adapter.type('p1', { selector: '#token' }, 'secret');
		// Drain the microtask queue: without the latch, typing would already have happened.
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(locator.pressSequentially).not.toHaveBeenCalled();

		release();
		await typing;

		expect(locator.pressSequentially).toHaveBeenCalledWith('secret', { delay: undefined });
	});

	it('re-stamps per type when the init script was never armed', async () => {
		const page = fakePage();
		const { adapter } = adapterWithTrackedPage(page, { armed: false });

		await adapter.type('p1', { selector: '#token' }, 'secret');

		expect(page.evaluate).toHaveBeenCalledTimes(2);
	});

	it('does not re-stamp per type once armed', async () => {
		const page = fakePage();
		const { adapter } = adapterWithTrackedPage(page, { armed: true });

		await adapter.type('p1', { selector: '#token' }, 'secret');

		expect(page.evaluate).toHaveBeenCalledTimes(1);
	});

	it('still types when stamping the existing document fails', async () => {
		const page = fakePage();
		page.evaluate.mockRejectedValue(new Error('CSP blocked eval'));
		const { adapter } = adapterWithTrackedPage(page);
		const locator = page.fakeLocator;

		await adapter.type('p1', { selector: '#token' }, 'secret');

		expect(locator.pressSequentially).toHaveBeenCalledWith('secret', { delay: undefined });
	});

	it('stamps a child frame once it navigates', async () => {
		const page = fakePage();
		adapterWithTrackedPage(page);
		const frame = { evaluate: vi.fn().mockResolvedValue(undefined) };

		page.emit('framenavigated', frame);

		await vi.waitFor(() => expect(frame.evaluate).toHaveBeenCalledWith(OPT_OUT_SCRIPT));
	});

	it('does not re-stamp the main frame on navigation', () => {
		const page = fakePage();
		adapterWithTrackedPage(page);
		const mainFrame = page.mainFrame() as { evaluate?: unknown };
		Reflect.set(mainFrame, 'evaluate', vi.fn());

		page.emit('framenavigated', mainFrame);

		expect(mainFrame.evaluate).not.toHaveBeenCalled();
	});

	it('gives up waiting on a stamp that never resolves', async () => {
		vi.useFakeTimers();
		try {
			const { page } = pageWithPendingStamp();
			const { adapter } = adapterWithTrackedPage(page, { armed: true });
			const locator = page.fakeLocator;

			const typing = adapter.type('p1', { selector: '#token' }, 'secret');
			await vi.advanceTimersByTimeAsync(10_000);
			await typing;

			expect(locator.pressSequentially).toHaveBeenCalledWith('secret', { delay: undefined });
		} finally {
			vi.useRealTimers();
		}
	});
});
