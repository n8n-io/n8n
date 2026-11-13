import type { Page } from 'playwright-core';

export async function gotoFixturePage(
	page: Pick<Page, 'goto' | 'waitForURL'>,
	url: string,
): Promise<void> {
	try {
		await page.goto(url);
	} catch (error: unknown) {
		// Chromium cancels pending connections when host IP addresses change, even on loopback.
		// Retry this browser error once. Fixture and other navigation errors must still fail.
		if (!(error instanceof Error) || !error.message.includes('net::ERR_NETWORK_CHANGED')) {
			throw error;
		}
		// The failed navigation can reject before its error document commits.
		// Wait for that document so it cannot interrupt the next navigation.
		try {
			await page.waitForURL('chrome-error://chromewebdata/', {
				waitUntil: 'commit',
				timeout: 2_000,
			});
		} catch {
			// Some cancelled navigations have no error document. Keep the original failure.
			throw error;
		}
		await page.goto(url);
	}
}
