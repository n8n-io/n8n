import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import FindingStateSelect from './FindingStateSelect.vue';

const renderComponent = createComponentRenderer(FindingStateSelect);

async function openMenu() {
	const trigger = screen.getByTestId('migration-finding-state-select');
	await userEvent.click(trigger);
	return await screen.findByRole('listbox');
}

describe('FindingStateSelect', () => {
	it.each([
		{ status: 'open', label: 'Open' },
		{ status: 'wont_fix', label: "Won't fix" },
	] as const)('should show only the label of the $status state', ({ status, label }) => {
		renderComponent({ props: { modelValue: status } });

		const trigger = screen.getByTestId('migration-finding-state-select');
		expect(trigger).toHaveTextContent(label);
		expect(trigger).not.toHaveTextContent('Still needs a fix before upgrading');
		expect(trigger).not.toHaveTextContent('Counts as resolved without a fix');
	});

	it('should have an accessible name', () => {
		renderComponent({ props: { modelValue: 'open' } });

		expect(screen.getByRole('combobox', { name: 'State' })).toBeInTheDocument();
	});

	it('should list each state with its description and mark the selected state', async () => {
		renderComponent({ props: { modelValue: 'open' } });

		const listbox = await openMenu();
		const options = within(listbox).getAllByRole('option');

		expect(options).toHaveLength(2);
		expect(options[0]).toHaveTextContent('Open');
		expect(options[0]).toHaveTextContent('Still needs a fix before upgrading');
		expect(options[0]).toHaveAttribute('aria-selected', 'true');
		expect(options[1]).toHaveTextContent("Won't fix");
		expect(options[1]).toHaveTextContent('Counts as resolved without a fix');
		expect(options[1]).toHaveAttribute('aria-selected', 'false');
	});

	it('should emit the selected state', async () => {
		const { emitted } = renderComponent({ props: { modelValue: 'open' } });

		const listbox = await openMenu();
		await userEvent.click(within(listbox).getByText("Won't fix"));

		await waitFor(() => {
			expect(emitted('update:modelValue')).toEqual([['wont_fix']]);
		});
	});
});
