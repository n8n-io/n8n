import { ref } from 'vue';
import type { GridApi, IRowNode } from 'ag-grid-community';
import { useDataTableSelection } from './useDataTableSelection';

const createMockGridApi = () =>
	({
		getSelectedNodes: vi.fn(),
		deselectAll: vi.fn(),
	}) as unknown as GridApi;

describe('useDataTableSelection', () => {
	let mockGridApi: GridApi;

	beforeEach(() => {
		mockGridApi = createMockGridApi();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('onSelectionChanged', () => {
		it('should update selectedRowIds with numeric IDs from selected nodes', () => {
			const gridApi = ref(mockGridApi);
			const { selectedRowIds, onSelectionChanged } = useDataTableSelection({ gridApi });

			const mockSelectedNodes = [{ data: { id: 1 } }, { data: { id: 2 } }, { data: { id: 3 } }];

			vi.mocked(mockGridApi.getSelectedNodes).mockReturnValue(mockSelectedNodes as IRowNode[]);

			onSelectionChanged();

			expect(selectedRowIds.value).toEqual(new Set([1, 2, 3]));
		});

		it('should filter out non-numeric IDs', () => {
			const gridApi = ref(mockGridApi);
			const { selectedRowIds, onSelectionChanged } = useDataTableSelection({ gridApi });

			const mockSelectedNodes = [
				{ data: { id: 1 } },
				{ data: { id: 'string-id' } },
				{ data: { id: 2 } },
				{ data: { id: null } },
				{ data: { id: undefined } },
			];

			vi.mocked(mockGridApi.getSelectedNodes).mockReturnValue(mockSelectedNodes as IRowNode[]);

			onSelectionChanged();

			expect(selectedRowIds.value).toEqual(new Set([1, 2]));
		});

		it('should update selectedCount reactively', () => {
			const gridApi = ref(mockGridApi);
			const { selectedCount, onSelectionChanged } = useDataTableSelection({ gridApi });

			const mockSelectedNodes = [{ data: { id: 1 } }, { data: { id: 2 } }, { data: { id: 3 } }];

			vi.mocked(mockGridApi.getSelectedNodes).mockReturnValue(mockSelectedNodes as IRowNode[]);

			onSelectionChanged();

			expect(selectedCount.value).toBe(3);
		});
	});

	describe('handleClearSelection', () => {
		it('should clear selectedRowIds and call deselectAll on grid', () => {
			const gridApi = ref(mockGridApi);
			const { selectedRowIds, handleClearSelection, onSelectionChanged } = useDataTableSelection({
				gridApi,
			});

			// First select some rows
			const mockSelectedNodes = [{ data: { id: 1 } }, { data: { id: 2 } }];
			vi.mocked(mockGridApi.getSelectedNodes).mockReturnValue(mockSelectedNodes as IRowNode[]);
			onSelectionChanged();
			expect(selectedRowIds.value).toEqual(new Set([1, 2]));

			// Clear selection
			handleClearSelection();

			expect(selectedRowIds.value).toEqual(new Set());
			expect(mockGridApi.deselectAll).toHaveBeenCalledTimes(1);
		});
	});
});
