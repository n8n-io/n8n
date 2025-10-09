import {
	useDataTableOperations,
	type UseDataTableOperationsParams,
} from '@/features/dataTable/composables/useDataTableOperations';
import { ref } from 'vue';
import type { GridApi } from 'ag-grid-community';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';

vi.mock('@/features/dataTable/dataTable.store', () => ({
	useDataTableStore: vi.fn(() => ({})),
}));

describe('useDataTableOperations', () => {
	let params: UseDataTableOperationsParams;
	let dataTableStore: ReturnType<typeof useDataTableStore>;
	beforeEach(() => {
		setActivePinia(createTestingPinia());

		dataTableStore = {
			addDataTableColumn: vi.fn(),
			deleteDataTableColumn: vi.fn(),
			moveDataTableColumn: vi.fn(),
			deleteRows: vi.fn(),
			insertEmptyRow: vi.fn(),
		} as unknown as ReturnType<typeof useDataTableStore>;

		vi.mocked(useDataTableStore).mockReturnValue(dataTableStore);

		params = {
			colDefs: ref([]),
			rowData: ref([]),
			deleteGridColumn: vi.fn(),
			addGridColumn: vi.fn(),
			setGridData: vi.fn(),
			insertGridColumnAtIndex: vi.fn(),
			moveGridColumn: vi.fn(),
			dataTableId: 'test',
			projectId: 'test',
			gridApi: ref(null as unknown as GridApi),
			totalItems: ref(0),
			setTotalItems: vi.fn(),
			ensureItemOnPage: vi.fn(),
			focusFirstEditableCell: vi.fn(),
			toggleSave: vi.fn(),
			currentPage: ref(1),
			pageSize: ref(10),
			currentSortBy: ref(''),
			currentSortOrder: ref(null),
			handleClearSelection: vi.fn(),
			selectedRowIds: ref(new Set()),
			handleCopyFocusedCell: vi.fn(),
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('onAddColumn', () => {
		it('should raise error when column is not added', async () => {
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				addDataTableColumn: vi.fn().mockRejectedValue(new Error('test')),
			});
			const { onAddColumn } = useDataTableOperations(params);
			const result = await onAddColumn({ name: 'test', type: 'string' });
			expect(result.success).toBe(false);
		});

		it('should add column when column is added', async () => {
			const returnedColumn = { name: 'test', type: 'string' } as const;
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				addDataTableColumn: vi.fn().mockResolvedValue(returnedColumn),
			});
			const rowData = ref([{ id: 1 }]);
			const { onAddColumn } = useDataTableOperations({ ...params, rowData });
			const result = await onAddColumn({ name: returnedColumn.name, type: returnedColumn.type });
			expect(result.success).toBe(true);
			expect(params.setGridData).toHaveBeenCalledWith({ rowData: [{ id: 1, test: null }] });
			expect(params.addGridColumn).toHaveBeenCalledWith(returnedColumn);
		});
	});
});
