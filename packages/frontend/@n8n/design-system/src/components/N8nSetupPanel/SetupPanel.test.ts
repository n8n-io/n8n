import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { ref } from 'vue';

import SetupPanel from './SetupPanel.vue';

describe('SetupPanel', () => {
	it('opens the overlay by keyboard and returns focus to the selected row', async () => {
		const activeItemId = ref<string>();
		const { getByRole, getByText } = render({
			components: { SetupPanel },
			setup: () => ({ activeItemId, items: [{ id: 'slack', title: 'Slack', completed: false }] }),
			template: `<SetupPanel :items="items" v-model:active-item-id="activeItemId">
				<template #detail>Connection form</template>
			</SetupPanel>`,
		});
		getByRole('button', { name: 'Slack' }).focus();
		await userEvent.keyboard('{Enter}');
		expect(getByText('Connection form')).toBeVisible();
		const back = getByRole('button', { name: 'Back to setup checklist' });
		await waitFor(() => expect(back).toHaveFocus());
		await userEvent.keyboard('{Enter}');
		await waitFor(() => expect(getByRole('button', { name: 'Slack' })).toHaveFocus());
	});

	it('keeps the checklist mounted but inaccessible while the overlay is open', async () => {
		const activeItemId = ref<string>();
		const { getByRole, getByTestId, queryByRole } = render({
			components: { SetupPanel },
			setup: () => ({ activeItemId, items: [{ id: 'slack', title: 'Slack', completed: false }] }),
			template: `<SetupPanel :items="items" v-model:active-item-id="activeItemId">
				<template #detail><input aria-label="Channel" /></template>
			</SetupPanel><input aria-label="Chat" />`,
		});
		await userEvent.click(getByRole('button', { name: 'Slack' }));
		expect(getByRole('dialog', { name: 'Slack' })).toBeVisible();
		expect(getByTestId('setup-panel-row').closest('ul')).toHaveAttribute('inert');
		expect(queryByRole('button', { name: 'Slack' })).toBeNull();
		await userEvent.type(getByRole('textbox', { name: 'Channel' }), '#team');
		await userEvent.click(getByRole('textbox', { name: 'Chat' }));
		expect(getByRole('textbox', { name: 'Channel' })).toHaveValue('#team');
		await userEvent.click(getByRole('textbox', { name: 'Channel' }));
		await userEvent.keyboard('{Escape}');
		expect(queryByRole('dialog')).toBeNull();
		await waitFor(() => expect(getByRole('button', { name: 'Slack' })).toHaveFocus());
	});

	it('renders a direct connection action without opening the overlay', async () => {
		const connect = vi.fn();
		const { getByRole, queryByRole, emitted } = render(SetupPanel, {
			props: { items: [{ id: 'slack', title: 'Slack', completed: false, hasAction: true }] },
			slots: {
				action: {
					template: '<button @click="connect">Connect</button>',
					setup: () => ({ connect }),
				},
			},
		});
		expect(getByRole('group', { name: 'Slack' })).toBeVisible();
		await userEvent.click(getByRole('button', { name: 'Connect' }));
		expect(connect).toHaveBeenCalledOnce();
		expect(queryByRole('dialog')).toBeNull();
		expect(emitted('update:activeItemId')).toBeUndefined();
	});

	it('exposes completion and prevents unavailable rows from opening', async () => {
		const { getByRole, emitted } = render(SetupPanel, {
			props: {
				items: [
					{ id: 'slack', title: 'Slack', completed: true },
					{ id: 'details', title: 'Details', completed: false, disabled: true },
				],
			},
		});
		expect(getByRole('button', { name: 'Slack Complete' })).toBeEnabled();
		const details = getByRole('button', { name: 'Details' });
		expect(details).toBeDisabled();
		await userEvent.click(details);
		expect(emitted('update:activeItemId')).toBeUndefined();
	});

	it('returns to the remaining checklist when the active requirement disappears', async () => {
		const { rerender, queryByText, getByRole } = render(SetupPanel, {
			props: { items: [{ id: 'slack', title: 'Slack', completed: false }], activeItemId: 'slack' },
			slots: { detail: 'Connection form' },
		});
		await rerender({ items: [{ id: 'details', title: 'Details', completed: false }] });
		expect(queryByText('Connection form')).toBeNull();
		expect(getByRole('button', { name: 'Details' })).toBeVisible();
		await rerender({ items: [] });
		expect(queryByText('Details')).toBeNull();
	});
});
