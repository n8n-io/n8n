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
			const { container } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			// Verify DataTableActions component is rendered
			const actionsComponent = container.querySelector('[data-test-id="data-table-card-actions"]');
			expect(actionsComponent).toBeInTheDocument();
		});
	});

	describe('Name editing', () => {
		it('should show current data table name', () => {
			const { getByDisplayValue } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			expect(getByDisplayValue('Test DataTable')).toBeInTheDocument();
		});
	});

	describe('Component integration', () => {
		it('should render component structure correctly', () => {
			const { container, getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			// Check main structure
			const breadcrumbsContainer = container.querySelector('.data-table-breadcrumbs');
			expect(breadcrumbsContainer).toBeInTheDocument();

			// Check name input
			const nameInput = getByTestId('data-table-header-name-input');
			expect(nameInput).toBeInTheDocument();

			// Check actions component
			const actionsComponent = container.querySelector('[data-test-id="data-table-card-actions"]');
			expect(actionsComponent).toBeInTheDocument();
		});

		it('should display correct data table name', () => {
			const { getByDisplayValue } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			expect(getByDisplayValue('Test DataTable')).toBeInTheDocument();
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
});
