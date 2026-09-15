import type { DataTablePermission } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import type { DataStoreConnectionItem } from '@/features/shared/toolsConnection/types';

import AppBindingDetailBody from '../AppBindingDetailBody.vue';

const item: DataStoreConnectionItem = {
	id: 'data-table:dt-1',
	kind: 'data-store',
	dataStoreId: 'dt-1',
	title: 'Orders',
	description: 'Every order since launch',
	status: 'none',
};

const permissionOptions: Array<{ value: DataTablePermission; label: string }> = [
	{ value: 'read', label: 'Read' },
	{ value: 'write', label: 'Write' },
];

const render = createComponentRenderer(AppBindingDetailBody, {
	props: { item, connected: false, permissionOptions, note: 'Anyone gets this access.' },
});

describe('AppBindingDetailBody', () => {
	it('shows the description, every option checked, the note and Connect', () => {
		const { getByText, getByRole, getByTestId, queryByTestId } = render();

		expect(getByText('Every order since launch')).toBeInTheDocument();
		expect(getByText('Anyone gets this access.')).toBeInTheDocument();
		expect(getByRole('checkbox', { name: 'Read' })).toHaveAttribute('aria-checked', 'true');
		expect(getByRole('checkbox', { name: 'Write' })).toHaveAttribute('aria-checked', 'true');
		expect(getByTestId('app-binding-connect')).toBeEnabled();
		expect(queryByTestId('app-binding-save')).not.toBeInTheDocument();
		expect(queryByTestId('app-binding-disconnect')).not.toBeInTheDocument();
	});

	it('emits connect with the checked permissions in option order', async () => {
		const { getByRole, getByTestId, emitted } = render();

		await userEvent.click(getByRole('checkbox', { name: 'Read' }));
		await userEvent.click(getByRole('checkbox', { name: 'Write' }));
		expect(getByTestId('app-binding-connect')).toBeDisabled();

		await userEvent.click(getByRole('checkbox', { name: 'Write' }));
		await userEvent.click(getByRole('checkbox', { name: 'Read' }));
		await userEvent.click(getByTestId('app-binding-connect'));

		expect(emitted('connect')).toEqual([[['read', 'write']]]);
	});

	it('renders no checkboxes and an enabled Connect without options', () => {
		const { queryByRole, getByTestId } = render({ props: { permissionOptions: [] } });

		expect(queryByRole('checkbox')).not.toBeInTheDocument();
		expect(getByTestId('app-binding-connect')).toBeEnabled();
	});

	it('starts from the stored permissions and disables Save until they change', async () => {
		const { getByRole, getByTestId, emitted } = render({
			props: { connected: true, permissions: ['read'] },
		});

		expect(getByRole('checkbox', { name: 'Read' })).toHaveAttribute('aria-checked', 'true');
		expect(getByRole('checkbox', { name: 'Write' })).toHaveAttribute('aria-checked', 'false');
		expect(getByTestId('app-binding-save')).toBeDisabled();

		await userEvent.click(getByRole('checkbox', { name: 'Write' }));
		expect(getByTestId('app-binding-save')).toBeEnabled();
		await userEvent.click(getByTestId('app-binding-save'));

		expect(emitted('save')).toEqual([[['read', 'write']]]);
	});

	it('disables Save when no permission is left checked', async () => {
		const { getByRole, getByTestId } = render({
			props: { connected: true, permissions: ['read'] },
		});

		await userEvent.click(getByRole('checkbox', { name: 'Read' }));

		expect(getByTestId('app-binding-save')).toBeDisabled();
	});

	it('emits disconnect and hides Save for a connected item without options', async () => {
		const { getByTestId, queryByTestId, emitted } = render({
			props: { connected: true, permissions: [], permissionOptions: [] },
		});

		expect(queryByTestId('app-binding-save')).not.toBeInTheDocument();
		await userEvent.click(getByTestId('app-binding-disconnect'));

		expect(emitted('disconnect')).toHaveLength(1);
	});
});
