/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { N8nButton, N8nSelect } from '@n8n/design-system';

import N8nChatActionCard from '../components/interactive/N8nChatActionCard.vue';
import type { N8nChatInteractionInput } from '@/features/ai/shared/agentsChat/n8nChatInteraction';

const input: N8nChatInteractionInput = {
	text: 'Pick one',
	card: {
		title: 'Choose',
		components: [
			{ type: 'section', text: 'Options below' },
			{ type: 'button', label: 'Yes', value: 'yes' },
			{
				type: 'select',
				id: 'priority',
				label: 'Priority',
				options: [{ label: 'High', value: 'high' }],
			},
		],
	},
};

function mountCard(props = {}) {
	return mount(N8nChatActionCard, {
		props: { input, ...props },
		global: {
			stubs: {
				ElRadio: {
					template:
						'<label v-bind="$attrs"><input type="radio" :disabled="disabled" @change="$emit(\'update:modelValue\', label)" /><slot/></label>',
					props: ['modelValue', 'label', 'disabled'],
					emits: ['update:modelValue'],
				},
			},
		},
	});
}

describe('N8nChatActionCard', () => {
	it('renders title, section text, and components', () => {
		const wrapper = mountCard();
		expect(wrapper.text()).toContain('Choose');
		expect(wrapper.text()).toContain('Options below');
		expect(wrapper.text()).toContain('Yes');
		// Select options live inside the dropdown popper, not the inline text.
		expect(wrapper.findComponent(N8nSelect).exists()).toBe(true);
	});

	it('renders message text as a fallback summary when the card has no title or message', () => {
		const textFallback: N8nChatInteractionInput = {
			text: 'Account snapshot',
			card: {
				components: [{ type: 'fields', fields: [{ label: 'ARR', value: '$1m' }] }],
			},
		};

		const wrapper = mountCard({ input: textFallback });

		expect(wrapper.text()).toContain('Account snapshot');
		expect(wrapper.text()).toContain('ARR');
		expect(wrapper.text()).toContain('$1m');
	});

	it('button click emits the platform resume shape', async () => {
		const wrapper = mountCard();
		await wrapper.find('[data-testid="n8n-chat-card-button"]').trigger('click');
		expect(wrapper.emitted('submit')?.[0]).toEqual([{ type: 'button', value: 'yes' }]);
	});

	it('select renders a dropdown and emits the select resume shape on change', async () => {
		const wrapper = mountCard();
		const select = wrapper.findComponent(N8nSelect);
		expect(select.exists()).toBe(true);
		select.vm.$emit('update:modelValue', 'high');
		await wrapper.vm.$nextTick();
		expect(wrapper.emitted('submit')?.[0]).toEqual([
			{ type: 'select', id: 'priority', value: 'high' },
		]);
	});

	it('disabled blocks submission and highlights the resolved answer', async () => {
		const wrapper = mountCard({
			disabled: true,
			resolvedValue: { type: 'button', value: 'yes' },
		});
		await wrapper.find('[data-testid="n8n-chat-card-button"]').trigger('click');
		expect(wrapper.emitted('submit')).toBeUndefined();
	});

	it('resolved highlight keeps the chosen button enabled while others disable', () => {
		const twoButtons: N8nChatInteractionInput = {
			card: {
				components: [
					{ type: 'button', label: 'Approve', value: 'approve' },
					{ type: 'button', label: 'Reject', value: 'reject' },
				],
			},
		};
		const resolved = mountCard({
			input: twoButtons,
			disabled: true,
			resolvedValue: { type: 'button', value: 'approve' },
		});
		const buttons = resolved.findAll('[data-testid="n8n-chat-card-button"]');
		expect(buttons[0].attributes('disabled')).toBeUndefined();
		expect(buttons[1].attributes('disabled')).toBeDefined();
	});

	it('renders a section accessory button and submits its value', async () => {
		const sectionWithButton: N8nChatInteractionInput = {
			card: {
				components: [
					{ type: 'section', text: 'Deploy?', button: { label: 'Deploy', value: 'deploy' } },
				],
			},
		};
		const wrapper = mountCard({ input: sectionWithButton });

		// Section text is shown
		expect(wrapper.text()).toContain('Deploy?');
		// Accessory button is rendered
		const btn = wrapper.find('[data-testid="n8n-chat-card-section-button"]');
		expect(btn.exists()).toBe(true);
		expect(btn.text()).toContain('Deploy');

		// Clicking emits the correct resume payload
		await btn.trigger('click');
		expect(wrapper.emitted('submit')?.[0]).toEqual([{ type: 'button', value: 'deploy' }]);
	});

	it('disabled blocks section accessory button submission', async () => {
		const sectionWithButton: N8nChatInteractionInput = {
			card: {
				components: [
					{ type: 'section', text: 'Deploy?', button: { label: 'Deploy', value: 'deploy' } },
				],
			},
		};
		const wrapper = mountCard({
			input: sectionWithButton,
			disabled: true,
		});
		await wrapper.find('[data-testid="n8n-chat-card-section-button"]').trigger('click');
		expect(wrapper.emitted('submit')).toBeUndefined();
	});

	it('top-level button shows label with text fallback (Slack parity)', async () => {
		const textButton: N8nChatInteractionInput = {
			card: { components: [{ type: 'button', text: 'Confirm', value: 'confirm' }] },
		};
		const wrapper = mountCard({ input: textButton });
		expect(wrapper.find('[data-testid="n8n-chat-card-button"]').text()).toContain('Confirm');
		// Submit value is still value, not text
		await wrapper.find('[data-testid="n8n-chat-card-button"]').trigger('click');
		expect(wrapper.emitted('submit')?.[0]).toEqual([{ type: 'button', value: 'confirm' }]);
	});

	it('groups consecutive buttons into a single wrapping row', () => {
		const threeButtons: N8nChatInteractionInput = {
			card: {
				components: [
					{ type: 'section', text: 'Pick:' },
					{ type: 'button', label: 'A', value: 'a' },
					{ type: 'button', label: 'B', value: 'b' },
					{ type: 'button', label: 'C', value: 'c' },
				],
			},
		};
		const wrapper = mountCard({ input: threeButtons });
		const rows = wrapper.findAll('[data-testid="n8n-chat-card-button-row"]');
		expect(rows).toHaveLength(1);
		expect(rows[0].findAll('[data-testid="n8n-chat-card-button"]')).toHaveLength(3);
	});

	it('maps button style to design-system props', () => {
		const styled: N8nChatInteractionInput = {
			card: {
				components: [
					{ type: 'button', label: 'Go', value: 'go', style: 'primary' },
					{ type: 'button', label: 'Delete', value: 'delete', style: 'danger' },
					{ type: 'button', label: 'Later', value: 'later' },
				],
			},
		};
		const wrapper = mountCard({ input: styled });
		const buttons = wrapper.findAllComponents(N8nButton);
		expect(buttons[0].props('variant')).toBe('solid');
		expect(buttons[1].props('variant')).toBe('destructive');
		expect(buttons[2].props('variant')).toBe('outline');
	});

	it('renders radio_select options as radio buttons and submits on change', async () => {
		const radio: N8nChatInteractionInput = {
			card: {
				components: [
					{
						type: 'radio_select',
						id: 'next_step',
						label: 'Next step',
						options: [
							{ label: 'Call', value: 'call' },
							{ label: 'Email', value: 'email' },
						],
					},
				],
			},
		};
		const wrapper = mountCard({ input: radio });
		const radios = wrapper.findAll('[data-testid="n8n-chat-card-radio"]');
		expect(radios).toHaveLength(2);
		expect(radios[0].find('input[type="radio"]').exists()).toBe(true);

		await radios[1].find('input').trigger('change');
		expect(wrapper.emitted('submit')?.[0]).toEqual([
			{ type: 'select', id: 'next_step', value: 'email' },
		]);
	});

	it('renders fields provided via the items alias', () => {
		const itemsCard: N8nChatInteractionInput = {
			card: {
				components: [{ type: 'fields', items: [{ label: 'ARR', value: '$1m' }] }],
			},
		};
		const wrapper = mountCard({ input: itemsCard });
		expect(wrapper.text()).toContain('ARR');
		expect(wrapper.text()).toContain('$1m');
	});

	it('disabled blocks radio submission', async () => {
		const radio: N8nChatInteractionInput = {
			card: {
				components: [
					{ type: 'radio_select', id: 'x', options: [{ label: 'Call', value: 'call' }] },
				],
			},
		};
		const wrapper = mountCard({ input: radio, disabled: true });
		await wrapper.find('[data-testid="n8n-chat-card-radio"] input').trigger('change');
		expect(wrapper.emitted('submit')).toBeUndefined();
	});
});
