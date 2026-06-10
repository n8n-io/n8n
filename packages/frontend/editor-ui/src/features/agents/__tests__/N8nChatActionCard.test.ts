/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import N8nChatActionCard from '../components/interactive/N8nChatActionCard.vue';

const input = {
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
				N8nButton: {
					template:
						'<button v-bind="$attrs" :disabled="$attrs.disabled" @click="$emit(\'click\')"><slot/></button>',
					props: ['disabled', 'type', 'size'],
					emits: ['click'],
				},
				N8nText: { template: '<p><slot/></p>' },
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
		expect(wrapper.text()).toContain('High');
	});

	it('button click emits the platform resume shape', async () => {
		const wrapper = mountCard();
		await wrapper.find('[data-testid="n8n-chat-card-button"]').trigger('click');
		expect(wrapper.emitted('submit')?.[0]).toEqual([{ type: 'button', value: 'yes' }]);
	});

	it('select option click emits the select resume shape', async () => {
		const wrapper = mountCard();
		await wrapper.find('[data-testid="n8n-chat-card-option"]').trigger('click');
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

	it('label-only buttons submit and highlight by their label', async () => {
		const labelOnly = {
			card: { components: [{ type: 'button', label: 'Approve' }] },
		};
		const wrapper = mountCard({ input: labelOnly });
		await wrapper.find('[data-testid="n8n-chat-card-button"]').trigger('click');
		expect(wrapper.emitted('submit')?.[0]).toEqual([{ type: 'button', value: 'Approve' }]);

		// The resolved highlight must use the same derived value the submit emits.
		const resolved = mountCard({
			input: labelOnly,
			disabled: true,
			resolvedValue: { type: 'button', value: 'Approve' },
		});
		const button = resolved.find('[data-testid="n8n-chat-card-button"]');
		expect(button.attributes('disabled')).toBeUndefined();
	});

	it('renders a section accessory button and submits its value', async () => {
		const sectionWithButton = {
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
		const sectionWithButton = {
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
		const textButton = {
			card: { components: [{ type: 'button', text: 'Confirm', value: 'confirm' }] },
		};
		const wrapper = mountCard({ input: textButton });
		expect(wrapper.find('[data-testid="n8n-chat-card-button"]').text()).toContain('Confirm');
		// Submit value is still value, not text
		await wrapper.find('[data-testid="n8n-chat-card-button"]').trigger('click');
		expect(wrapper.emitted('submit')?.[0]).toEqual([{ type: 'button', value: 'confirm' }]);
	});
});
