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

interface FakeLocator {
	count: ReturnType<typeof vi.fn>;
	inputValue: ReturnType<typeof vi.fn>;
	innerText: ReturnType<typeof vi.fn>;
}

function adapterWithLocator(pageId: string, locator: FakeLocator): PlaywrightAdapter {
	const adapter = new PlaywrightAdapter(config);
	const page = {
		locator: vi.fn().mockReturnValue(locator),
	} as unknown as Page;
	const pageStates = (adapter as unknown as { pageStates: Map<string, { page: Page }> }).pageStates;
	pageStates.set(pageId, { page });
	return adapter;
}

describe('PlaywrightAdapter.getElementValue', () => {
	it('returns the live input value for a ref target', async () => {
		const locator: FakeLocator = {
			count: vi.fn().mockResolvedValue(1),
			inputValue: vi.fn().mockResolvedValue('xoxb-signing-secret'),
			innerText: vi.fn(),
		};
		const adapter = adapterWithLocator('p1', locator);

		const value = await adapter.getElementValue('p1', { ref: 'e5' });

		expect(value).toBe('xoxb-signing-secret');
		expect(locator.inputValue).toHaveBeenCalled();
	});

	it('falls back to inner text when the element is not an input', async () => {
		const locator: FakeLocator = {
			count: vi.fn().mockResolvedValue(1),
			inputValue: vi.fn().mockRejectedValue(new Error('Node is not an <input>')),
			innerText: vi.fn().mockResolvedValue('secret-in-code-block'),
		};
		const adapter = adapterWithLocator('p1', locator);

		const value = await adapter.getElementValue('p1', { ref: 'e5' });

		expect(value).toBe('secret-in-code-block');
		expect(locator.innerText).toHaveBeenCalled();
	});

	it('returns an empty form value without falling back to text', async () => {
		const locator: FakeLocator = {
			count: vi.fn().mockResolvedValue(1),
			inputValue: vi.fn().mockResolvedValue(''),
			innerText: vi.fn().mockResolvedValue('text-content'),
		};
		const adapter = adapterWithLocator('p1', locator);

		const value = await adapter.getElementValue('p1', { ref: 'e5' });

		expect(value).toBe('');
		expect(locator.innerText).not.toHaveBeenCalled();
	});

	it('reads the value for a selector target', async () => {
		const locator: FakeLocator = {
			count: vi.fn().mockResolvedValue(1),
			inputValue: vi.fn().mockResolvedValue('from-selector'),
			innerText: vi.fn(),
		};
		const adapter = adapterWithLocator('p1', locator);

		const value = await adapter.getElementValue('p1', { selector: '#token' });

		expect(value).toBe('from-selector');
	});
});
