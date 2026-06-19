import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CreditsSettingsDropdown from './CreditsSettingsDropdown.vue';

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

function mountOpen(props: {
	creditsRemaining?: number;
	creditsQuota?: number;
	isLowCredits: boolean;
	creditsUsed?: number;
}) {
	const wrapper = mount(CreditsSettingsDropdown, { props });
	// open the dropdown
	wrapper.find('[data-test-id="credits-dropdown-button"]').trigger('click');
	return wrapper;
}

describe('CreditsSettingsDropdown', () => {
	it('rounds creditsRemaining to one decimal place', async () => {
		const wrapper = mountOpen({
			creditsRemaining: 97.30000001,
			creditsQuota: 100,
			isLowCredits: false,
		});
		await wrapper.vm.$nextTick();

		const text = wrapper.get('[data-test-id="credits-dropdown"]').text();
		expect(text).toContain('"count":"97.3"');
	});

	it('shows the per-thread credits-used line when creditsUsed is provided', async () => {
		const wrapper = mountOpen({
			creditsRemaining: 50,
			creditsQuota: 100,
			isLowCredits: false,
			creditsUsed: 2.46,
		});
		await wrapper.vm.$nextTick();

		const line = wrapper.find('[data-test-id="credits-thread-used"]');
		expect(line.exists()).toBe(true);
		expect(line.text()).toContain('aiAssistant.builder.settings.threadCreditsUsed');
		expect(line.text()).toContain('"count":"2.5"');
	});

	it('omits the per-thread line when creditsUsed is undefined', async () => {
		const wrapper = mountOpen({
			creditsRemaining: 50,
			creditsQuota: 100,
			isLowCredits: false,
		});
		await wrapper.vm.$nextTick();

		expect(wrapper.find('[data-test-id="credits-thread-used"]').exists()).toBe(false);
	});
});
