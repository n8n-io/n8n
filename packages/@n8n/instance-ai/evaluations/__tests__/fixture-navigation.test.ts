import type { Page } from 'playwright-core';
import { describe, expect, it, vi } from 'vitest';

import { gotoFixturePage } from './helpers/fixture-navigation';

describe('gotoFixturePage', () => {
	const url = 'https://console.example.com/keys';
	const networkChanged = () => new Error(`page.goto: net::ERR_NETWORK_CHANGED at ${url}`);

	it('repeats the navigation once after a browser network change', async () => {
		const goto = vi
			.fn<Page['goto']>()
			.mockRejectedValueOnce(networkChanged())
			.mockResolvedValue(null);

		await gotoFixturePage({ goto }, url);

		expect(goto.mock.calls).toEqual([[url], [url]]);
	});

	it.each([
		'net::ERR_CONNECTION_REFUSED',
		'net::ERR_NAME_NOT_RESOLVED',
		'net::ERR_CERT_AUTHORITY_INVALID',
		'Timeout 30000ms exceeded',
	])('fails immediately for %s', async (message) => {
		const error = new Error(`page.goto: ${message} at ${url}`);
		const goto = vi.fn<Page['goto']>().mockRejectedValue(error);

		await expect(gotoFixturePage({ goto }, url)).rejects.toBe(error);

		expect(goto).toHaveBeenCalledExactlyOnceWith(url);
	});

	it('fails if the repeated navigation also fails', async () => {
		const error = networkChanged();
		const goto = vi.fn<Page['goto']>().mockRejectedValue(error);

		await expect(gotoFixturePage({ goto }, url)).rejects.toBe(error);

		expect(goto.mock.calls).toEqual([[url], [url]]);
	});
});
