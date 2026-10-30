// Shared scaffolding for the adapter unit tests: keeps the reach into private
// `pageStates` in one place, so renaming that field breaks one file.

import type { BrowserContext, Page } from 'playwright-core';

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

/** Tracks `page` under `pageId`, as the adapter does when the browser opens a page. */
export function trackTestPage(adapter: PlaywrightAdapter, page: Page, pageId: string): void {
	(adapter as unknown as { trackPage(page: Page, id: string): unknown }).trackPage(page, pageId);
}

/** Sets the browser context the adapter opens CDP sessions in. */
export function setTestContext(adapter: PlaywrightAdapter, context: Partial<BrowserContext>): void {
	(adapter as unknown as { context: Partial<BrowserContext> }).context = context;
}
