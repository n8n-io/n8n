import { N8nBadge } from '@n8n/design-system';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import AiGatewayBalanceIndicator from './AiGatewayBalanceIndicator.vue';
import AiGatewayBalancePill from './AiGatewayBalancePill.vue';
import AiGatewayCredentialOption from './AiGatewayCredentialOption.vue';

const PILL = { text: '$12.00 remaining', type: 'default' as const };

describe('AiGatewayBalancePill', () => {
	it.each([
		['default', 'success'],
		['danger', 'danger'],
		['info', 'info'],
	] as const)('renders a %s pill as the %s badge variant', (type, variant) => {
		const wrapper = mount(AiGatewayBalancePill, { props: { pill: { text: 'x', type } } });
		expect(wrapper.findComponent(N8nBadge).props('variant')).toBe(variant);
	});
});

describe('AiGatewayCredentialOption', () => {
	it('shows the label, the pill and a checkmark when selected', () => {
		const wrapper = mount(AiGatewayCredentialOption, {
			props: { label: 'Gateway credits', pill: PILL, selected: true },
		});
		expect(wrapper.text()).toContain('Gateway credits');
		expect(wrapper.text()).toContain(PILL.text);
		expect(wrapper.find('[data-icon="check"]').exists()).toBe(true);
	});

	it('stacks the subtitle under the label and hides the checkmark when not selected', () => {
		const wrapper = mount(AiGatewayCredentialOption, {
			props: { label: 'Use Gateway credits', subtitle: 'Ready to run' },
		});
		expect(wrapper.text()).toContain('Ready to run');
		expect(wrapper.findComponent(AiGatewayBalancePill).exists()).toBe(false);
		expect(wrapper.find('[data-icon="check"]').exists()).toBe(false);
	});
});

describe('AiGatewayBalanceIndicator', () => {
	it('renders the pill after a hidden copy of the label', () => {
		const wrapper = mount(AiGatewayBalanceIndicator, {
			props: { label: 'Gateway credits', pill: PILL },
		});
		const indicator = wrapper.find('[data-test-id="credential-balance-indicator"]');
		expect(indicator.find('[aria-hidden="true"]').text()).toBe('Gateway credits');
		expect(indicator.text()).toContain(PILL.text);
	});

	it('applies the muted style only when muted', async () => {
		const wrapper = mount(AiGatewayBalanceIndicator, {
			props: { label: 'Gateway credits', pill: PILL },
		});
		const isMuted = () => wrapper.classes().some((c) => c.includes('muted'));
		expect(isMuted()).toBe(false);

		await wrapper.setProps({ muted: true });
		expect(isMuted()).toBe(true);
	});
});
