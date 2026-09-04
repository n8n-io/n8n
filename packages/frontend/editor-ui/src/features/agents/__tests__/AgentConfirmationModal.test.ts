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
		template: '<div><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
	},
	N8nHeading: { template: '<h2><slot /></h2>' },
	N8nText: { template: '<span><slot /></span>' },
	N8nIcon: { template: '<span />' },
	N8nLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
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
	it('stays open showing the failed items until confirming succeeds', async () => {
		const onConfirm = vi
			.fn()
			.mockResolvedValueOnce({
				message: 'Fix these first:',
				items: [{ id: 'wf-1', name: 'Lookup', href: '/workflow/wf-1', detail: 'No trigger' }],
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
		expect(wrapper.find('[data-test-id="agent-confirmation-description"]').text()).toBe(
			'Fix these first:',
		);
		const items = wrapper.findAll('[data-test-id="agent-confirmation-items"] li');
		expect(items).toHaveLength(1);
		expect(items[0].find('a').attributes('href')).toBe('/workflow/wf-1');
		expect(items[0].text()).toContain('No trigger');

		await confirmButton.trigger('click');
		await flushPromises();

		expect(closeModalMock).toHaveBeenCalledWith('agentConfirmation');
	});
});
