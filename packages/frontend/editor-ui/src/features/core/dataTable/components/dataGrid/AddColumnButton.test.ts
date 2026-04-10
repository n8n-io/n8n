import { createComponentRenderer } from '@/__tests__/render';
import AddColumnButton from '@/features/core/dataTable/components/dataGrid/AddColumnButton.vue';
import { cleanup, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { MAX_COLUMN_NAME_LENGTH } from '@/features/core/dataTable/constants';

vi.mock('@/features/core/dataTable/composables/useDataTableTypes', () => ({
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

vi.mock('@/app/composables/useDebounce', () => ({
	useDebounce: () => ({
		debounce:
			(fn: Function) =>
			(...args: unknown[]) =>
				fn(...args),
	}),
}));

vi.mock('@/features/core/dataTable/constants', async (importOriginal) => ({
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
				'dataTable.column.alreadyExistsError': `Column "${options?.interpolate?.name}" already exists`,
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
	let user: UserEvent;
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
		user = userEvent.setup();
	});

	afterEach(() => {
		cleanup();
	});

	const setup = () => {
		const rendered = renderComponent();
		const addButton = rendered.getByTestId('data-table-add-column-trigger-button');
		const getNameInput = () => rendered.getByTestId<HTMLInputElement>('add-column-name-input');
		const getSubmitButton = () => rendered.getByTestId('data-table-add-column-submit-button');

		const openPopover = async () => {
			await user.click(addButton);
			await waitFor(() => {
				expect(rendered.getByTestId('add-column-popover-content')).toBeInTheDocument();
			});
		};

		const closePopover = async () => {
			await user.click(addButton);
			await waitFor(() => {
				expect(rendered.queryByTestId('add-column-popover-content')).not.toBeInTheDocument();
			});
		};

		const setColumnName = async (name: string) => {
			const nameInput = getNameInput();
			await user.clear(nameInput);
			await user.type(nameInput, name);
		};

		const submit = async () => {
			await user.click(getSubmitButton());
		};

		const selectType = async (label: 'number' | 'datetime' | 'string' | 'boolean') => {
			await user.click(rendered.getByRole('combobox'));
			await waitFor(() => {
				expect(rendered.getByText(label)).toBeInTheDocument();
			});
			await user.click(rendered.getByText(label));
		};

		return {
			...rendered,
			getNameInput,
			getSubmitButton,
			openPopover,
			closePopover,
			setColumnName,
			submit,
			selectType,
		};
	};

	it('should render the add column button', () => {
		const { getByTestId } = setup();
		expect(getByTestId('data-table-add-column-trigger-button')).toBeInTheDocument();
	});

	it('should focus name input when popover opens', async () => {
		const { getNameInput, openPopover } = setup();
		await openPopover();

		await waitFor(() => {
			expect(getNameInput()).toHaveFocus();
		});
	});

	it('should call addColumn with correct payload', async () => {
		const { openPopover, setColumnName, getSubmitButton, submit } = setup();
		await openPopover();
		await setColumnName('newColumn');
		await waitFor(() => {
			expect(getSubmitButton()).not.toBeDisabled();
		});
		await submit();

		await waitFor(() => {
			expect(addColumnHandler).toHaveBeenCalledWith({
				name: 'newColumn',
				type: 'string',
			});
		});
	});

	it('should disable submit button when name is empty', async () => {
		const { openPopover, getSubmitButton } = setup();
		await openPopover();
		await waitFor(() => {
			expect(getSubmitButton()).toBeDisabled();
		});
	});

	it('should show error for invalid column names', async () => {
		const { getByText, openPopover, setColumnName, getSubmitButton } = setup();
		await openPopover();
		await setColumnName('-invalid');

		await waitFor(() => {
			expect(getByText('Invalid column name')).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(getSubmitButton()).toBeDisabled();
		});
	});

	it('should allow valid column names', async () => {
		const { queryByText, openPopover, setColumnName } = setup();
		await openPopover();

		// Test valid names
		const validNames = ['column1', 'my_column', 'Column123', 'a1b2c3'];

		for (const name of validNames) {
			await setColumnName(name);

			await waitFor(() => {
				expect(queryByText('Invalid column name')).not.toBeInTheDocument();
			});
		}
	});

	it('should clear error when correcting invalid name', async () => {
		const { getByText, queryByText, openPopover, setColumnName } = setup();
		await openPopover();
		await setColumnName('-invalid');

		await waitFor(() => {
			expect(getByText('Invalid column name')).toBeInTheDocument();
		});

		// Correct the name
		await setColumnName('valid');

		await waitFor(() => {
			expect(queryByText('Invalid column name')).not.toBeInTheDocument();
		});
	});

	it('should respect max column name length', async () => {
		const { getNameInput, openPopover } = setup();
		await openPopover();
		expect(getNameInput().getAttribute('maxlength')).toBe(MAX_COLUMN_NAME_LENGTH.toString());
	});

	it('should allow selecting different column types', async () => {
		const { openPopover, setColumnName, selectType, getSubmitButton, submit } = setup();
		await openPopover();
		await setColumnName('numberColumn');
		await selectType('number');
		await waitFor(() => {
			expect(getSubmitButton()).not.toBeDisabled();
		});
		await submit();

		await waitFor(() => {
			expect(addColumnHandler).toHaveBeenCalledWith({
				name: 'numberColumn',
				type: 'number',
			});
		});
	});

	it('should reset form after successful submission', async () => {
		const { getNameInput, openPopover, setColumnName, getSubmitButton, submit } = setup();
		await openPopover();
		await setColumnName('testColumn');
		await waitFor(() => {
			expect(getSubmitButton()).not.toBeDisabled();
		});
		await submit();

		// Wait for popover to close
		await waitFor(() => {
			expect(addColumnHandler).toHaveBeenCalled();
		});

		// Click button again to open popover
		await openPopover();

		await waitFor(() => {
			expect(getNameInput().value).toBe('');
		});
	});

	it('should close popover after successful submission', async () => {
		const { queryByTestId, openPopover, setColumnName, getSubmitButton, submit } = setup();
		await openPopover();
		await setColumnName('testColumn');
		await waitFor(() => {
			expect(getSubmitButton()).not.toBeDisabled();
		});
		await submit();

		await waitFor(() => {
			expect(queryByTestId('add-column-popover-content')).not.toBeInTheDocument();
		});
	});

	it('should not close popover if submission fails', async () => {
		const { getByTestId, openPopover, setColumnName, getSubmitButton, submit } = setup();
		addColumnHandler.mockResolvedValueOnce({
			success: false,
			error: 'Column name already exists',
		});
		await openPopover();
		await setColumnName('testColumn');
		await waitFor(() => {
			expect(getSubmitButton()).not.toBeDisabled();
		});
		await submit();

		await waitFor(() => {
			expect(getByTestId('add-column-popover-content')).toBeInTheDocument();
		});
	});

	it('should allow submission with Enter key', async () => {
		const { getNameInput, openPopover } = setup();
		await openPopover();
		await user.clear(getNameInput());
		await user.type(getNameInput(), 'enterColumn{Enter}');

		await waitFor(() => {
			expect(addColumnHandler).toHaveBeenCalledWith({
				name: 'enterColumn',
				type: 'string',
			});
		});
	});

	it('should display all column type options', async () => {
		const { getByRole, getByText, openPopover } = setup();
		await openPopover();
		await user.click(getByRole('combobox'));

		await waitFor(() => {
			expect(getByText('string')).toBeInTheDocument();
			expect(getByText('number')).toBeInTheDocument();
			expect(getByText('boolean')).toBeInTheDocument();
			expect(getByText('datetime')).toBeInTheDocument();
		});
	});

	it('should set value to "date" when selecting "datetime" option', async () => {
		const { openPopover, setColumnName, selectType, getSubmitButton, submit } = setup();
		await openPopover();
		await setColumnName('dateColumn');
		await selectType('datetime');
		await waitFor(() => {
			expect(getSubmitButton()).not.toBeDisabled();
		});
		await submit();

		await waitFor(() => {
			expect(addColumnHandler).toHaveBeenCalledWith({
				name: 'dateColumn',
				type: 'date',
			});
		});
	});

	it('should show tooltip with error description', async () => {
		const { getByText, getByTestId, openPopover, setColumnName } = setup();
		await openPopover();
		await setColumnName('-invalid');

		await waitFor(() => {
			expect(getByText('Invalid column name')).toBeInTheDocument();
			// Check for help icon that shows tooltip
			const helpIcon = getByTestId('add-column-error-help-icon');
			expect(helpIcon).toBeInTheDocument();
		});
	});

	it('should clear error state when reopening popover after failed submission', async () => {
		const {
			getByText,
			queryByText,
			openPopover,
			closePopover,
			setColumnName,
			submit,
			getSubmitButton,
		} = setup();
		addColumnHandler.mockResolvedValueOnce({
			success: false,
			errorMessage: 'Connection error',
		});

		// Open popover
		await openPopover();
		await setColumnName('testColumn');
		await waitFor(() => {
			expect(getSubmitButton()).not.toBeDisabled();
		});

		// Submit and trigger error
		await submit();

		// Verify error is shown and button is disabled
		await waitFor(() => {
			expect(getByText('Error adding column')).toBeInTheDocument();
			expect(getSubmitButton()).toBeDisabled();
		});

		await closePopover();

		await openPopover();

		await waitFor(() => {
			expect(queryByText('Error adding column')).not.toBeInTheDocument();
		});

		// Verify button is usable again after entering valid name
		await setColumnName('newColumn');
		await waitFor(() => {
			expect(getSubmitButton()).not.toBeDisabled();
		});
	});
});
