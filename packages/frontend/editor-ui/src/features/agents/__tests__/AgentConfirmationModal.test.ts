/* eslint-disable import-x/no-extraneous-dependencies -- @vue/test-utils is a transitive devDep */
import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AgentConfirmationModal, {
	type AgentConfirmationModalData,
} from '../components/AgentConfirmationModal.vue';

const closeModalMock = vi.fn();

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ closeModal: closeModalMock }),
}));

const STUBS = {
	Modal: {
		props: ['beforeClose'],
		template: '<div><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
	},
	N8nHeading: { template: '<h2><slot /></h2>' },
	N8nText: { template: '<span><slot /></span>' },
	N8nIcon: { template: '<span />' },
	N8nLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
	N8nCallout: { template: '<div><slot /></div>' },
	N8nBadge: { template: '<span><slot /></span>' },
	// Renders the tooltip text inline so the reason is assertable.
	N8nTooltip: { template: '<span><slot /><slot name="content" /></span>' },
	// No `emits` declaration: the parent's `@click` falls through to the native button.
	N8nButton: { template: '<button><slot /></button>' },
};

function renderModal(data: Partial<AgentConfirmationModalData>) {
	return mount(AgentConfirmationModal, {
		props: {
			modalName: 'agentConfirmation',
			data: {
				title: 'Publish agent',
				description: 'Also publishes these workflows:',
				confirmButtonText: 'Publish all',
				cancelButtonText: 'Cancel',
				...data,
			},
		},
		global: { stubs: STUBS },
	});
}

describe('AgentConfirmationModal', () => {
	it('stays open marking the failed items until confirming succeeds', async () => {
		const onConfirm = vi
			.fn()
			.mockResolvedValueOnce({
				message: 'Some could not be published.',
				failedItems: [{ id: 'wf-1', reason: 'No trigger' }],
			})
			.mockResolvedValueOnce(undefined);
		const wrapper = renderModal({
			items: [
				{ id: 'wf-1', name: 'Lookup', href: '/workflow/wf-1' },
				{ id: 'wf-2', name: 'Notify', href: '/workflow/wf-2' },
			],
			onConfirm,
		});
		const confirmButton = wrapper.findAll('button')[1];

		await confirmButton.trigger('click');
		await flushPromises();

		expect(closeModalMock).not.toHaveBeenCalled();
		// The original text and list stay; only the failed item gets marked.
		expect(wrapper.find('[data-test-id="agent-confirmation-description"]').text()).toBe(
			'Also publishes these workflows:',
		);
		const items = wrapper.findAll('[data-test-id="agent-confirmation-items"] li');
		expect(items).toHaveLength(2);
		expect(items[0].find('[data-test-id="agent-confirmation-item-failed"]').exists()).toBe(true);
		expect(items[0].text()).toContain('No trigger');
		expect(items[1].find('[data-test-id="agent-confirmation-item-failed"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="agent-confirmation-failure"]').text()).toBe(
			'Some could not be published.',
		);

		await confirmButton.trigger('click');
		await flushPromises();

		expect(closeModalMock).toHaveBeenCalledWith('agentConfirmation');
	});

	it('refuses to close while confirming is in flight', async () => {
		let finish: (value: undefined) => void = () => {};
		const onConfirm = vi.fn(
			async () => await new Promise<undefined>((resolve) => (finish = resolve)),
		);
		const wrapper = renderModal({ onConfirm });
		const beforeClose = wrapper
			.findComponent(STUBS.Modal)
			.props('beforeClose') as () => Promise<boolean>;

		await wrapper.findAll('button')[1].trigger('click');
		await expect(beforeClose()).resolves.toBe(false);

		finish(undefined);
		await flushPromises();

		await expect(beforeClose()).resolves.toBe(true);
	});
});
