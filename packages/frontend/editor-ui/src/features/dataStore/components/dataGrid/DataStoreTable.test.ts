import { createComponentRenderer } from '@/__tests__/render';
import DataStoreTable from '@/features/dataStore/components/dataGrid/DataStoreTable.vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import type { DataStore } from '@/features/dataStore/datastore.types';

// Mock ag-grid-vue3
interface MockComponentInstance {
	$emit: (event: string, payload: unknown) => void;
}

vi.mock('ag-grid-vue3', () => ({
	AgGridVue: {
		name: 'AgGridVue',
		template: '<div data-test-id="ag-grid-vue" />',
		props: ['rowData', 'columnDefs', 'defaultColDef', 'domLayout', 'animateRows', 'theme'],
		emits: ['gridReady'],
		mounted(this: MockComponentInstance) {
			this.$emit('gridReady', {
				api: {
					refreshHeader: vi.fn(),
					applyTransaction: vi.fn(),
				},
			});
		},
	},
}));

// Mock ag-grid-community modules
vi.mock('ag-grid-community', () => ({
	ModuleRegistry: {
		registerModules: vi.fn(),
	},
	ClientSideRowModelModule: {},
	TextEditorModule: {},
	LargeTextEditorModule: {},
	ColumnAutoSizeModule: {},
	CheckboxEditorModule: {},
	NumberEditorModule: {},
	RowSelectionModule: {},
	RenderApiModule: {},
	DateEditorModule: {},
	ClientSideRowModelApiModule: {},
	ValidationModule: {},
	UndoRedoEditModule: {},
}));

// Mock the n8n theme
vi.mock('@/features/dataStore/components/dataGrid/n8nTheme', () => ({
	n8nTheme: 'n8n-theme',
}));

// Mock AddColumnPopover
vi.mock('@/features/dataStore/components/dataGrid/AddColumnPopover.vue', () => ({
	default: {
		name: 'AddColumnPopover',
		template:
			'<div data-test-id="add-column-popover"><button data-test-id="data-store-add-column-button" @click="$emit(\'add-column\', { column: { name: \'newColumn\', type: \'string\' } })">Add Column</button></div>',
		props: ['dataStore'],
		emits: ['add-column'],
	},
}));

// Mock composables
vi.mock('@/composables/useToast', () => ({
	useToast: () => ({
		showError: vi.fn(),
		showSuccess: vi.fn(),
	}),
}));

vi.mock('@/features/dataStore/composables/useDataStoreTypes', () => ({
	useDataStoreTypes: () => ({
		mapToAGCellType: (type: string) => {
			const typeMap: Record<string, string> = {
				string: 'text',
				number: 'number',
				boolean: 'boolean',
				date: 'date',
			};
			return typeMap[type] || 'text';
		},
	}),
}));

const mockDataStore: DataStore = {
	id: 'test-datastore-1',
	name: 'Test DataStore',
	projectId: 'project-1',
	columns: [
		{ id: 'col1', name: 'firstName', type: 'string', index: 1 },
		{ id: 'col2', name: 'age', type: 'number', index: 2 },
		{ id: 'col3', name: 'isActive', type: 'boolean', index: 3 },
	],
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z',
	sizeBytes: 0,
	recordCount: 0,
};

describe('DataStoreTable', () => {
	const renderComponent = createComponentRenderer(DataStoreTable, {
		props: {
			dataStore: mockDataStore,
		},
	});

	let dataStoreStore: ReturnType<typeof useDataStoreStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		dataStoreStore = useDataStoreStore();
		dataStoreStore.addDataStoreColumn = vi.fn().mockResolvedValue({
			id: 'new-col',
			name: 'newColumn',
			type: 'string',
			index: 4,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Component Initialization', () => {
		it('should render the component with AG Grid and AddColumnPopover', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('ag-grid-vue')).toBeInTheDocument();
			expect(getByTestId('add-column-popover')).toBeInTheDocument();
		});

		it('should render pagination controls', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('data-store-content-pagination')).toBeInTheDocument();
		});

		it('should render add row button', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('data-store-add-row-button')).toBeInTheDocument();
		});
	});

	describe('Add Column Functionality', () => {
		it('should handle add column event from AddColumnPopover', async () => {
			const { getByTestId } = renderComponent();

			const addColumnPopover = getByTestId('add-column-popover');
			const addButton = addColumnPopover.querySelector(
				'[data-test-id="data-store-add-column-button"]',
			);

			expect(addButton).toBeInTheDocument();

			await fireEvent.click(addButton!);

			await waitFor(() => {
				expect(dataStoreStore.addDataStoreColumn).toHaveBeenCalledWith(
					mockDataStore.id,
					mockDataStore.projectId,
					{ name: 'newColumn', type: 'string' },
				);
			});
		});
	});

	describe('Empty Data Store', () => {
		it('should show grid for empty data store', () => {
			const emptyDataStore: DataStore = {
				...mockDataStore,
				columns: [],
			};

			const { getByTestId } = renderComponent({
				props: {
					dataStore: emptyDataStore,
				},
			});

			expect(getByTestId('ag-grid-vue')).toBeInTheDocument();
		});
	});
});
