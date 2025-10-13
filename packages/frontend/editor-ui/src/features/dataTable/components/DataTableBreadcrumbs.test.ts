import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';
import DataTableBreadcrumbs from '@/features/dataTable/components/DataTableBreadcrumbs.vue';
import type { DataTable } from '@/features/dataTable/dataTable.types';

const mockRouter = {
	push: vi.fn(),
};

const mockToast = {
	showError: vi.fn(),
};

const mockUpdateDataTable = vi.fn();

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...(actual as object),
		useRouter: () => mockRouter,
	};
});

vi.mock('@/composables/useToast', () => ({
	useToast: () => mockToast,
}));

vi.mock('@/features/dataTable/dataTable.store', () => ({
	useDataTableStore: () => ({
		updateDataTable: mockUpdateDataTable,
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => {
			const translations: Record<string, string> = {
				'dataTable.dataTables': 'Data Tables',
				'dataTable.add.input.name.label': 'Data table name',
				'dataTable.rename.error': 'Something went wrong while renaming the data table.',
				'generic.unknownError': 'Something went wrong',
			};
			return translations[key] || key;
		},
	}),
}));

const mockDataTable: DataTable = {
	id: '1',
	name: 'Test DataTable',
	sizeBytes: 1024,
	columns: [],
	createdAt: '2023-01-01T00:00:00.000Z',
	updatedAt: '2023-01-01T00:00:00.000Z',
	projectId: 'project-1',
	project: {
		id: 'project-1',
		name: 'Test Project',
		type: 'personal',
		icon: { type: 'icon', value: 'projects' },
		createdAt: '2023-01-01T00:00:00.000Z',
		updatedAt: '2023-01-01T00:00:00.000Z',
		relations: [],
		scopes: [],
	},
};

const mockDataTableWithoutProject: DataTable = {
	...mockDataTable,
	project: undefined,
};

const renderComponent = createComponentRenderer(DataTableBreadcrumbs, {
	props: {
		dataTable: mockDataTable,
	},
});

describe('DataTableBreadcrumbs', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateDataTable.mockResolvedValue(true);
	});

	describe('Breadcrumbs rendering', () => {
		it('should render breadcrumbs with project data', () => {
			const { getByText, getAllByText } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			expect(getByText('Data Tables')).toBeInTheDocument();
			const separators = getAllByText('/');
			expect(separators.length).toBeGreaterThan(0);
		});

		it('should render breadcrumbs component when project is null', () => {
			const { container } = renderComponent({
				props: {
					dataTable: mockDataTableWithoutProject,
				},
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			// Should still render the breadcrumbs container even without project
			const breadcrumbsContainer = container.querySelector('.data-table-breadcrumbs');
			expect(breadcrumbsContainer).toBeInTheDocument();
		});

		it('should render inline text edit for data table name', () => {
			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const nameInput = getByTestId('data-table-header-name-input');
			expect(nameInput).toBeInTheDocument();
		});

		it('should render DataTableActions component', () => {
			const { container } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const actionsComponent = container.querySelector('[data-test-id="data-table-card-actions"]');
			expect(actionsComponent).toBeInTheDocument();
		});
	});

	describe('Navigation', () => {
		it('should navigate to data tables list when breadcrumb item is clicked', async () => {
			const { getByText } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const dataTablesLink = getByText('Data Tables');
			await userEvent.click(dataTablesLink);

			expect(mockRouter.push).toHaveBeenCalledWith('/projects/project-1/datatables');
		});

		it('should render DataTableActions component that can trigger navigation', () => {
			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			// Verify DataTableActions component is rendered
			const actionsComponent = getByTestId('data-table-card-actions');
			expect(actionsComponent).toBeInTheDocument();
		});
	});

	describe('Name editing', () => {
		it('should show current data table name in preview', () => {
			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const preview = getByTestId('inline-edit-preview');
			expect(preview).toBeInTheDocument();
			expect(preview).toHaveTextContent('Test DataTable');
		});

		it('should have editable name input with correct attributes', () => {
			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const input = getByTestId('inline-edit-input');
			expect(input).toBeInTheDocument();
			expect(input).toHaveAttribute('maxlength', '30');
			expect(input).toHaveValue('Test DataTable');
		});

		it('should render placeholder for name input', () => {
			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const input = getByTestId('inline-edit-input');
			expect(input).toHaveAttribute('placeholder', 'Data table name');
		});

		it('should call updateDataTable when name is changed and submitted', async () => {
			mockUpdateDataTable.mockResolvedValue({ id: '1', name: 'Renamed Table' });

			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			// Click to activate edit mode
			const editableArea = getByTestId('inline-editable-area');
			await userEvent.click(editableArea);

			// Type new name
			const input = getByTestId('inline-edit-input');
			await userEvent.clear(input);
			await userEvent.type(input, 'Renamed Table{Enter}');

			// Check that updateDataTable was called
			expect(mockUpdateDataTable).toHaveBeenCalledWith('1', 'Renamed Table', 'project-1');
		});

		it('should show error toast when rename fails', async () => {
			mockUpdateDataTable.mockRejectedValue(new Error('Update failed'));

			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const editableArea = getByTestId('inline-editable-area');
			await userEvent.click(editableArea);

			const input = getByTestId('inline-edit-input');
			await userEvent.clear(input);
			await userEvent.type(input, 'Failed Name{Enter}');

			expect(mockToast.showError).toHaveBeenCalled();
		});

		it('should revert to original name when update returns null', async () => {
			mockUpdateDataTable.mockResolvedValue(null);

			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const editableArea = getByTestId('inline-editable-area');
			await userEvent.click(editableArea);

			const input = getByTestId('inline-edit-input');
			await userEvent.clear(input);
			await userEvent.type(input, 'Invalid Name{Enter}');

			expect(mockToast.showError).toHaveBeenCalled();
		});

		it('should not call updateDataTable when name is empty', async () => {
			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const editableArea = getByTestId('inline-editable-area');
			await userEvent.click(editableArea);

			const input = getByTestId('inline-edit-input');
			await userEvent.clear(input);
			await userEvent.type(input, '{Enter}');

			expect(mockUpdateDataTable).not.toHaveBeenCalled();
		});

		it('should not call updateDataTable when name is unchanged', async () => {
			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const editableArea = getByTestId('inline-editable-area');
			await userEvent.click(editableArea);

			const input = getByTestId('inline-edit-input');
			await userEvent.type(input, '{Enter}');

			expect(mockUpdateDataTable).not.toHaveBeenCalled();
		});
	});

	describe('Component integration', () => {
		it('should render component structure correctly', () => {
			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			// Check name input
			const nameInput = getByTestId('data-table-header-name-input');
			expect(nameInput).toBeInTheDocument();

			// Check actions component
			const actionsComponent = getByTestId('data-table-card-actions');
			expect(actionsComponent).toBeInTheDocument();
		});

		it('should display correct data table name', () => {
			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const preview = getByTestId('inline-edit-preview');
			expect(preview).toHaveTextContent('Test DataTable');
		});

		it('should show breadcrumbs separator', () => {
			const { getAllByText } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const separators = getAllByText('/');
			expect(separators.length).toBeGreaterThan(0);
		});
	});

	describe('Delete functionality', () => {
		it('should render delete action component', () => {
			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const actionsComponent = getByTestId('data-table-card-actions');
			expect(actionsComponent).toBeInTheDocument();
		});
	});

	describe('Props watching', () => {
		it('should update editableName when dataTable name prop changes', async () => {
			const { rerender, getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const preview = getByTestId('inline-edit-preview');
			expect(preview).toHaveTextContent('Test DataTable');

			const updatedDataTable = {
				...mockDataTable,
				name: 'Updated Name',
			};

			await rerender({ dataTable: updatedDataTable });

			expect(preview).toHaveTextContent('Updated Name');
		});
	});
});
