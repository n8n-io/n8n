import type { Page } from 'playwright-core';
import { describe, expect, it, vi } from 'vitest';

import { gotoFixturePage } from './helpers/fixture-navigation';

describe('gotoFixturePage', () => {
	const url = 'https://console.example.com/keys';
	const networkChanged = () => new Error(`page.goto: net::ERR_NETWORK_CHANGED at ${url}`);
	const waitForURL = vi.fn<Page['waitForURL']>().mockResolvedValue(undefined);

	it('repeats the navigation once after a browser network change', async () => {
		const goto = vi
			.fn<Page['goto']>()
			.mockRejectedValueOnce(networkChanged())
			.mockResolvedValue(null);

		await gotoFixturePage({ goto, waitForURL }, url);

		expect(goto.mock.calls).toEqual([[url], [url]]);
	});

	it('waits for the pending error document before navigating again', async () => {
		let commitErrorDocument!: () => void;
		let errorDocumentPending = true;
		const waitForURL = vi.fn<Page['waitForURL']>().mockImplementation(async () => {
			await new Promise<void>((resolve) => {
				commitErrorDocument = resolve;
			});
			errorDocumentPending = false;
		});
		const goto = vi
			.fn<Page['goto']>()
			.mockRejectedValueOnce(networkChanged())
			.mockImplementation(async () => {
				if (errorDocumentPending) throw new Error('Navigation interrupted by chrome-error');
				return null;
			});

		const navigation = gotoFixturePage({ goto, waitForURL }, url);
		await vi.waitFor(() =>
			expect(waitForURL).toHaveBeenCalledWith('chrome-error://chromewebdata/', {
				waitUntil: 'commit',
				timeout: 2_000,
			}),
		);
		expect(goto).toHaveBeenCalledTimes(1);
		commitErrorDocument();
		await navigation;
		expect(goto).toHaveBeenCalledTimes(2);
	});

	it('keeps the original error when no error document commits within the deadline', async () => {
		const error = networkChanged();
		const goto = vi.fn<Page['goto']>().mockRejectedValue(error);
		const waitForURL = vi.fn<Page['waitForURL']>().mockRejectedValue(new Error('Timeout'));

		await expect(gotoFixturePage({ goto, waitForURL }, url)).rejects.toBe(error);
		expect(waitForURL).toHaveBeenCalledWith('chrome-error://chromewebdata/', {
			waitUntil: 'commit',
			timeout: 2_000,
		});
		expect(goto).toHaveBeenCalledTimes(1);
	});

	it.each([
		'net::ERR_CONNECTION_REFUSED',
		'net::ERR_NAME_NOT_RESOLVED',
		'net::ERR_CERT_AUTHORITY_INVALID',
		'Timeout 30000ms exceeded',
	])('fails immediately for %s', async (message) => {
		const error = new Error(`page.goto: ${message} at ${url}`);
		const goto = vi.fn<Page['goto']>().mockRejectedValue(error);

		await expect(gotoFixturePage({ goto, waitForURL }, url)).rejects.toBe(error);

		expect(goto).toHaveBeenCalledExactlyOnceWith(url);
	});

	it('fails if the repeated navigation also fails', async () => {
		const error = networkChanged();
		const goto = vi.fn<Page['goto']>().mockRejectedValue(error);

		await expect(gotoFixturePage({ goto, waitForURL }, url)).rejects.toBe(error);

		expect(goto.mock.calls).toEqual([[url], [url]]);
	});
});
