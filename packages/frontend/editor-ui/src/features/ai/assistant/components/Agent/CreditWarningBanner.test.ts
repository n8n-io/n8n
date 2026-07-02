import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CreditWarningBanner from './CreditWarningBanner.vue';

vi.mock('@n8n/i18n', () => {
	const baseText = (key: string, options?: { interpolate?: Record<string, string> }) => {
		if (options?.interpolate) {
			return `${key} [${JSON.stringify(options.interpolate)}]`;
		}
		return key;
	};
	return {
		useI18n: () => ({ baseText }),
		i18n: { baseText },
	};
});

describe('CreditWarningBanner', () => {
	it('rounds remaining and total credits to two decimal places', () => {
		const wrapper = mount(CreditWarningBanner, {
			props: { creditsRemaining: 2.468, creditsQuota: 100.04 },
		});

		const text = wrapper.get('[data-test-id="credit-warning-banner"]').text();
		expect(text).toContain('"remaining":"2.47"');
		expect(text).toContain('"total":"100.04"');
	});
});
