import { createComponentRenderer } from '@/__tests__/render';
import AddColumnButton from '@/features/dataTable/components/dataGrid/AddColumnButton.vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { MAX_COLUMN_NAME_LENGTH } from '@/features/dataTable/constants';

vi.mock('@/features/dataTable/composables/useDataTableTypes', () => ({
	useDataTableTypes: () => ({
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
		debounce:
			(fn: Function) =>
			(...args: unknown[]) =>
				fn(...args),
	}),
}));

vi.mock('@/features/dataTable/constants', async (importOriginal) => ({
	...(await importOriginal()),
	COLUMN_NAME_REGEX: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) => {
			const translations: Record<string, string> = {
				'dataTable.addColumn.label': 'Add column',
				'dataTable.addColumn.nameInput.label': 'Column name',
				'dataTable.addColumn.nameInput.placeholder': 'Enter column name',
				'dataTable.addColumn.typeInput.label': 'Column type',
				'dataTable.addColumn.invalidName.error': 'Invalid column name',
				'dataTable.addColumn.invalidName.description':
					'Column names must start with a letter and contain only letters, numbers, and hyphens',
				'dataTable.addColumn.error': 'Error adding column',
				'dataTable.addColumn.alreadyExistsError': `Column "${options?.interpolate?.name}" already exists`,
				'dataTable.addColumn.systemColumnDescription': 'This is a system column',
				'dataTable.addColumn.testingColumnDescription': 'This is a testing column',
				'dataTable.addColumn.alreadyExistsDescription': 'Column already exists',
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
		addColumnHandler.mockClear();
		addColumnHandler.mockResolvedValue({ success: true });
	});

	it('should render the add column button', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('data-table-add-column-trigger-button')).toBeInTheDocument();
	});

	it('should focus name input when popover opens', async () => {
		const { getByTestId } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			const nameInput = getByTestId('add-column-name-input');
			expect(nameInput).toHaveFocus();
		});
	});

	it('should call addColumn with correct payload', async () => {
		const { getByTestId } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});

		const nameInput = getByTestId('add-column-name-input');

		// Properly trigger v-model binding by setting value and firing input event
		(nameInput as HTMLInputElement).value = 'newColumn';
		await fireEvent.input(nameInput);

		await waitFor(() => {
			const submitButton = getByTestId('data-table-add-column-submit-button');
			expect(submitButton).not.toBeDisabled();
		});

		const submitButton = getByTestId('data-table-add-column-submit-button');
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(addColumnHandler).toHaveBeenCalledWith({
				name: 'newColumn',
				type: 'string',
			});
		});
	});

	it('should disable submit button when name is empty', async () => {
		const { getByTestId } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			const submitButton = getByTestId('data-table-add-column-submit-button');
			expect(submitButton).toBeDisabled();
		});
	});

	it('should show error for invalid column names', async () => {
		const { getByText, getByTestId } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});

		const nameInput = getByTestId('add-column-name-input');

		// Test invalid name starting with hyphen
		(nameInput as HTMLInputElement).value = '-invalid';
		await fireEvent.input(nameInput);

		await waitFor(() => {
			expect(getByText('Invalid column name')).toBeInTheDocument();
			const submitButton = getByTestId('data-table-add-column-submit-button');
			expect(submitButton).toBeDisabled();
		});
	});

	it('should allow valid column names', async () => {
		const { getByTestId, queryByText } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});

		const nameInput = getByTestId('add-column-name-input');

		// Test valid names
		const validNames = ['column1', 'my_column', 'Column123', 'a1b2c3'];

		for (const name of validNames) {
			(nameInput as HTMLInputElement).value = name;
			await fireEvent.input(nameInput);

			await waitFor(() => {
				expect(queryByText('Invalid column name')).not.toBeInTheDocument();
			});
		}
	});

	it('should clear error when correcting invalid name', async () => {
		const { getByTestId, getByText, queryByText } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});

		const nameInput = getByTestId('add-column-name-input');

		// Enter invalid name
		(nameInput as HTMLInputElement).value = '-invalid';
		await fireEvent.input(nameInput);

		await waitFor(() => {
			expect(getByText('Invalid column name')).toBeInTheDocument();
		});

		// Correct the name
		(nameInput as HTMLInputElement).value = 'valid';
		await fireEvent.input(nameInput);

		await waitFor(() => {
			expect(queryByText('Invalid column name')).not.toBeInTheDocument();
		});
	});

	it('should respect max column name length', async () => {
		const { getByTestId } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});

		const nameInput = getByTestId('add-column-name-input');

		expect(nameInput.getAttribute('maxlength')).toBe(MAX_COLUMN_NAME_LENGTH.toString());
	});

	it('should allow selecting different column types', async () => {
		const { getByRole, getByText, getByTestId } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});

		const nameInput = getByTestId('add-column-name-input');
		(nameInput as HTMLInputElement).value = 'numberColumn';
		await fireEvent.input(nameInput);

		// Click on the select to open dropdown
		const selectElement = getByRole('combobox');
		await fireEvent.click(selectElement);

		// Select 'number' type
		await waitFor(() => {
			expect(getByText('number')).toBeInTheDocument();
		});
		const numberOption = getByText('number');
		await fireEvent.click(numberOption);

		await waitFor(() => {
			const submitButton = getByTestId('data-table-add-column-submit-button');
			expect(submitButton).not.toBeDisabled();
		});

		const submitButton = getByTestId('data-table-add-column-submit-button');
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(addColumnHandler).toHaveBeenCalledWith({
				name: 'numberColumn',
				type: 'number',
			});
		});
	});

	it('should reset form after successful submission', async () => {
		const { getByTestId } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});

		const nameInput = getByTestId('add-column-name-input');
		(nameInput as HTMLInputElement).value = 'testColumn';
		await fireEvent.input(nameInput);

		await waitFor(() => {
			const submitButton = getByTestId('data-table-add-column-submit-button');
			expect(submitButton).not.toBeDisabled();
		});

		const submitButton = getByTestId('data-table-add-column-submit-button');
		await fireEvent.click(submitButton);

		// Wait for popover to close
		await waitFor(() => {
			expect(addColumnHandler).toHaveBeenCalled();
		});

		// Click button again to open popover
		await fireEvent.click(addButton);

		await waitFor(() => {
			const resetNameInput = getByTestId('add-column-name-input');
			expect((resetNameInput as HTMLInputElement).value).toBe('');
		});
	});

	it('should close popover after successful submission', async () => {
		const { getByTestId, queryByTestId } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});

		const nameInput = getByTestId('add-column-name-input');
		(nameInput as HTMLInputElement).value = 'testColumn';
		await fireEvent.input(nameInput);

		await waitFor(() => {
			const submitButton = getByTestId('data-table-add-column-submit-button');
			expect(submitButton).not.toBeDisabled();
		});

		const submitButton = getByTestId('data-table-add-column-submit-button');
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(queryByTestId('add-column-popover-content')).not.toBeInTheDocument();
		});
	});

	it('should not close popover if submission fails', async () => {
		const { getByTestId } = renderComponent();
		addColumnHandler.mockResolvedValueOnce({
			success: false,
			error: 'Column name already exists',
		});
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});

		const nameInput = getByTestId('add-column-name-input');
		(nameInput as HTMLInputElement).value = 'testColumn';
		await fireEvent.input(nameInput);

		await waitFor(() => {
			const submitButton = getByTestId('data-table-add-column-submit-button');
			expect(submitButton).not.toBeDisabled();
		});

		const submitButton = getByTestId('data-table-add-column-submit-button');
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});
	});

	it('should allow submission with Enter key', async () => {
		const { getByTestId } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});

		const nameInput = getByTestId('add-column-name-input');
		(nameInput as HTMLInputElement).value = 'enterColumn';
		await fireEvent.input(nameInput);
		await fireEvent.keyUp(nameInput, { key: 'Enter' });

		await waitFor(() => {
			expect(addColumnHandler).toHaveBeenCalledWith({
				name: 'enterColumn',
				type: 'string',
			});
		});
	});

	it('should display all column type options', async () => {
		const { getByTestId, getByRole, getByText } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});

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
		const { getByTestId, getByRole, getByText } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});

		const nameInput = getByTestId('add-column-name-input');
		(nameInput as HTMLInputElement).value = 'dateColumn';
		await fireEvent.input(nameInput);

		const selectElement = getByRole('combobox');
		await fireEvent.click(selectElement);

		await waitFor(() => {
			expect(getByText('datetime')).toBeInTheDocument();
		});

		const dateOption = getByText('datetime');
		await fireEvent.click(dateOption);

		await waitFor(() => {
			const submitButton = getByTestId('data-table-add-column-submit-button');
			expect(submitButton).not.toBeDisabled();
		});

		const submitButton = getByTestId('data-table-add-column-submit-button');
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(addColumnHandler).toHaveBeenCalledWith({
				name: 'dateColumn',
				type: 'date',
			});
		});
	});

	it('should show tooltip with error description', async () => {
		const { getByText, getByTestId } = renderComponent();
		const addButton = getByTestId('data-table-add-column-trigger-button');

		await fireEvent.click(addButton);

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});

		const nameInput = getByTestId('add-column-name-input');
		(nameInput as HTMLInputElement).value = '-invalid';
		await fireEvent.input(nameInput);

		await waitFor(() => {
			expect(getByText('Invalid column name')).toBeInTheDocument();
			// Check for help icon that shows tooltip
			const helpIcon = getByTestId('add-column-error-help-icon');
			expect(helpIcon).toBeInTheDocument();
		});
	});
});
