import { createComponentRenderer } from '@/__tests__/render';
import AddColumnPopover from '@/features/dataStore/components/dataGrid/AddColumnPopover.vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { MAX_COLUMN_NAME_LENGTH } from '@/features/dataStore/constants';

vi.mock('@/features/dataStore/composables/useDataStoreTypes', () => ({
	useDataStoreTypes: () => ({
		getIconForType: (type: string) => {
			const iconMap: Record<string, string> = {
				string: 'abc',
				number: '123',
				boolean: 'toggle-off',
				date: 'calendar',
			};
			return iconMap[type] || 'abc';
		},
	}),
}));

vi.mock('@/composables/useDebounce', () => ({
	useDebounce: () => ({
		debounce: (fn: Function) => fn,
	}),
}));

describe('AddColumnPopover', () => {
	const renderComponent = createComponentRenderer(AddColumnPopover);

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('should render the add column button', () => {
		const { getByRole } = renderComponent();
		const addButton = getByRole('button');
		expect(addButton).toBeInTheDocument();
	});

	it('should focus name input when popover opens', async () => {
		const { getByRole, getByPlaceholderText } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			const nameInput = getByPlaceholderText('dataStore.addColumn.nameInput.placeholder');
			expect(nameInput).toHaveFocus();
		});
	});

	it('should emit addColumn event with correct payload', async () => {
		const { getByRole, getByPlaceholderText, getByText, emitted } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('dataStore.addColumn.nameInput.placeholder');
		await fireEvent.update(nameInput, 'newColumn');

		const submitButton = getByText('dataStore.addColumn.label');
		await fireEvent.click(submitButton);

		expect(emitted().addColumn).toBeTruthy();
		expect(emitted().addColumn[0]).toEqual([
			{
				column: {
					name: 'newColumn',
					type: 'string',
				},
			},
		]);
	});

	it('should disable submit button when name is empty', async () => {
		const { getByRole, getByText } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			const submitButton = getByText('dataStore.addColumn.label');
			expect(submitButton).toBeDisabled();
		});
	});

	it('should enable submit button when name is provided', async () => {
		const { getByRole, getByPlaceholderText, getByText } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('dataStore.addColumn.nameInput.placeholder');
		await fireEvent.update(nameInput, 'validName');

		await waitFor(() => {
			const submitButton = getByText('dataStore.addColumn.label');
			expect(submitButton).not.toBeDisabled();
		});
	});

	it('should show error for invalid column names', async () => {
		const { getByRole, getByPlaceholderText, getByText } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('dataStore.addColumn.nameInput.placeholder');

		// Test invalid name starting with hyphen
		await fireEvent.update(nameInput, '-invalid');
		await fireEvent.blur(nameInput);

		await waitFor(() => {
			expect(getByText('dataStore.addColumn.invalidName.error')).toBeInTheDocument();
			const submitButton = getByText('dataStore.addColumn.label');
			expect(submitButton).toBeDisabled();
		});
	});

	it('should allow valid column names', async () => {
		const { getByRole, getByPlaceholderText, queryByText } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('dataStore.addColumn.nameInput.placeholder');

		// Test valid names
		const validNames = ['column1', 'my-column', 'Column123', 'a1b2c3'];

		for (const name of validNames) {
			await fireEvent.update(nameInput, name);
			await fireEvent.blur(nameInput);

			await waitFor(() => {
				expect(queryByText('dataStore.addColumn.invalidName.error')).not.toBeInTheDocument();
			});
		}
	});

	it('should clear error when correcting invalid name', async () => {
		const { getByRole, getByPlaceholderText, getByText, queryByText } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('dataStore.addColumn.nameInput.placeholder');

		// Enter invalid name
		await fireEvent.update(nameInput, '-invalid');
		await fireEvent.blur(nameInput);

		await waitFor(() => {
			expect(getByText('dataStore.addColumn.invalidName.error')).toBeInTheDocument();
		});

		// Correct the name
		await fireEvent.update(nameInput, 'valid');
		await fireEvent.blur(nameInput);

		await waitFor(() => {
			expect(queryByText('dataStore.addColumn.invalidName.error')).not.toBeInTheDocument();
		});
	});

	it('should respect max column name length', async () => {
		const { getByRole, getByPlaceholderText } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText(
			'dataStore.addColumn.nameInput.placeholder',
		) as HTMLInputElement;

		expect(nameInput.maxLength).toBe(MAX_COLUMN_NAME_LENGTH);
	});

	it('should allow selecting different column types', async () => {
		const { getByRole, getByPlaceholderText, getByText, emitted } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('dataStore.addColumn.nameInput.placeholder');
		await fireEvent.update(nameInput, 'numberColumn');

		// Click on the select to open dropdown
		const selectElement = getByRole('combobox');
		await fireEvent.click(selectElement);

		// Select 'number' type
		const numberOption = getByText('number');
		await fireEvent.click(numberOption);

		const submitButton = getByText('dataStore.addColumn.label');
		await fireEvent.click(submitButton);

		expect(emitted().addColumn).toBeTruthy();
		expect(emitted().addColumn[0]).toEqual([
			{
				column: {
					name: 'numberColumn',
					type: 'number',
				},
			},
		]);
	});

	it('should reset form after successful submission', async () => {
		const { getByRole, getByPlaceholderText, getByText } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText(
			'dataStore.addColumn.nameInput.placeholder',
		) as HTMLInputElement;
		await fireEvent.update(nameInput, 'testColumn');

		const submitButton = getByText('dataStore.addColumn.label');
		await fireEvent.click(submitButton);

		// Click button again to open popover
		await fireEvent.click(addButton);

		await waitFor(() => {
			const resetNameInput = getByPlaceholderText(
				'dataStore.addColumn.nameInput.placeholder',
			) as HTMLInputElement;
			expect(resetNameInput.value).toBe('');
		});
	});

	it('should close popover after successful submission', async () => {
		const { getByRole, getByPlaceholderText, getByText, queryByText } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('dataStore.addColumn.nameInput.placeholder');
		await fireEvent.update(nameInput, 'testColumn');

		const submitButton = getByText('dataStore.addColumn.label');
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(queryByText('dataStore.addColumn.nameInput.label')).not.toBeInTheDocument();
		});
	});

	it('should allow submission with Enter key', async () => {
		const { getByRole, getByPlaceholderText, emitted } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('dataStore.addColumn.nameInput.placeholder');
		await fireEvent.update(nameInput, 'enterColumn');
		await fireEvent.keyUp(nameInput, { key: 'Enter' });

		expect(emitted().addColumn).toBeTruthy();
		expect(emitted().addColumn[0]).toEqual([
			{
				column: {
					name: 'enterColumn',
					type: 'string',
				},
			},
		]);
	});

	it('should display all column type options', async () => {
		const { getByRole, getByText } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		const selectElement = getByRole('combobox');
		await fireEvent.click(selectElement);

		await waitFor(() => {
			expect(getByText('string')).toBeInTheDocument();
			expect(getByText('number')).toBeInTheDocument();
			expect(getByText('boolean')).toBeInTheDocument();
			expect(getByText('date')).toBeInTheDocument();
		});
	});

	it('should show tooltip with error description', async () => {
		const { getByRole, getByPlaceholderText, getByText } = renderComponent();
		const addButton = getByRole('button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('dataStore.addColumn.nameInput.placeholder');
		await fireEvent.update(nameInput, '-invalid');
		await fireEvent.blur(nameInput);

		await waitFor(() => {
			expect(getByText('dataStore.addColumn.invalidName.error')).toBeInTheDocument();
			// Check for help icon that shows tooltip
			const helpIcon = document.querySelector('[icon="circle-help"]');
			expect(helpIcon).toBeInTheDocument();
		});
	});
});
