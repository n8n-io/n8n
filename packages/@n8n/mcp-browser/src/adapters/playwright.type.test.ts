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
	};
	const adapter = new PlaywrightAdapter(config);
	const pageStates = (adapter as unknown as { pageStates: Map<string, { page: Page }> }).pageStates;
	pageStates.set(pageId, { page: page as unknown as Page });
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
		const { adapter, page, locator } = adapterWithPage('p1');

		await adapter.type('p1', { selector: '#token' }, 'secret', { clear: true });

		// clear() focuses the field, so the opt-out has to land before it.
		expect(page.evaluate.mock.invocationCallOrder[0]).toBeLessThan(
			locator.clear.mock.invocationCallOrder[0],
		);
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

	it('applies the extension opt-out before typing', async () => {
		const { adapter, page, locator } = adapterWithPage('p1');

		await adapter.type('p1', { selector: '#token' }, 'secret');

		const script = page.evaluate.mock.calls[0][0] as string;
		expect(script).toContain('data-1p-ignore');
		expect(script).toContain('data-gramm');
		expect(page.evaluate.mock.invocationCallOrder[0]).toBeLessThan(
			locator.pressSequentially.mock.invocationCallOrder[0],
		);
	});

	it('still types when the opt-out evaluate fails', async () => {
		const { adapter, page, locator } = adapterWithPage('p1');
		page.evaluate.mockRejectedValue(new Error('CSP blocked eval'));

		await adapter.type('p1', { selector: '#token' }, 'secret');

		expect(locator.pressSequentially).toHaveBeenCalledWith('secret', { delay: undefined });
	});
});
