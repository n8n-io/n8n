// Shared scaffolding for the adapter unit tests: keeps the reach into private
// `pageStates` in one place, so renaming that field breaks one file.

import type { Page } from 'playwright-core';

import { PlaywrightAdapter } from './playwright';
import type { ResolvedConfig } from '../types';

export const ADAPTER_TEST_CONFIG: ResolvedConfig = {
	defaultBrowser: 'chrome',
	browsers: new Map(),
	adapter: 'playwright',
	mode: 'local',
};

/** An adapter whose single page resolves every target to `locator`. */
export function adapterWithLocator<T extends object>(
	pageId: string,
	locator: T,
): PlaywrightAdapter {
	const adapter = new PlaywrightAdapter(ADAPTER_TEST_CONFIG);
	const page = {
		locator: vi.fn().mockReturnValue(locator),
	} as unknown as Page;
	const pageStates = (adapter as unknown as { pageStates: Map<string, { page: Page }> }).pageStates;
	pageStates.set(pageId, { page });
	return adapter;
}
