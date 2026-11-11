import { fireEvent, render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import N8nSettingsEnableRow from './SettingsEnableRow.vue';

describe('N8nSettingsEnableRow', () => {
	it('renders the title and the switch', () => {
		const { getByRole } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				modelValue: false,
			},
		});

		expect(getByRole('switch', { name: 'Enable Agents' })).toHaveAttribute('aria-checked', 'false');
	});

	it('emits the next switch value', async () => {
		const { getByRole, emitted } = render(N8nSettingsEnableRow, {
			props: { title: 'Enable Agents', modelValue: false },
		});

		await userEvent.click(getByRole('switch', { name: 'Enable Agents' }));

		expect(emitted()['update:modelValue'][0]).toEqual([true]);
	});

	it('renders trailing content beside the title', () => {
		const { getByTestId } = render(N8nSettingsEnableRow, {
			props: { title: 'Enable workflow reviews', modelValue: true },
			slots: {
				titleTrailing: '<span data-test-id="trailing-badge">Preview</span>',
			},
		});

		expect(getByTestId('trailing-badge')).toHaveTextContent('Preview');
	});

	it('renders a custom action instead of the switch', () => {
		const { queryByRole, getByRole } = render(N8nSettingsEnableRow, {
			props: { title: 'Enable Assistant', modelValue: false },
			slots: { action: '<button type="button">Enable</button>' },
		});

		expect(queryByRole('switch')).not.toBeInTheDocument();
		expect(getByRole('button', { name: 'Enable' })).toBeInTheDocument();
	});

	it('uses the large settings switch', () => {
		const { getByRole } = render(N8nSettingsEnableRow, {
			props: { title: 'Enable Agents', modelValue: false },
		});

		expect(getByRole('switch', { name: 'Enable Agents' }).parentElement?.className).toContain(
			'large',
		);
	});

	it('uses the large settings switch when the disabled tooltip is set', () => {
		const { getByRole } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				modelValue: false,
				disabled: true,
				disabledTooltip: 'You cannot change this',
			},
		});

		expect(getByRole('switch', { name: 'Enable Agents' }).parentElement?.className).toContain(
			'large',
		);
	});

	it('toggles the switch from the title', async () => {
		const { getByText, emitted } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				modelValue: false,
			},
		});

		// user-event crashes when a label click activates the switch.
		await fireEvent.click(getByText('Enable Agents'));

		expect(emitted()['update:modelValue'][0]).toEqual([true]);
	});

	it('toggles the switch from the description', async () => {
		const { getByText, emitted } = render(N8nSettingsEnableRow, {
			props: {
				title: 'Enable Agents',
				description: 'Allow users to build and run agents.',
				modelValue: false,
			},
		});

		await fireEvent.click(getByText('Allow users to build and run agents.'));

		expect(emitted()['update:modelValue'][0]).toEqual([true]);
	});

	it('does not toggle from the title when the switch is disabled', async () => {
		const { getByText, emitted } = render(N8nSettingsEnableRow, {
			props: { title: 'Enable Agents', modelValue: false, disabled: true },
		});

		await fireEvent.click(getByText('Enable Agents'));

		expect(emitted()['update:modelValue']).toBeUndefined();
	});

	it('does not toggle from a trailing badge', async () => {
		const { getByTestId, emitted } = render(N8nSettingsEnableRow, {
			props: { title: 'Enable workflow reviews', modelValue: false },
			slots: { titleTrailing: '<span data-test-id="trailing-badge">Preview</span>' },
		});

		await userEvent.click(getByTestId('trailing-badge'));

		expect(emitted()['update:modelValue']).toBeUndefined();
	});

	it('passes show-divider through to the row', () => {
		const { container } = render({
			components: { N8nSettingsEnableRow },
			template: '<N8nSettingsEnableRow title="Enable Agents" :show-divider="false" />',
		});

		expect(
			container.querySelector('[data-test-id="settings-row-divider"]'),
		).not.toBeInTheDocument();
	});
});
