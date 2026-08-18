import type { Page } from 'playwright-core';

import { PlaywrightAdapter } from './playwright';
import { configureLogger } from '../logger';
import type { ResolvedConfig } from '../types';

configureLogger({ level: 'silent' });

const config: ResolvedConfig = {
	defaultBrowser: 'chrome',
	browsers: new Map(),
	adapter: 'playwright',
	mode: 'local',
};

function adapterWithPage(pageId: string) {
	const locator = {
		clear: vi.fn().mockResolvedValue(undefined),
		pressSequentially: vi.fn().mockResolvedValue(undefined),
		press: vi.fn().mockResolvedValue(undefined),
	};
	const page = {
		locator: vi.fn().mockReturnValue(locator),
		evaluate: vi.fn().mockResolvedValue(undefined),
		on: vi.fn(),
		url: vi.fn().mockReturnValue('https://example.com/login'),
	};
	const adapter = new PlaywrightAdapter(config);
	// Through trackPage so the page record is built the way production builds it.
	const internals = adapter as unknown as {
		trackPage: (page: Page, explicitId?: string) => unknown;
	};
	internals.trackPage(page as unknown as Page, pageId);
	return { adapter, page, locator };
}

describe('PlaywrightAdapter.type', () => {
	it('types the text into the resolved element', async () => {
		const { adapter, page, locator } = adapterWithPage('p1');

		await adapter.type('p1', { selector: '#token' }, 'secret', { delay: 20 });

		expect(page.locator).toHaveBeenCalledWith('#token');
		expect(locator.pressSequentially).toHaveBeenCalledWith('secret', { delay: 20 });
		expect(locator.clear).not.toHaveBeenCalled();
		expect(locator.press).not.toHaveBeenCalled();
	});

	it('clears the element before typing when clear is set', async () => {
		const { adapter, locator } = adapterWithPage('p1');

		await adapter.type('p1', { selector: '#token' }, 'secret', { clear: true });

		expect(locator.clear.mock.invocationCallOrder[0]).toBeLessThan(
			locator.pressSequentially.mock.invocationCallOrder[0],
		);
	});

	it('presses Enter after typing when submit is set', async () => {
		const { adapter, locator } = adapterWithPage('p1');

		await adapter.type('p1', { selector: '#token' }, 'secret', { submit: true });

		expect(locator.press).toHaveBeenCalledWith('Enter');
		expect(locator.pressSequentially.mock.invocationCallOrder[0]).toBeLessThan(
			locator.press.mock.invocationCallOrder[0],
		);
	});
});
