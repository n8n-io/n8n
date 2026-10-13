import { fireEvent, render, screen } from '@testing-library/vue';

import N8nSelectedItemsInfo from './SelectedItemsInfo.vue';

describe('N8nSelectedItemsInfo', () => {
	it('matches snapshot', () => {
		const { html } = render(N8nSelectedItemsInfo, {
			props: { selectedCount: 2 },
			global: { stubs: ['N8nButton'] },
		});

		expect(html()).toMatchSnapshot();
	});

	it('renders nothing when selectedCount is 0', () => {
		render(N8nSelectedItemsInfo, { props: { selectedCount: 0 } });

		expect(screen.queryByTestId('selected-items-info')).not.toBeInTheDocument();
	});

	it('renders the count and both buttons when items are selected', () => {
		render(N8nSelectedItemsInfo, { props: { selectedCount: 3 } });

		expect(screen.getByTestId('selected-items-info')).toHaveTextContent('3 rows selected');
		expect(screen.getByTestId('delete-selected-button')).toHaveTextContent('Delete');
		expect(screen.getByTestId('clear-selection-button')).toHaveTextContent('Clear selection');
	});

	it('uses the singular text for one selected item', () => {
		render(N8nSelectedItemsInfo, { props: { selectedCount: 1 } });

		expect(screen.getByTestId('selected-items-info')).toHaveTextContent('1 row selected');
	});

	it('emits deleteSelected when the delete button is clicked', async () => {
		const { emitted } = render(N8nSelectedItemsInfo, { props: { selectedCount: 1 } });

		await fireEvent.click(screen.getByTestId('delete-selected-button'));

		expect(emitted().deleteSelected).toHaveLength(1);
	});

	it('emits clearSelection when the clear button is clicked', async () => {
		const { emitted } = render(N8nSelectedItemsInfo, { props: { selectedCount: 5 } });

		await fireEvent.click(screen.getByTestId('clear-selection-button'));

		expect(emitted().clearSelection).toHaveLength(1);
	});

	it('renders the actions slot instead of the default delete button', () => {
		render(N8nSelectedItemsInfo, {
			props: { selectedCount: 2 },
			slots: { actions: '<button data-test-id="custom-action">Archive</button>' },
		});

		expect(screen.getByTestId('custom-action')).toBeInTheDocument();
		expect(screen.queryByTestId('delete-selected-button')).not.toBeInTheDocument();
		expect(screen.getByTestId('clear-selection-button')).toBeInTheDocument();
	});
});
