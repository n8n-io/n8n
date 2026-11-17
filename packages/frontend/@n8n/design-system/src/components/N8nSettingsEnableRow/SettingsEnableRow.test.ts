import { fireEvent, render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import N8nSettingsEnableRow from './SettingsEnableRow.vue';

describe('N8nSettingsEnableRow', () => {
	it('renders the title and the switch', () => {
		const { getByRole } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				enabled: false,
			},
		});

		expect(getByRole('switch', { name: 'Enable Agents' })).toHaveAttribute('aria-checked', 'false');
	});

	it('emits the next switch value', async () => {
		const { getByRole, emitted } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				enabled: false,
			},
		});

		await userEvent.click(getByRole('switch', { name: 'Enable Agents' }));

		expect(emitted()['update:enabled'][0]).toEqual([true]);
	});

	it('shows the status badges when the flags are on', () => {
		const { getByTestId } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable workflow reviews',
				description: 'Allow users to submit workflow versions for approval.',
				enabled: true,
				showPreviewBadge: true,
				showEnterpriseReadinessBadge: true,
			},
		});

		expect(getByTestId('settings-enable-row-preview-badge')).toHaveTextContent('Preview');
		expect(getByTestId('settings-enable-row-enterprise-readiness-badge')).toHaveTextContent(
			'Limited enterprise readiness',
		);
	});

	it('hides the status badges by default', () => {
		const { queryByTestId } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable workflow reviews',
				description: 'Allow users to submit workflow versions for approval.',
				enabled: true,
			},
		});

		expect(queryByTestId('settings-enable-row-preview-badge')).not.toBeInTheDocument();
		expect(queryByTestId('settings-enable-row-enterprise-readiness-badge')).not.toBeInTheDocument();
	});

	it('uses the small settings switch', () => {
		const { getByRole } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				enabled: false,
			},
		});

		expect(getByRole('switch', { name: 'Enable Agents' }).parentElement?.className).toContain(
			'small',
		);
	});

	it('toggles the switch from the title', async () => {
		const { getByText, emitted } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				enabled: false,
			},
		});

		// user-event crashes when a label click activates the switch.
		await fireEvent.click(getByText('Enable Agents'));

		expect(emitted()['update:enabled'][0]).toEqual([true]);
	});

	it('toggles the switch from the description', async () => {
		const { getByText, emitted } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				enabled: false,
			},
		});

		await fireEvent.click(getByText('Allow users to build and run agents.'));

		expect(emitted()['update:enabled'][0]).toEqual([true]);
	});

	it('does not toggle from the title when the switch is disabled', async () => {
		const { getByText, emitted } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				enabled: false,
				disabled: true,
			},
		});

		await fireEvent.click(getByText('Enable Agents'));

		expect(emitted()['update:enabled']).toBeUndefined();
	});

	it('does not toggle from a status badge', async () => {
		const { getByTestId, emitted } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable workflow reviews',
				description: 'Allow users to submit workflow versions for approval.',
				enabled: false,
				showPreviewBadge: true,
			},
		});

		await userEvent.click(getByTestId('settings-enable-row-preview-badge'));

		expect(emitted()['update:enabled']).toBeUndefined();
	});

	it('renders a divider and leaves the card to the page', () => {
		const { getByTestId, queryByTestId } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
			},
		});

		expect(queryByTestId('settings-row-group')).not.toBeInTheDocument();
		expect(getByTestId('settings-row-divider')).toBeInTheDocument();
	});
});
