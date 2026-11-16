import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelWhatsAppRemoveConfirmation from './AgentChannelWhatsAppRemoveConfirmation.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function mountConfirmation(
	props: { open: boolean; loading: boolean } = { open: true, loading: false },
) {
	return mount(AgentChannelWhatsAppRemoveConfirmation, {
		props,
		global: {
			stubs: {
				Dialog: {
					props: ['open', 'showCloseButton'],
					emits: ['update:open'],
					template: `
						<div v-if="open" :data-show-close="showCloseButton">
							<button data-testid="dialog-close" @click="$emit('update:open', false)" />
							<slot />
						</div>
					`,
				},
				DialogHeader: { template: '<header><slot /></header>' },
				DialogTitle: { template: '<h2><slot /></h2>' },
				// The real one needs a dialog root. It describes the dialog to screen readers.
				DialogDescription: {
					props: ['asChild'],
					template: '<div data-testid="dialog-description"><slot /></div>',
				},
				DialogFooter: { template: '<footer><slot /></footer>' },
				N8nText: { template: '<span><slot /></span>' },
				N8nButton: {
					props: ['disabled', 'loading'],
					emits: ['click'],
					template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
				},
			},
		},
	});
}

const cancelButton = (wrapper: ReturnType<typeof mountConfirmation>) =>
	wrapper.findAll('button').find((button) => button.text() === 'generic.cancel');

describe('AgentChannelWhatsAppRemoveConfirmation', () => {
	it('shows the title and what removing does', () => {
		const wrapper = mountConfirmation();

		expect(wrapper.get('h2').text()).toBe('agents.channels.whatsapp.remove.title');
		expect(wrapper.text()).toContain('agents.channels.whatsapp.remove.confirm');
	});

	it('describes the dialog to screen readers with the explanation', () => {
		const wrapper = mountConfirmation();

		expect(wrapper.get('[data-testid="dialog-description"]').text()).toBe(
			'agents.channels.whatsapp.remove.description',
		);
	});

	it('confirms the removal', async () => {
		const wrapper = mountConfirmation();

		await wrapper.get('[data-testid="whatsapp-remove-confirm"]').trigger('click');

		expect(wrapper.emitted('confirm')).toEqual([[false]]);
	});

	it('cancels without confirming', async () => {
		const wrapper = mountConfirmation();

		await cancelButton(wrapper)?.trigger('click');

		expect(wrapper.emitted('cancel')).toHaveLength(1);
		expect(wrapper.emitted('confirm')).toBeUndefined();
	});

	it('renders nothing while closed', () => {
		const wrapper = mountConfirmation({ open: false, loading: false });

		expect(wrapper.find('h2').exists()).toBe(false);
	});

	describe('when idle', () => {
		it('cancels when the dialog is dismissed', async () => {
			const wrapper = mountConfirmation({ open: true, loading: false });

			await wrapper.get('[data-testid="dialog-close"]').trigger('click');

			expect(wrapper.emitted('cancel')).toHaveLength(1);
		});

		it('shows the close button', () => {
			const wrapper = mountConfirmation({ open: true, loading: false });

			expect(wrapper.get('[data-show-close]').attributes('data-show-close')).toBe('true');
		});
	});

	describe('while the removal is under way', () => {
		it('does not cancel when the dialog is dismissed', async () => {
			const wrapper = mountConfirmation({ open: true, loading: true });

			await wrapper.get('[data-testid="dialog-close"]').trigger('click');

			expect(wrapper.emitted('cancel')).toBeUndefined();
		});

		it('disables Cancel', async () => {
			const wrapper = mountConfirmation({ open: true, loading: true });

			expect(cancelButton(wrapper)?.attributes('disabled')).toBeDefined();
			await cancelButton(wrapper)?.trigger('click');
			expect(wrapper.emitted('cancel')).toBeUndefined();
		});

		it('hides the close button', () => {
			const wrapper = mountConfirmation({ open: true, loading: true });

			expect(wrapper.get('[data-show-close]').attributes('data-show-close')).toBe('false');
		});
	});
});
