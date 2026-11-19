import type { BrowserContext, Cookie, Page } from 'playwright-core';

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
	return { url: () => url } as unknown as Page;
}

function setup({ cookies = [], urls = [] }: { cookies?: string[]; urls?: string[] }) {
	const adapter = new PlaywrightAdapter(ADAPTER_TEST_CONFIG);
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

		await expect(adapter.clearSiteDataExcept('example.com')).rejects.toThrow('CDP failed');
		expect(session.detach).toHaveBeenCalled();
	});

	it('throws without a browser context', async () => {
		const adapter = new PlaywrightAdapter(ADAPTER_TEST_CONFIG);

		await expect(adapter.clearSiteDataExcept('example.com')).rejects.toThrow(
			'Browser context not initialized',
		);
	});
});
