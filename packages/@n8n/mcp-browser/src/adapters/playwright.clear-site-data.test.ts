import type { BrowserContext } from 'playwright-core';

import { PlaywrightAdapter } from './playwright';
import { ADAPTER_TEST_CONFIG } from './test-helpers';
import { configureLogger } from '../logger';

configureLogger({ level: 'silent' });

/** Keeps what the browser sends to, and stores for, the Ledgerly host. */
const keepLedgerly = {
	cookieDomain: (domain: string) => domain === 'example.com' || domain === 'ledgerly.example.com',
	origin: (host: string) => host === 'ledgerly.example.com',
};

function adapterWithContext(cookieDomains: string[], frameUrls: string[]) {
	const cdp = { send: vi.fn().mockResolvedValue({}), detach: vi.fn().mockResolvedValue(undefined) };
	const page = { frames: () => frameUrls.map((url) => ({ url: () => url })) };
	const context = {
		cookies: vi.fn().mockResolvedValue(cookieDomains.map((domain) => ({ domain }))),
		clearCookies: vi.fn().mockResolvedValue(undefined),
		pages: () => [page],
		newCDPSession: vi.fn().mockResolvedValue(cdp),
	};
	const adapter = new PlaywrightAdapter(ADAPTER_TEST_CONFIG);
	(adapter as unknown as { context: BrowserContext }).context =
		context as unknown as BrowserContext;
	return { adapter, context, cdp };
}

describe('PlaywrightAdapter.clearSiteDataExcept', () => {
	it('clears cookies and storage of every other site and keeps the bound one', async () => {
		const { adapter, context, cdp } = adapterWithContext(
			['.example.com', 'ledgerly.example.com', 'n8n.example.com', '.google.com'],
			['https://ledgerly.example.com/settings', 'https://cdn.example.com/x'],
		);

		const cleared = await adapter.clearSiteDataExcept(keepLedgerly, [
			'https://news.ycombinator.com/item?id=1',
		]);

		// Another app on the same domain is another site.
		expect(cleared.cookieDomains).toEqual(['n8n.example.com', '.google.com']);
		expect(context.clearCookies).toHaveBeenCalledTimes(2);
		expect(context.clearCookies).toHaveBeenCalledWith({ domain: '.google.com' });
		expect(cleared.origins.sort()).toEqual([
			'https://cdn.example.com',
			'https://google.com',
			'https://n8n.example.com',
			'https://news.ycombinator.com',
		]);
		expect(cdp.send).toHaveBeenCalledTimes(4);
		expect(cdp.send).toHaveBeenCalledWith('Storage.clearDataForOrigin', {
			origin: 'https://news.ycombinator.com',
			storageTypes: 'all',
		});
		expect(cdp.detach).toHaveBeenCalled();
	});

	it('does nothing when only the bound site was visited', async () => {
		const { adapter, context } = adapterWithContext(
			['.example.com'],
			['https://ledgerly.example.com/', 'about:blank'],
		);

		const cleared = await adapter.clearSiteDataExcept(keepLedgerly);

		expect(cleared).toEqual({ cookieDomains: [], origins: [] });
		expect(context.clearCookies).not.toHaveBeenCalled();
		expect(context.newCDPSession).not.toHaveBeenCalled();
	});
});
