import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import AgentChipRow from '../components/AgentChipRow.vue';

const renderComponent = createComponentRenderer(AgentChipRow, {
	props: { label: 'Tools', itemCount: 1, addLabel: 'Add tool', disabled: true },
});

describe('AgentChipRow', () => {
	it('keeps the disabled add action reachable while existing controls stay inert', async () => {
		const user = userEvent.setup();
		const { getByRole, getByTestId, emitted, rerender } = renderComponent({
			slots: {
				default: '<button>Existing tool</button>',
				extra: '<button>Extra action</button>',
			},
		});
		const add = getByRole('button', { name: 'Add tool' });
		expect(add.closest('[inert]')).toBeNull();
		expect(add).not.toBeDisabled();
		expect(add).toHaveAttribute('aria-disabled', 'true');
		for (const name of ['Existing tool', 'Extra action']) {
			expect(getByRole('button', { name }).closest('[inert]')).not.toBeNull();
		}

		add.focus();
		expect(add).toHaveFocus();
		await waitFor(() => expect(getByTestId('tooltip-content')).toHaveTextContent('Add tool'));
		await user.keyboard('{Escape}');
		expect(add).toHaveFocus();
		await user.click(add);
		await user.keyboard('{Enter} ');
		expect(emitted('add')).toBeUndefined();

		await rerender({ disabled: false });
		expect(add).not.toHaveAttribute('aria-disabled');
		expect(getByRole('button', { name: 'Existing tool' }).closest('[inert]')).toBeNull();
		expect(getByRole('button', { name: 'Extra action' }).closest('[inert]')).toBeNull();
		await user.click(add);
		expect(emitted('add')).toEqual([[]]);
	});
});
