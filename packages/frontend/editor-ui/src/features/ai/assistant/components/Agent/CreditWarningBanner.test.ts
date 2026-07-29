import { describe, it, expect, vi, beforeEach } from 'vitest';
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

let mockUserIsTrialing = false;
vi.mock('@/app/stores/cloudPlan.store', () => ({
	useCloudPlanStore: vi.fn(() => ({
		get userIsTrialing() {
			return mockUserIsTrialing;
		},
	})),
}));

describe('CreditWarningBanner', () => {
	beforeEach(() => {
		mockUserIsTrialing = false;
	});

	it('rounds remaining and total credits to two decimal places', () => {
		const wrapper = mount(CreditWarningBanner, {
			props: { creditsRemaining: 2.468, creditsQuota: 100.04 },
		});

		const text = wrapper.get('[data-test-id="credit-warning-banner"]').text();
		expect(text).toContain('"remaining":"2.47"');
		expect(text).toContain('"total":"100.04"');
	});

	it('shows the monthly credits text when the user is not trialing', () => {
		const wrapper = mount(CreditWarningBanner, {
			props: { creditsRemaining: 0, creditsQuota: 800 },
		});

		const text = wrapper.get('[data-test-id="credit-warning-banner"]').text();
		expect(text).toContain('aiAssistant.builder.creditBanner.text');
	});

	it('shows the free trial credits text when the user is trialing', () => {
		mockUserIsTrialing = true;
		const wrapper = mount(CreditWarningBanner, {
			props: { creditsRemaining: 0, creditsQuota: 800 },
		});

		const text = wrapper.get('[data-test-id="credit-warning-banner"]').text();
		expect(text).toContain('aiAssistant.builder.creditBanner.trialText');
	});
});
