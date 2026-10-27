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

let mockIsCloudUbbActive = false;
vi.mock('@n8n/stores/composables/useCloudUbbActive', () => ({
	useCloudUbbActive: vi.fn(() => ({
		get isActive() {
			return { value: mockIsCloudUbbActive };
		},
	})),
}));

describe('CreditWarningBanner', () => {
	beforeEach(() => {
		mockUserIsTrialing = false;
		mockIsCloudUbbActive = false;
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

	// Under Cloud UBB the wallet's `creditsQuota` shrinks as top-ups deplete, so the
	// legacy fraction would show a moving denominator and mislabel top-ups as monthly.
	it('shows the UBB text (no fraction) for non-trialing users when Cloud UBB is active', () => {
		mockIsCloudUbbActive = true;
		const wrapper = mount(CreditWarningBanner, {
			props: { creditsRemaining: 169, creditsQuota: 1769 },
		});

		const text = wrapper.get('[data-test-id="credit-warning-banner"]').text();
		expect(text).toContain('aiAssistant.builder.creditBanner.textUbb');
		expect(text).toContain('"remaining":"169"');
		expect(text).not.toContain('"total"');
	});

	it('keeps the trial fraction even when Cloud UBB is active (trials hold no top-ups)', () => {
		mockUserIsTrialing = true;
		mockIsCloudUbbActive = true;
		const wrapper = mount(CreditWarningBanner, {
			props: { creditsRemaining: 100, creditsQuota: 500 },
		});

		const text = wrapper.get('[data-test-id="credit-warning-banner"]').text();
		expect(text).toContain('aiAssistant.builder.creditBanner.trialText');
		expect(text).toContain('"remaining":"100"');
		expect(text).toContain('"total":"500"');
	});

	it('uses an override message and hides dismiss when the state is not dismissible', () => {
		const wrapper = mount(CreditWarningBanner, {
			props: {
				creditsRemaining: 0,
				creditsQuota: 800,
				message: "You've run out of AI credits",
				dismissible: false,
			},
		});

		const text = wrapper.get('[data-test-id="credit-warning-banner"]').text();
		expect(text).toContain("You've run out of AI credits");
		expect(text).not.toContain('remaining');
		expect(wrapper.find('[data-test-id="credit-banner-dismiss"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="credit-banner-renewal-info"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="credit-banner-get-more"]').exists()).toBe(true);
	});
});
