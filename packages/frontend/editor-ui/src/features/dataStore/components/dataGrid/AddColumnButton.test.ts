import { createComponentRenderer } from '@/__tests__/render';
import AddColumnButton from '@/features/dataStore/components/dataGrid/AddColumnButton.vue';
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

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => {
			const translations: Record<string, string> = {
				'dataStore.addColumn.label': 'Add column',
				'dataStore.addColumn.nameInput.label': 'Column name',
				'dataStore.addColumn.nameInput.placeholder': 'Enter column name',
				'dataStore.addColumn.typeInput.label': 'Column type',
				'dataStore.addColumn.invalidName.error': 'Invalid column name',
				'dataStore.addColumn.invalidName.description':
					'Column names must start with a letter and contain only letters, numbers, and hyphens',
			};
			return translations[key] || key;
		},
	}),
}));

describe('AddColumnButton', () => {
	const addColumnHandler = vi.fn().mockResolvedValue({ success: true });
	const renderComponent = createComponentRenderer(AddColumnButton, {
		props: {
			params: {
				onAddColumn: addColumnHandler,
			},
		},
	});

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('should render the add column button', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('data-store-add-column-trigger-button')).toBeInTheDocument();
	});

	it('should focus name input when popover opens', async () => {
		const { getByTestId, getByPlaceholderText } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			const nameInput = getByPlaceholderText('Enter column name');
			expect(nameInput).toHaveFocus();
		});
	});

	it('should call addColumn with correct payload', async () => {
		const { getByTestId, getByPlaceholderText } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('Enter column name');
		await fireEvent.update(nameInput, 'newColumn');

		const submitButton = getByTestId('data-store-add-column-submit-button');
		expect(submitButton).not.toBeDisabled();
		await fireEvent.click(submitButton);

		expect(addColumnHandler).toHaveBeenCalledWith({
			name: 'newColumn',
			type: 'string',
		});
	});

	it('should disable submit button when name is empty', async () => {
		const { getByTestId } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			const submitButton = getByTestId('data-store-add-column-submit-button');
			expect(submitButton).toBeDisabled();
		});
	});

	it('should show error for invalid column names', async () => {
		const { getByPlaceholderText, getByText, getByTestId } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('Enter column name');

		// Test invalid name starting with hyphen
		await fireEvent.update(nameInput, '-invalid');
		await fireEvent.blur(nameInput);

		await waitFor(() => {
			expect(getByText('Invalid column name')).toBeInTheDocument();
			const submitButton = getByTestId('data-store-add-column-submit-button');
			expect(submitButton).toBeDisabled();
		});
	});

	it('should allow valid column names', async () => {
		const { getByTestId, getByPlaceholderText, queryByText } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('Enter column name');

		// Test valid names
		const validNames = ['column1', 'my_column', 'Column123', 'a1b2c3'];

		for (const name of validNames) {
			await fireEvent.update(nameInput, name);
			await fireEvent.blur(nameInput);

			await waitFor(() => {
				expect(queryByText('Invalid column name')).not.toBeInTheDocument();
			});
		}
	});

	it('should clear error when correcting invalid name', async () => {
		const { getByTestId, getByPlaceholderText, getByText, queryByText } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('Enter column name');

		// Enter invalid name
		await fireEvent.update(nameInput, '-invalid');
		await fireEvent.blur(nameInput);

		await waitFor(() => {
			expect(getByText('Invalid column name')).toBeInTheDocument();
		});

		// Correct the name
		await fireEvent.update(nameInput, 'valid');
		await fireEvent.blur(nameInput);

		await waitFor(() => {
			expect(queryByText('Invalid column name')).not.toBeInTheDocument();
		});
	});

	it('should respect max column name length', async () => {
		const { getByTestId, getByPlaceholderText } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('Enter column name');

		expect(nameInput.getAttribute('maxlength')).toBe(MAX_COLUMN_NAME_LENGTH.toString());
	});

	it('should allow selecting different column types', async () => {
		const { getByPlaceholderText, getByRole, getByText, getByTestId } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('Enter column name');
		await fireEvent.update(nameInput, 'numberColumn');

		// Click on the select to open dropdown
		const selectElement = getByRole('combobox');
		await fireEvent.click(selectElement);

		// Select 'number' type
		const numberOption = getByText('number');
		await fireEvent.click(numberOption);

		const submitButton = getByTestId('data-store-add-column-submit-button');
		await fireEvent.click(submitButton);

		expect(addColumnHandler).toHaveBeenCalledWith({
			name: 'numberColumn',
			type: 'number',
		});
	});

	it('should reset form after successful submission', async () => {
		const { getByPlaceholderText, getByTestId } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('Enter column name');
		await fireEvent.update(nameInput, 'testColumn');

		const submitButton = getByTestId('data-store-add-column-submit-button');
		await fireEvent.click(submitButton);

		// Click button again to open popover
		await fireEvent.click(addButton);

		await waitFor(() => {
			const resetNameInput = getByPlaceholderText('Enter column name');
			expect((resetNameInput as HTMLInputElement).value).toBe('');
		});
	});

	it('should close popover after successful submission', async () => {
		const { getByPlaceholderText, getByTestId, queryByTestId } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('Enter column name');
		await fireEvent.update(nameInput, 'testColumn');

		const submitButton = getByTestId('data-store-add-column-submit-button');
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(queryByTestId('add-column-popover-content')).not.toBeInTheDocument();
		});
	});

	it('should not close popover if submission fails', async () => {
		const { getByPlaceholderText, getByTestId } = renderComponent();
		addColumnHandler.mockResolvedValueOnce({
			success: false,
			error: 'Column name already exists',
		});
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('Enter column name');
		await fireEvent.update(nameInput, 'testColumn');

		const submitButton = getByTestId('data-store-add-column-submit-button');
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});
	});

	it('should allow submission with Enter key', async () => {
		const { getByTestId, getByPlaceholderText } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('Enter column name');
		await fireEvent.update(nameInput, 'enterColumn');
		await fireEvent.keyUp(nameInput, { key: 'Enter' });

		expect(addColumnHandler).toHaveBeenCalledWith({
			name: 'enterColumn',
			type: 'string',
		});
	});

	it('should display all column type options', async () => {
		const { getByTestId, getByRole, getByText } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		const selectElement = getByRole('combobox');
		await fireEvent.click(selectElement);

		await waitFor(() => {
			expect(getByText('string')).toBeInTheDocument();
			expect(getByText('number')).toBeInTheDocument();
			expect(getByText('boolean')).toBeInTheDocument();
			expect(getByText('datetime')).toBeInTheDocument();
		});
	});

	it('should set value to "date" when selecting "datetime" option', async () => {
		const { getByTestId, getByRole, getByText, getByPlaceholderText } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('Enter column name');
		await fireEvent.update(nameInput, 'dateColumn');

		const selectElement = getByRole('combobox');
		await fireEvent.click(selectElement);

		const dateOption = getByText('datetime');
		await fireEvent.click(dateOption);

		const submitButton = getByTestId('data-store-add-column-submit-button');
		await fireEvent.click(submitButton);

		expect(addColumnHandler).toHaveBeenCalledWith({
			name: 'dateColumn',
			type: 'date',
		});
	});

	it('should show tooltip with error description', async () => {
		const { getByPlaceholderText, getByText, getByTestId } = renderComponent();
		const addButton = getByTestId('data-store-add-column-trigger-button');

		await fireEvent.click(addButton);

		const nameInput = getByPlaceholderText('Enter column name');
		await fireEvent.update(nameInput, '-invalid');
		await fireEvent.blur(nameInput);

		await waitFor(() => {
			expect(getByText('Invalid column name')).toBeInTheDocument();
			// Check for help icon that shows tooltip
			const helpIcon = getByTestId('add-column-error-help-icon');
			expect(helpIcon).toBeInTheDocument();
		});
	});
});
