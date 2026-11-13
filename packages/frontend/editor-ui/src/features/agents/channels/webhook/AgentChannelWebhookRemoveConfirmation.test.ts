import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelWebhookRemoveConfirmation from './AgentChannelWebhookRemoveConfirmation.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function mountConfirmation(
	props: { open: boolean; loading: boolean } = { open: true, loading: false },
) {
	return mount(AgentChannelWebhookRemoveConfirmation, {
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

describe('AgentChannelWebhookRemoveConfirmation', () => {
	it('shows the title and what removing does', () => {
		const wrapper = mountConfirmation();

		expect(wrapper.get('h2').text()).toBe('agents.channels.webhook.remove.title');
		expect(wrapper.get('[data-testid="dialog-description"]').text()).toBe(
			'agents.channels.webhook.remove.description',
		);
	});

	it('confirms the removal', async () => {
		const wrapper = mountConfirmation();

		await wrapper.get('[data-testid="webhook-remove-confirm"]').trigger('click');

		expect(wrapper.emitted('confirm')).toEqual([[false]]);
	});

	it('cancels without confirming', async () => {
		const wrapper = mountConfirmation();

		await cancelButton(wrapper)?.trigger('click');

		expect(wrapper.emitted('cancel')).toHaveLength(1);
		expect(wrapper.emitted('confirm')).toBeUndefined();
	});

	it('does not cancel while the removal is under way', async () => {
		const wrapper = mountConfirmation({ open: true, loading: true });

		await wrapper.get('[data-testid="dialog-close"]').trigger('click');
		await cancelButton(wrapper)?.trigger('click');

		expect(wrapper.emitted('cancel')).toBeUndefined();
	});
});
