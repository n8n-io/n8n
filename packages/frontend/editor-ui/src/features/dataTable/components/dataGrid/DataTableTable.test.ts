import { createComponentRenderer } from '@/__tests__/render';
import DataTableTable from '@/features/dataTable/components/dataGrid/DataTableTable.vue';
import { createPinia, setActivePinia } from 'pinia';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';
import type { DataTable } from '@/features/dataTable/dataTable.types';

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
					setGridOption: vi.fn(),
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
	CellStyleModule: {},
	ScrollApiModule: {},
	PinnedRowModule: {},
	ColumnApiModule: {},
	TextFilterModule: {},
	NumberFilterModule: {},
	DateFilterModule: {},
	EventApiModule: {},
}));

// Mock the n8n theme
vi.mock('@/features/dataTable/components/dataGrid/n8nTheme', () => ({
	n8nTheme: 'n8n-theme',
}));

// Mock AddColumnPopover
vi.mock('@/features/dataTable/components/dataGrid/AddColumnPopover.vue', () => ({
	default: {
		name: 'AddColumnPopover',
		template:
			'<div data-test-id="add-column-popover"><button data-test-id="data-table-add-column-button" @click="$emit(\'add-column\', { column: { name: \'newColumn\', type: \'string\' } })">Add Column</button></div>',
		props: ['dataTable'],
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

vi.mock('@/features/dataTable/composables/useDataTablePagination', () => ({
	useDataTablePagination: () => ({
		totalItems: 0,
		setTotalItems: vi.fn(),
		ensureItemOnPage: vi.fn(),
		currentPage: 1,
		setCurrentPage: vi.fn(),
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => {
			const translations: Record<string, string> = {
				'dataTable.addRow.label': 'Add Row',
				'dataTable.addRow.disabled.tooltip': 'Add a column first',
			};
			return translations[key] || key;
		},
	}),
}));

vi.mock('@/features/dataTable/composables/useDataTableTypes', () => ({
	useDataTableTypes: () => ({
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

const mockDataTable: DataTable = {
	id: 'test-dataTable-1',
	name: 'Test DataTable',
	projectId: 'project-1',
	columns: [
		{ id: 'col1', name: 'firstName', type: 'string', index: 1 },
		{ id: 'col2', name: 'age', type: 'number', index: 2 },
		{ id: 'col3', name: 'isActive', type: 'boolean', index: 3 },
	],
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z',
	sizeBytes: 0,
};

describe('DataTableTable', () => {
	const renderComponent = createComponentRenderer(DataTableTable, {
		props: {
			dataTable: mockDataTable,
		},
	});

	let dataTableStore: ReturnType<typeof useDataTableStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		dataTableStore = useDataTableStore();
		dataTableStore.addDataTableColumn = vi.fn().mockResolvedValue({
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
		it('should render the component with AG Grid', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('ag-grid-vue')).toBeInTheDocument();
		});

		it('should render pagination controls', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('data-table-content-pagination')).toBeInTheDocument();
		});
	});

	describe('Empty DataTable', () => {
		it('should show grid for empty data table', () => {
			const emptyDataTable: DataTable = {
				...mockDataTable,
				columns: [],
			};

			const { getByTestId } = renderComponent({
				props: {
					dataTable: emptyDataTable,
				},
			});

			expect(getByTestId('ag-grid-vue')).toBeInTheDocument();
		});
	});
});
