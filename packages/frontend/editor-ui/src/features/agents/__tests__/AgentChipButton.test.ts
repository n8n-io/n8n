import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentChipButton from '../components/AgentChipButton.vue';

const STUBS = {
	N8nIcon: {
		template: '<span v-bind="$attrs" />',
		props: ['icon', 'size'],
	},
	N8nText: { template: '<span><slot /></span>' },
};

describe('AgentChipButton', () => {
	it('does not render the invalid indicator by default', () => {
		const wrapper = mount(AgentChipButton, {
			slots: { default: 'Search web' },
			global: { stubs: STUBS },
		});

		expect(wrapper.find('[data-testid="agent-chip-invalid-icon"]').exists()).toBe(false);
		expect(
			wrapper
				.find('button')
				.classes()
				.some((c) => c.includes('invalid')),
		).toBe(false);
	});

	it('renders an invalid state with a warning icon when invalid is true', () => {
		const wrapper = mount(AgentChipButton, {
			props: { invalid: true },
			slots: { default: 'Search web' },
			global: { stubs: STUBS },
		});

		expect(wrapper.find('[data-testid="agent-chip-invalid-icon"]').exists()).toBe(true);
		expect(
			wrapper
				.find('button')
				.classes()
				.some((c) => c.includes('invalid')),
		).toBe(true);
	});

	it('still emits click when invalid but not disabled', async () => {
		const wrapper = mount(AgentChipButton, {
			props: { invalid: true },
			slots: { default: 'Search web' },
			global: { stubs: STUBS },
		});

		await wrapper.find('button').trigger('click');

		expect(wrapper.emitted('click')).toBeTruthy();
	});
});
