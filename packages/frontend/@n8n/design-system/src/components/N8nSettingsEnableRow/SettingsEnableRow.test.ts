import { render } from '@testing-library/vue';
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
});
