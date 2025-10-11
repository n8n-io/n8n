import { createComponentRenderer } from '@/__tests__/render';
import DataTableDetailsView from '@/features/dataTable/DataTableDetailsView.vue';
import { createTestingPinia } from '@pinia/testing';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';
import { useToast } from '@/composables/useToast';
import { useRouter } from 'vue-router';
import type { DataTable } from '@/features/dataTable/dataTable.types';
import { waitFor, fireEvent } from '@testing-library/vue';

vi.mock('@/composables/useToast');
vi.mock('vue-router');
vi.mock('@/composables/useDocumentTitle', () => ({
	useDocumentTitle: vi.fn(() => ({
		set: vi.fn(),
	})),
}));
vi.mock('@n8n/i18n', () => {
	const baseText = (key: string) => {
		const translations: Record<string, string> = {
			'dataTable.getDetails.error': 'Error fetching data table details',
			'dataTable.notFound': 'Data table not found',
			'dataTable.dataTables': 'Data Tables',
		};
		return translations[key] || key;
	};
	return {
		useI18n: () => ({ baseText }),
		i18n: { baseText },
		i18nInstance: {
			global: {
				t: baseText,
				te: () => true,
			},
		},
	};
});

const mockRouter = {
	push: vi.fn(),
};

const mockToast = {
	showError: vi.fn(),
};

const DEFAULT_DATA_TABLE: DataTable = {
	id: 'ds1',
	name: 'Test Data Table',
	sizeBytes: 2048,
	columns: [
		{ id: '1', name: 'id', type: 'string', index: 0 },
		{ id: '2', name: 'name', type: 'string', index: 1 },
	],
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	projectId: 'proj1',
};

const mockRefresh = vi.fn().mockResolvedValue(DEFAULT_DATA_TABLE);

const renderComponent = createComponentRenderer(DataTableDetailsView, {
	props: {
		id: 'ds1',
		projectId: 'proj1',
	},
	global: {
		stubs: {
			DataTableBreadcrumbs: true,
			DataTableTable: {
				template: '<div data-testid="data-table-table"><slot /></div>',
				methods: {
					addColumn: vi.fn(),
					addRow: vi.fn(),
					refreshData: mockRefresh,
				},
				data: () => ({ gridData: [] }),
			},
		},
	},
});

describe('DataTableDetailsView', () => {
	beforeEach(() => {
		(useToast as ReturnType<typeof vi.fn>).mockReturnValue(mockToast);
		(useRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
		vi.clearAllMocks();
	});

	describe('Loading states', () => {
		it('should show loading state initially', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataTableStore = useDataTableStore();
			vi.spyOn(dataTableStore, 'fetchOrFindDataTable').mockImplementation(
				async () => await new Promise(() => {}),
			);

			const { getByTestId } = renderComponent({ pinia });

			await waitFor(() => {
				expect(getByTestId('data-table-details-loading')).toBeInTheDocument();
			});
		});

		it('should hide loading state after successful data fetch', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataTableStore = useDataTableStore();
			vi.spyOn(dataTableStore, 'fetchOrFindDataTable').mockResolvedValue(DEFAULT_DATA_TABLE);

			const { queryByTestId } = renderComponent({ pinia });

			await waitFor(() => {
				expect(queryByTestId('data-table-details-loading')).not.toBeInTheDocument();
			});
		});

		it('should hide loading state after error', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataTableStore = useDataTableStore();
			vi.spyOn(dataTableStore, 'fetchOrFindDataTable').mockRejectedValue(new Error('Failed'));

			const { queryByTestId } = renderComponent({ pinia });

			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalled();
			});

			await waitFor(() => {
				expect(queryByTestId('data-table-details-loading')).not.toBeInTheDocument();
			});
		});
	});

	describe('Data rendering', () => {
		it('should render breadcrumbs and table when data is loaded', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataTableStore = useDataTableStore();
			vi.spyOn(dataTableStore, 'fetchOrFindDataTable').mockResolvedValue(DEFAULT_DATA_TABLE);

			const { container } = renderComponent({ pinia });

			await waitFor(() => {
				expect(container.querySelector('data-table-breadcrumbs-stub')).toBeInTheDocument();
				expect(container.querySelector('[data-testid="data-table-table"]')).toBeInTheDocument();
			});
		});

		it('should not render content when data store is null', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataTableStore = useDataTableStore();
			vi.spyOn(dataTableStore, 'fetchOrFindDataTable').mockResolvedValue(null);

			const { container } = renderComponent({ pinia });

			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalled();
			});

			expect(container.querySelector('data-table-breadcrumbs-stub')).not.toBeInTheDocument();
			expect(container.querySelector('data-table-table-stub')).not.toBeInTheDocument();
		});
	});

	describe('Error handling', () => {
		it('should show error and redirect when data store not found', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataTableStore = useDataTableStore();
			vi.spyOn(dataTableStore, 'fetchOrFindDataTable').mockResolvedValue(null);

			renderComponent({ pinia });

			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalled();
				expect(mockRouter.push).toHaveBeenCalled();
			});
		});

		it('should handle API errors', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataTableStore = useDataTableStore();
			const error = new Error('API Error');
			vi.spyOn(dataTableStore, 'fetchOrFindDataTable').mockRejectedValue(error);

			renderComponent({ pinia });

			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalledWith(
					error,
					'Error fetching data table details',
				);
				expect(mockRouter.push).toHaveBeenCalled();
			});
		});
	});

	describe('Actions', () => {
		it('should handle refresh action', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataTableStore = useDataTableStore();
			vi.spyOn(dataTableStore, 'fetchOrFindDataTable').mockResolvedValue(DEFAULT_DATA_TABLE);

			const { findByRole } = renderComponent({ pinia });

			const refreshButton = await findByRole('button', { name: 'refresh' });

			expect(refreshButton).toBeInTheDocument();
			expect(dataTableStore.fetchOrFindDataTable).toHaveBeenCalledTimes(1);

			await fireEvent.click(refreshButton);

			expect(mockRefresh).toHaveBeenCalledTimes(1);
		});
	});
});
