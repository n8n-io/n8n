import type { BrowserContext, Cookie, Frame, Page } from 'playwright-core';

import { PlaywrightAdapter } from './playwright';
import { ADAPTER_TEST_CONFIG, setTestContext } from './test-helpers';
import { configureLogger } from '../logger';

configureLogger({ level: 'silent' });

function cookie(domain: string): Cookie {
	return {
		name: 'sid',
		value: 'v',
		domain,
		path: '/',
		expires: -1,
		httpOnly: false,
		secure: true,
		sameSite: 'Lax',
	};
}

function fakePage(url: string): Page {
	return { url: () => url, on: vi.fn() } as unknown as Page;
}

function setup({
	cookies = [],
	urls = [],
	trackVisitedOrigins,
}: {
	cookies?: string[];
	urls?: string[];
	trackVisitedOrigins?: boolean;
}) {
	const adapter = new PlaywrightAdapter(ADAPTER_TEST_CONFIG, { trackVisitedOrigins });
	const session = {
		send: vi.fn().mockResolvedValue({}),
		detach: vi.fn().mockResolvedValue(undefined),
	};
	const pages = urls.map(fakePage);
	const context = {
		cookies: vi.fn().mockResolvedValue(cookies.map(cookie)),
		clearCookies: vi.fn().mockResolvedValue(undefined),
		pages: vi.fn().mockReturnValue(pages),
		newCDPSession: vi.fn().mockResolvedValue(session),
	} satisfies Partial<BrowserContext>;
	setTestContext(adapter, context);
	return { adapter, session, context, pages };
}

/** A page that reports frame navigations to the handler that the adapter registers. */
function navigablePage(url: string) {
	let onNavigated: ((frame: Frame) => void) | undefined;
	const page = {
		url: () => url,
		on: vi.fn((event: string, handler: (frame: Frame) => void) => {
			if (event === 'framenavigated') onNavigated = handler;
		}),
	};
	const navigate = (frameUrl: string) => onNavigated?.({ url: () => frameUrl } as unknown as Frame);
	return { page: page as unknown as Page, navigate };
}

/** Starts recording visited origins, as connecting to the browser does. */
function trackVisitedOriginsIn(adapter: PlaywrightAdapter, context: Partial<BrowserContext>) {
	(
		adapter as unknown as { trackVisitedOriginsIn(context: Partial<BrowserContext>): void }
	).trackVisitedOriginsIn(context);
}

/** The origins cleared with `Storage.clearDataForOrigin`, after checking every call is one. */
function clearedOrigins(session: { send: ReturnType<typeof vi.fn> }): string[] {
	const calls = session.send.mock.calls as Array<
		[string, { origin: string; storageTypes: string }]
	>;
	expect(calls.every(([method]) => method === 'Storage.clearDataForOrigin')).toBe(true);
	expect(calls.every(([, params]) => params.storageTypes === 'all')).toBe(true);
	return calls.map(([, params]) => params.origin);
}

describe('PlaywrightAdapter.clearSiteDataExcept', () => {
	it('clears the cookies of other sites only', async () => {
		const { adapter, context } = setup({
			cookies: ['example.com', '.example.com', 'app.example.com', 'tracker.net', '.ads.io'],
			urls: ['https://example.com/'],
		});

		await adapter.clearSiteDataExcept('example.com');

		expect(context.clearCookies).toHaveBeenCalledTimes(2);
		expect(context.clearCookies).toHaveBeenCalledWith({ domain: 'tracker.net' });
		expect(context.clearCookies).toHaveBeenCalledWith({ domain: '.ads.io' });
	});

	it('clears each cookie domain once', async () => {
		const { adapter, context } = setup({ cookies: ['tracker.net', 'tracker.net'] });

		await adapter.clearSiteDataExcept('example.com');

		expect(context.clearCookies).toHaveBeenCalledTimes(1);
	});

	it('treats a site that only ends with the domain as another site', async () => {
		const { adapter, context } = setup({ cookies: ['notexample.com'] });

		await adapter.clearSiteDataExcept('example.com');

		expect(context.clearCookies).toHaveBeenCalledWith({ domain: 'notexample.com' });
	});

	it('clears the storage of other cookie sites and other open pages over CDP', async () => {
		const { adapter, session, context, pages } = setup({
			cookies: ['example.com', '.ads.io'],
			urls: ['https://app.example.com/home', 'https://shop.test:8443/cart', 'about:blank'],
		});

		await adapter.clearSiteDataExcept('example.com');

		expect(context.newCDPSession).toHaveBeenCalledWith(pages[0]);
		expect(clearedOrigins(session).sort()).toEqual([
			'http://ads.io',
			'https://ads.io',
			'https://shop.test:8443',
		]);
		expect(session.detach).toHaveBeenCalled();
	});

	it('opens no CDP session when only the kept site has data', async () => {
		const { adapter, context } = setup({
			cookies: ['.example.com', 'app.example.com'],
			urls: ['https://app.example.com/', 'about:blank'],
		});

		await adapter.clearSiteDataExcept('example.com');

		expect(context.clearCookies).not.toHaveBeenCalled();
		expect(context.newCDPSession).not.toHaveBeenCalled();
	});

	it('clears cookies but opens no CDP session without an open page', async () => {
		const { adapter, context } = setup({ cookies: ['tracker.net'] });

		await adapter.clearSiteDataExcept('example.com');

		expect(context.clearCookies).toHaveBeenCalledWith({ domain: 'tracker.net' });
		expect(context.newCDPSession).not.toHaveBeenCalled();
	});

	it('skips a page whose URL cannot be read', async () => {
		const { adapter, session } = setup({
			urls: ['https://example.com/', 'not a url', 'https://other.org/'],
		});

		await adapter.clearSiteDataExcept('example.com');

		expect(clearedOrigins(session)).toEqual(['https://other.org']);
	});

	it('detaches the CDP session when clearing fails', async () => {
		const { adapter, session } = setup({ urls: ['https://other.org/'] });
		session.send.mockRejectedValue(new Error('CDP failed'));

		await expect(adapter.clearSiteDataExcept('example.com')).rejects.toThrow(
			'Failed to clear the site data of 1 / 1 sites',
		);
		expect(session.detach).toHaveBeenCalled();
	});

	it('clears the other sites when one fails, then throws', async () => {
		const { adapter, session } = setup({
			urls: ['https://first.org/', 'https://second.org/', 'https://third.org/'],
		});
		session.send.mockImplementation(async (_method: string, { origin }: { origin: string }) => {
			if (origin === 'https://second.org') throw new Error('CDP failed');
			return {};
		});

		await expect(adapter.clearSiteDataExcept('example.com')).rejects.toThrow(
			'Failed to clear the site data of 1 / 3 sites',
		);
		expect(clearedOrigins(session)).toEqual([
			'https://first.org',
			'https://second.org',
			'https://third.org',
		]);
	});

	describe('visited origins', () => {
		function setupVisits() {
			const context = setup({ urls: ['https://example.com/'], trackVisitedOrigins: true });
			const tab = navigablePage('https://first.org/');
			context.context.pages.mockReturnValue([tab.page, ...context.pages]);
			const contextOn = vi.fn();
			Object.assign(context.context, { on: contextOn });
			trackVisitedOriginsIn(context.adapter, context.context);
			// The tab closes before the cleanup, so only the recorded origins name its sites.
			context.context.pages.mockReturnValue(context.pages);
			return { ...context, tab, contextOn };
		}

		it('clears the storage of visited sites that set no cookies and have no open page', async () => {
			const { adapter, session, tab } = setupVisits();
			tab.navigate('https://second.org/page');
			tab.navigate('https://widget.third.org/frame');
			tab.navigate('https://app.example.com/home');

			await adapter.clearSiteDataExcept('example.com');

			expect(clearedOrigins(session).sort()).toEqual([
				'https://first.org',
				'https://second.org',
				'https://widget.third.org',
			]);
		});

		it('records the pages that open later', async () => {
			const { adapter, session, contextOn } = setupVisits();
			const [event, onPage] = contextOn.mock.calls[0] as [string, (page: Page) => void];
			expect(event).toBe('page');

			const popup = navigablePage('https://popup.org/');
			onPage(popup.page);
			popup.navigate('https://after.org/');

			await adapter.clearSiteDataExcept('example.com');

			expect(clearedOrigins(session).sort()).toEqual([
				'https://after.org',
				'https://first.org',
				'https://popup.org',
			]);
		});

		it('records only http and https origins', async () => {
			const { adapter, session, tab } = setupVisits();
			tab.navigate('about:blank');
			tab.navigate('chrome-extension://abc/page.html');
			tab.navigate('data:text/html,hi');
			tab.navigate('not a url');

			await adapter.clearSiteDataExcept('example.com');

			expect(clearedOrigins(session)).toEqual(['https://first.org']);
		});

		it('is off by default', () => {
			const adapter = new PlaywrightAdapter(ADAPTER_TEST_CONFIG);

			expect((adapter as unknown as { trackVisitedOrigins: boolean }).trackVisitedOrigins).toBe(
				false,
			);
		});

		it('stops recording at 1000 origins', async () => {
			const { adapter, session, tab } = setupVisits();
			for (let index = 0; index < 1100; index++) tab.navigate(`https://site-${index}.org/`);

			await adapter.clearSiteDataExcept('example.com');

			// The open page on example.com takes one of the 1000, and it is kept.
			expect(clearedOrigins(session)).toHaveLength(999);
		});
	});

	it('throws without a browser context', async () => {
		const adapter = new PlaywrightAdapter(ADAPTER_TEST_CONFIG);

		await expect(adapter.clearSiteDataExcept('example.com')).rejects.toThrow(
			'Browser context not initialized',
		);
	});
});
