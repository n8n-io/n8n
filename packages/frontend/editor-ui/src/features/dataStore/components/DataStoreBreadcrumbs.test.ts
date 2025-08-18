import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';
import DataStoreBreadcrumbs from '@/features/dataStore/components/DataStoreBreadcrumbs.vue';
import type { DataStore } from '@/features/dataStore/datastore.types';

const mockRouter = {
	push: vi.fn(),
};

const mockToast = {
	showError: vi.fn(),
};

const mockUpdateDataStore = vi.fn();

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

vi.mock('@/features/dataStore/dataStore.store', () => ({
	useDataStoreStore: () => ({
		updateDataStore: mockUpdateDataStore,
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => {
			const translations: Record<string, string> = {
				'dataStore.dataStores': 'Data Stores',
				'dataStore.add.input.name.label': 'Data store name',
				'dataStore.rename.error': 'Something went wrong while renaming the data store.',
				'generic.unknownError': 'Something went wrong',
			};
			return translations[key] || key;
		},
	}),
}));

const mockDataStore: DataStore = {
	id: '1',
	name: 'Test DataStore',
	sizeBytes: 1024,
	recordCount: 100,
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

const mockDataStoreWithoutProject: DataStore = {
	...mockDataStore,
	project: undefined,
};

const renderComponent = createComponentRenderer(DataStoreBreadcrumbs, {
	props: {
		dataStore: mockDataStore,
	},
});

describe('DataStoreBreadcrumbs', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateDataStore.mockResolvedValue(true);
	});

	describe('Breadcrumbs rendering', () => {
		it('should render breadcrumbs with project data', () => {
			const { getByText, getAllByText } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			expect(getByText('Data Stores')).toBeInTheDocument();
			const separators = getAllByText('›');
			expect(separators.length).toBeGreaterThan(0);
		});

		it('should render breadcrumbs component when project is null', () => {
			const { container } = renderComponent({
				props: {
					dataStore: mockDataStoreWithoutProject,
				},
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			// Should still render the breadcrumbs container even without project
			const breadcrumbsContainer = container.querySelector('.data-store-breadcrumbs');
			expect(breadcrumbsContainer).toBeInTheDocument();
		});

		it('should render inline text edit for datastore name', () => {
			const { getByTestId } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const nameInput = getByTestId('datastore-header-name-input');
			expect(nameInput).toBeInTheDocument();
		});

		it('should render DataStoreActions component', () => {
			const { container } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const actionsComponent = container.querySelector('[data-test-id="data-store-card-actions"]');
			expect(actionsComponent).toBeInTheDocument();
		});
	});

	describe('Navigation', () => {
		it('should navigate to datastores list when breadcrumb item is clicked', async () => {
			const { getByText } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const datastoresLink = getByText('Data Stores');
			await userEvent.click(datastoresLink);

			expect(mockRouter.push).toHaveBeenCalledWith('/projects/project-1/datastores');
		});

		it('should render DataStoreActions component that can trigger navigation', () => {
			const { container } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			// Verify DataStoreActions component is rendered
			const actionsComponent = container.querySelector('[data-test-id="data-store-card-actions"]');
			expect(actionsComponent).toBeInTheDocument();
		});
	});

	describe('Name editing', () => {
		it('should show current datastore name', () => {
			const { getByDisplayValue } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			expect(getByDisplayValue('Test DataStore')).toBeInTheDocument();
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
			const breadcrumbsContainer = container.querySelector('.data-store-breadcrumbs');
			expect(breadcrumbsContainer).toBeInTheDocument();

			// Check name input
			const nameInput = getByTestId('datastore-header-name-input');
			expect(nameInput).toBeInTheDocument();

			// Check actions component
			const actionsComponent = container.querySelector('[data-test-id="data-store-card-actions"]');
			expect(actionsComponent).toBeInTheDocument();
		});

		it('should display correct datastore name', () => {
			const { getByDisplayValue } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			expect(getByDisplayValue('Test DataStore')).toBeInTheDocument();
		});

		it('should show breadcrumbs separator', () => {
			const { getAllByText } = renderComponent({
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			const separators = getAllByText('›');
			expect(separators.length).toBeGreaterThan(0);
		});
	});
});
