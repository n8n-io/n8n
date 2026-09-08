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
vi.mock('@n8n/stores/cloudPlan.store', () => ({
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

	// Most call sites sit above a detached, fully rounded chat input, so the
	// self-contained card has to be what you get without opting in.
	describe('variants', () => {
		it('renders a self-contained card by default', () => {
			const wrapper = mount(CreditWarningBanner, {
				props: { creditsRemaining: 0, creditsQuota: 800 },
			});

			const classes = wrapper.get('[data-test-id="credit-warning-banner"]').classes();
			expect(classes).toContain('standalone');
			expect(classes).not.toContain('attached');
		});

		it('fuses onto the input below when asked to attach', () => {
			const wrapper = mount(CreditWarningBanner, {
				props: { creditsRemaining: 0, creditsQuota: 800, variant: 'attached' },
			});

			const classes = wrapper.get('[data-test-id="credit-warning-banner"]').classes();
			expect(classes).toContain('attached');
			expect(classes).not.toContain('standalone');
		});
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

	// The activation-capped trial cohort is never shown a balance,
	// so the banner has to warn them without quoting one.
	describe('when amounts are hidden', () => {
		it('shows the limit-reached text and no figures', () => {
			mockUserIsTrialing = true;
			const wrapper = mount(CreditWarningBanner, {
				props: { creditsRemaining: 5, creditsQuota: 800, amountsHidden: true },
			});

			const text = wrapper.get('[data-test-id="credit-warning-banner"]').text();
			expect(text).toContain('aiAssistant.builder.creditBanner.limitReachedText');
			expect(text).not.toContain('remaining');
			expect(text).not.toContain('800');
		});

		it('labels the action as an upgrade rather than getting more', () => {
			const wrapper = mount(CreditWarningBanner, {
				props: { creditsRemaining: 0, creditsQuota: 800, amountsHidden: true },
			});

			const cta = wrapper.get('[data-test-id="credit-banner-get-more"]').text();
			expect(cta).toContain('aiAssistant.builder.creditBanner.upgrade');
		});

		// The tooltip promises credits renew next month. A locked trial quota does not.
		it('drops the renewal tooltip', () => {
			const withAmounts = mount(CreditWarningBanner, {
				props: { creditsRemaining: 0, creditsQuota: 800 },
			});
			expect(withAmounts.find('[data-test-id="credit-banner-renewal-info"]').exists()).toBe(true);

			const hidden = mount(CreditWarningBanner, {
				props: { creditsRemaining: 0, creditsQuota: 800, amountsHidden: true },
			});
			expect(hidden.find('[data-test-id="credit-banner-renewal-info"]').exists()).toBe(false);
		});
	});
});
