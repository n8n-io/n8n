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
	it('renders the invalid indicator only when invalid is true', () => {
		const defaultWrapper = mount(AgentChipButton, {
			slots: { default: 'Search web' },
			global: { stubs: STUBS },
		});
		expect(defaultWrapper.find('[data-testid="agent-chip-invalid-icon"]').exists()).toBe(false);
		expect(
			defaultWrapper
				.find('button')
				.classes()
				.some((c) => c.includes('invalid')),
		).toBe(false);

		const invalidWrapper = mount(AgentChipButton, {
			props: { invalid: true },
			slots: { default: 'Search web' },
			global: { stubs: STUBS },
		});
		expect(invalidWrapper.find('[data-testid="agent-chip-invalid-icon"]').exists()).toBe(true);
		expect(
			invalidWrapper
				.find('button')
				.classes()
				.some((c) => c.includes('invalid')),
		).toBe(true);
	});
});
