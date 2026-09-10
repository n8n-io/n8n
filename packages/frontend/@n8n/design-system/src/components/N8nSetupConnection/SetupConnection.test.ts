import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';

import SetupConnection from './SetupConnection.vue';

describe('SetupConnection', () => {
	it('keeps Advanced setup available while required fields disable the primary action', async () => {
		const { getByRole, findByRole, emitted, rerender } = render(SetupConnection, {
			props: {
				connected: false,
				actionLabel: 'Connect',
				actionDisabled: true,
				actions: [{ id: 'advanced', label: 'Advanced setup' }],
			},
		});
		expect(getByRole('button', { name: 'Connect' })).toBeDisabled();
		await userEvent.click(getByRole('button', { name: 'More options' }));
		await userEvent.click(await findByRole('menuitem', { name: 'Advanced setup' }));
		expect(emitted('select')).toEqual([['advanced']]);
		expect(emitted('action')).toBeUndefined();
		await rerender({ actionDisabled: false });
		await userEvent.click(getByRole('button', { name: 'Connect' }));
		expect(emitted('action')).toHaveLength(1);
	});

	it('shows a saved connection and opens its pencil menu without starting a connection', async () => {
		const { getByRole, getByText, findByRole, queryByRole, emitted } = render(SetupConnection, {
			props: {
				connected: true,
				value: 'user@example.com',
				valueLabel: 'Account',
				actionLabel: 'Connect',
				actions: [{ id: 'replace', label: 'Switch account' }],
			},
		});
		expect(getByText('user@example.com')).toBeVisible();
		expect(queryByRole('button', { name: 'Connect' })).toBeNull();
		await userEvent.click(getByRole('button', { name: 'Change connection' }));
		await userEvent.click(await findByRole('menuitem', { name: 'Switch account' }));
		expect(emitted('select')).toEqual([['replace']]);
		expect(emitted('action')).toBeUndefined();
	});

	it.each([false, true])(
		'disables connection controls during a request, connected: %s',
		(connected) => {
			const { getAllByRole } = render(SetupConnection, {
				props: {
					connected,
					loading: true,
					actionLabel: 'Connect',
					actions: [{ id: 'edit', label: 'Edit' }],
				},
			});
			for (const button of getAllByRole('button')) expect(button).toBeDisabled();
		},
	);
});
