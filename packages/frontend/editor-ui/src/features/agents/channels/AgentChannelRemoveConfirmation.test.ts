import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelRemoveConfirmation from './AgentChannelRemoveConfirmation.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function mountConfirmation(
	props: { open: boolean; loading: boolean } = { open: true, loading: false },
	slots: Record<string, string> = {},
) {
	return mount(AgentChannelRemoveConfirmation, {
		props: {
			...props,
			title: 'Remove channel?',
			description: 'What removing does.',
			confirmLabel: 'Yes, remove',
			confirmTestId: 'channel-remove-confirm',
		},
		slots,
		global: {
			stubs: {
				AgentModal: {
					props: ['open', 'title', 'busy', 'stacked'],
					emits: ['update:open'],
					template: `
						<div v-if="open" :data-stacked="stacked">
							<h2>{{ title }}</h2>
							<button :data-busy="busy" data-testid="dialog-close" @click="$emit('update:open', false)" />
							<slot />
							<footer><slot name="footerActions" /></footer>
						</div>
					`,
				},
				// The real one needs a dialog root. It describes the dialog to screen readers.
				DialogDescription: {
					props: ['asChild'],
					template: '<div data-testid="dialog-description"><slot /></div>',
				},
				N8nIcon: true,
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

describe('AgentChannelRemoveConfirmation', () => {
	it('shows the title, what removing does, and the confirm label above the channel modal', () => {
		const wrapper = mountConfirmation();

		expect(wrapper.get('h2').text()).toBe('Remove channel?');
		expect(wrapper.get('[data-testid="dialog-description"]').text()).toBe('What removing does.');
		expect(wrapper.get('[data-testid="channel-remove-confirm"]').text()).toBe('Yes, remove');
		expect(wrapper.attributes()).toHaveProperty('data-stacked');
	});

	it('shows extra choices below the description', () => {
		const wrapper = mountConfirmation(undefined, {
			default: '<div data-testid="extra-choice" />',
		});

		expect(wrapper.find('[data-testid="extra-choice"]').exists()).toBe(true);
	});

	it('confirms the removal', async () => {
		const wrapper = mountConfirmation();

		await wrapper.get('[data-testid="channel-remove-confirm"]').trigger('click');

		expect(wrapper.emitted('confirm')).toHaveLength(1);
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

	it('cancels when the dialog is dismissed', async () => {
		const wrapper = mountConfirmation();

		await wrapper.get('[data-testid="dialog-close"]').trigger('click');

		expect(wrapper.emitted('cancel')).toHaveLength(1);
	});

	describe('while the removal is under way', () => {
		it('marks the modal busy, so it hides its close button', () => {
			const wrapper = mountConfirmation({ open: true, loading: true });

			expect(wrapper.get('[data-testid="dialog-close"]').attributes('data-busy')).toBe('true');
		});

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
	});
});
