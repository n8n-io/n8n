import { createComponentRenderer } from '@/__tests__/render';
import DataStoreDetailsView from '@/features/dataStore/DataStoreDetailsView.vue';
import { createTestingPinia } from '@pinia/testing';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useToast } from '@/composables/useToast';
import { useRouter } from 'vue-router';
import type { DataStore } from '@/features/dataStore/datastore.types';
import { waitFor } from '@testing-library/vue';

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
			'dataStore.getDetails.error': 'Error fetching data store details',
			'dataStore.notFound': 'Data store not found',
			'dataStore.dataStores': 'Data Stores',
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

const DEFAULT_DATA_STORE: DataStore = {
	id: 'ds1',
	name: 'Test Data Store',
	sizeBytes: 2048,
	columns: [
		{ id: '1', name: 'id', type: 'string', index: 0 },
		{ id: '2', name: 'name', type: 'string', index: 1 },
	],
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	projectId: 'proj1',
};

const renderComponent = createComponentRenderer(DataStoreDetailsView, {
	props: {
		id: 'ds1',
		projectId: 'proj1',
	},
	global: {
		stubs: {
			DataStoreBreadcrumbs: true,
			DataStoreTable: true,
		},
	},
});

describe('DataStoreDetailsView', () => {
	beforeEach(() => {
		(useToast as ReturnType<typeof vi.fn>).mockReturnValue(mockToast);
		(useRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
		vi.clearAllMocks();
	});

	describe('Loading states', () => {
		it('should show loading state initially', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataStoreStore = useDataStoreStore();
			vi.spyOn(dataStoreStore, 'fetchOrFindDataStore').mockImplementation(
				async () => await new Promise(() => {}),
			);

			const { getByTestId } = renderComponent({ pinia });

			await waitFor(() => {
				expect(getByTestId('data-store-details-loading')).toBeInTheDocument();
			});
		});

		it('should hide loading state after successful data fetch', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataStoreStore = useDataStoreStore();
			vi.spyOn(dataStoreStore, 'fetchOrFindDataStore').mockResolvedValue(DEFAULT_DATA_STORE);

			const { queryByTestId } = renderComponent({ pinia });

			await waitFor(() => {
				expect(queryByTestId('data-store-details-loading')).not.toBeInTheDocument();
			});
		});

		it('should hide loading state after error', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataStoreStore = useDataStoreStore();
			vi.spyOn(dataStoreStore, 'fetchOrFindDataStore').mockRejectedValue(new Error('Failed'));

			const { queryByTestId } = renderComponent({ pinia });

			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalled();
			});

			await waitFor(() => {
				expect(queryByTestId('data-store-details-loading')).not.toBeInTheDocument();
			});
		});
	});

	describe('Data rendering', () => {
		it('should render breadcrumbs and table when data is loaded', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataStoreStore = useDataStoreStore();
			vi.spyOn(dataStoreStore, 'fetchOrFindDataStore').mockResolvedValue(DEFAULT_DATA_STORE);

			const { container } = renderComponent({ pinia });

			await waitFor(() => {
				expect(container.querySelector('data-store-breadcrumbs-stub')).toBeInTheDocument();
				expect(container.querySelector('data-store-table-stub')).toBeInTheDocument();
			});
		});

		it('should not render content when data store is null', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataStoreStore = useDataStoreStore();
			vi.spyOn(dataStoreStore, 'fetchOrFindDataStore').mockResolvedValue(null);

			const { container } = renderComponent({ pinia });

			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalled();
			});

			expect(container.querySelector('data-store-breadcrumbs-stub')).not.toBeInTheDocument();
			expect(container.querySelector('data-store-table-stub')).not.toBeInTheDocument();
		});
	});

	describe('Error handling', () => {
		it('should show error and redirect when data store not found', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataStoreStore = useDataStoreStore();
			vi.spyOn(dataStoreStore, 'fetchOrFindDataStore').mockResolvedValue(null);

			renderComponent({ pinia });

			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalled();
				expect(mockRouter.push).toHaveBeenCalled();
			});
		});

		it('should handle API errors', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const dataStoreStore = useDataStoreStore();
			const error = new Error('API Error');
			vi.spyOn(dataStoreStore, 'fetchOrFindDataStore').mockRejectedValue(error);

			renderComponent({ pinia });

			await waitFor(() => {
				expect(mockToast.showError).toHaveBeenCalledWith(
					error,
					'Error fetching data store details',
				);
				expect(mockRouter.push).toHaveBeenCalled();
			});
		});
	});
});
