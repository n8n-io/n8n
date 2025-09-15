import {
	useDataStoreOperations,
	type UseDataStoreOperationsParams,
} from '@/features/dataStore/composables/useDataStoreOperations';
import { ref } from 'vue';
import type { GridApi } from 'ag-grid-community';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';

vi.mock('@/features/dataStore/dataStore.store', () => ({
	useDataStoreStore: vi.fn(() => ({})),
}));

describe('useDataStoreOperations', () => {
	let params: UseDataStoreOperationsParams;
	let dataStoreStore: ReturnType<typeof useDataStoreStore>;
	beforeEach(() => {
		setActivePinia(createTestingPinia());

		dataStoreStore = {
			addDataStoreColumn: vi.fn(),
			deleteDataStoreColumn: vi.fn(),
			moveDataStoreColumn: vi.fn(),
			deleteRows: vi.fn(),
			insertEmptyRow: vi.fn(),
		} as unknown as ReturnType<typeof useDataStoreStore>;

		vi.mocked(useDataStoreStore).mockReturnValue(dataStoreStore);

		params = {
			colDefs: ref([]),
			rowData: ref([]),
			deleteGridColumn: vi.fn(),
			addGridColumn: vi.fn(),
			setGridData: vi.fn(),
			insertGridColumnAtIndex: vi.fn(),
			moveGridColumn: vi.fn(),
			dataStoreId: 'test',
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
			vi.mocked(useDataStoreStore).mockReturnValue({
				...dataStoreStore,
				addDataStoreColumn: vi.fn().mockRejectedValue(new Error('test')),
			});
			const { onAddColumn } = useDataStoreOperations(params);
			const result = await onAddColumn({ name: 'test', type: 'string' });
			expect(result.success).toBe(false);
		});

		it('should add column when column is added', async () => {
			const returnedColumn = { name: 'test', type: 'string' } as const;
			vi.mocked(useDataStoreStore).mockReturnValue({
				...dataStoreStore,
				addDataStoreColumn: vi.fn().mockResolvedValue(returnedColumn),
			});
			const rowData = ref([{ id: 1 }]);
			const { onAddColumn } = useDataStoreOperations({ ...params, rowData });
			const result = await onAddColumn({ name: returnedColumn.name, type: returnedColumn.type });
			expect(result.success).toBe(true);
			expect(params.setGridData).toHaveBeenCalledWith({ rowData: [{ id: 1, test: null }] });
			expect(params.addGridColumn).toHaveBeenCalledWith(returnedColumn);
		});
	});
});
