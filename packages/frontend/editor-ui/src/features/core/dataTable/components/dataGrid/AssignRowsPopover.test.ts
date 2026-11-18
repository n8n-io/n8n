import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import AssignRowsPopover from '@/features/core/dataTable/components/dataGrid/AssignRowsPopover.vue';

vi.mock('@/features/core/dataTable/composables/useRowRulePeople', () => ({
	useRowRulePeople: () => ({
		options: (match: string) =>
			match === 'project'
				? [{ value: 'team-1', label: 'Sales EMEA' }]
				: [{ value: 'user-1', label: 'Ada Lovelace (ada@example.com)' }],
	}),
}));

const renderComponent = createComponentRenderer(AssignRowsPopover, {
	props: { ruleColumns: { owner: 'id' } },
});

describe('AssignRowsPopover', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('assigns the chosen person to the selected rows', async () => {
		const { getByTestId, findByTestId, findByText, emitted } = renderComponent();

		await userEvent.click(getByTestId('data-table-assign-rows'));
		await userEvent.click(await findByTestId('data-table-assign-rows-value'));
		await userEvent.click(await findByText('Ada Lovelace (ada@example.com)'));
		await userEvent.click(getByTestId('data-table-assign-rows-confirm'));

		expect(emitted().assign).toEqual([['owner', 'user-1']]);
	});
});
