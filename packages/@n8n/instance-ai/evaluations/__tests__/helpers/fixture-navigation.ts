import type { Page } from 'playwright-core';

export async function gotoFixturePage(page: Pick<Page, 'goto'>, url: string): Promise<void> {
	try {
		await page.goto(url);
	} catch (error: unknown) {
		// Chromium cancels pending connections when host IP addresses change, even on loopback.
		// Retry this browser error once. Fixture and other navigation errors must still fail.
		if (!(error instanceof Error) || !error.message.includes('net::ERR_NETWORK_CHANGED')) {
			throw error;
		}
		await page.goto(url);
	}
}
