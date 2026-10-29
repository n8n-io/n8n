import { beforeEach, describe, expect, it } from 'vitest';

import {
	isBrowserUseSupportedForBrowser,
	isBrowserUseSupportedOnDevice,
} from '../browserUseSupport';

const CHROME_WINDOWS =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';

const SAFARI_MACOS =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15';

function setUserAgent(userAgent: string) {
	Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
}

function setMaxTouchPoints(maxTouchPoints: number) {
	Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true });
}

describe('browserUseSupport', () => {
	beforeEach(() => {
		setUserAgent(CHROME_WINDOWS);
		setMaxTouchPoints(0);
	});

	describe('device support', () => {
		it('returns false for an iPad in desktop mode', () => {
			setUserAgent(SAFARI_MACOS);
			setMaxTouchPoints(5);

			expect(isBrowserUseSupportedOnDevice()).toBe(false);
		});

		it.each([
			{ browser: 'Chrome on Windows', userAgent: CHROME_WINDOWS, enabled: true },
			{
				browser: 'Chrome on macOS',
				userAgent:
					'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
				enabled: true,
			},
			{
				browser: 'Chrome on Linux',
				userAgent:
					'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
				enabled: true,
			},
			{
				browser: 'Chrome on Chrome OS',
				userAgent:
					'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
				enabled: true,
			},
			{
				browser: 'Edge on Windows',
				userAgent:
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0',
				enabled: true,
			},
			{
				browser: 'Brave on macOS',
				userAgent:
					'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Brave/150.0.0.0',
				enabled: true,
			},
			{
				browser: 'Safari on macOS',
				userAgent:
					'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15',
				enabled: true,
			},
			{
				browser: 'Firefox on Windows',
				userAgent:
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
				enabled: true,
			},
			{
				browser: 'Safari on iOS',
				userAgent:
					'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1',
				enabled: false,
			},
			{
				browser: 'Chrome on Android',
				userAgent:
					'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',
				enabled: false,
			},
			{
				browser: 'Chrome on Android in desktop mode',
				userAgent:
					'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
				enabled: false,
			},
			{
				browser: 'Samsung Internet on Android',
				userAgent:
					'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/30.0 Chrome/143.0.0.0 Mobile Safari/537.36',
				enabled: false,
			},
		])('returns $enabled for $browser', ({ userAgent, enabled }) => {
			setUserAgent(userAgent);

			expect(isBrowserUseSupportedOnDevice()).toBe(enabled);
		});
	});

	describe('isBrowserUseSupportedForBrowser', () => {
		it.each([
			{ browser: 'Chrome', userAgent: CHROME_WINDOWS, supported: true },
			{
				browser: 'Edge',
				userAgent:
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0',
				supported: true,
			},
			{
				browser: 'Brave',
				userAgent:
					'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Brave/150.0.0.0',
				supported: true,
			},
			{
				browser: 'Safari',
				userAgent:
					'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15',
				supported: false,
			},
			{
				browser: 'Firefox',
				userAgent:
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
				supported: false,
			},
		])('returns $supported for $browser', ({ userAgent, supported }) => {
			setUserAgent(userAgent);

			expect(isBrowserUseSupportedForBrowser()).toBe(supported);
		});
	});
});
