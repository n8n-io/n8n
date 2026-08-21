import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	EXPERIMENTS_TO_TRACK,
	INSTANCE_AI_BROWSER_USE_EXPERIMENT,
} from '@/app/constants/experiments';

import {
	isBrowserUseSupportedForBrowser,
	useInstanceAiBrowserUseExperiment,
} from './useInstanceAiBrowserUseExperiment';

const getVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

const CHROME_WINDOWS =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';

function setUserAgent(userAgent: string) {
	Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
}

describe('useInstanceAiBrowserUseExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
		setUserAgent(CHROME_WINDOWS);
	});

	it.each([
		{ variant: INSTANCE_AI_BROWSER_USE_EXPERIMENT.variant, enabled: true },
		{ variant: INSTANCE_AI_BROWSER_USE_EXPERIMENT.control, enabled: false },
		{ variant: undefined, enabled: false },
	])('returns $enabled when PostHog variant is $variant', ({ variant, enabled }) => {
		getVariant.mockReturnValue(variant);

		const { isFeatureEnabled } = useInstanceAiBrowserUseExperiment();

		expect(isFeatureEnabled.value).toBe(enabled);
		expect(getVariant).toHaveBeenCalledWith(INSTANCE_AI_BROWSER_USE_EXPERIMENT.name);
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(INSTANCE_AI_BROWSER_USE_EXPERIMENT.name);
	});

	describe('device support', () => {
		beforeEach(() => {
			getVariant.mockReturnValue(INSTANCE_AI_BROWSER_USE_EXPERIMENT.variant);
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

			const { isFeatureEnabled } = useInstanceAiBrowserUseExperiment();

			expect(isFeatureEnabled.value).toBe(enabled);
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
