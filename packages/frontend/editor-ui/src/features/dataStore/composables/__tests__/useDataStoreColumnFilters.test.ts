import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, type Ref } from 'vue';
import { useDataStoreColumnFilters } from '../useDataStoreColumnFilters';
import type { ColDef, GridApi } from 'ag-grid-community';

describe('useDataStoreColumnFilters', () => {
	let mockGridApi: GridApi;
	let mockSetGridData: ReturnType<typeof vi.fn>;
	let colDefs: Ref<ColDef[]>;

	beforeEach(() => {
		mockGridApi = {
			setGridOption: vi.fn(),
			getFilterModel: vi.fn(),
		} as unknown as GridApi;

		mockSetGridData = vi.fn();

		colDefs = ref([
			{ field: 'name', colId: 'name' },
			{ field: 'age', colId: 'age' },
			{ field: 'add-column', colId: 'add-column' },
		]);
	});

	describe('initializeFilters', () => {
		it('should disable filters for special columns', () => {
			const gridApi = ref(mockGridApi);
			const { initializeFilters } = useDataStoreColumnFilters({
				gridApi,
				colDefs,
				setGridData: mockSetGridData,
			});

			initializeFilters();

			const expectedColDefs = [
				{ field: 'name', colId: 'name' },
				{ field: 'age', colId: 'age' },
				{ field: 'add-column', colId: 'add-column', filter: false },
			];

			expect(colDefs.value).toEqual(expectedColDefs);
			expect(mockSetGridData).toHaveBeenCalledWith({ colDefs: expectedColDefs });
		});
	});

	describe('onFilterChanged', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should process text filters', () => {
			const gridApi = ref(mockGridApi);
			const { onFilterChanged, currentFilterJSON } = useDataStoreColumnFilters({
				gridApi,
				colDefs,
				setGridData: mockSetGridData,
			});

			mockGridApi.getFilterModel = vi.fn().mockReturnValue({
				name: {
					filterType: 'text',
					type: 'contains',
					filter: 'john',
				},
			});

			onFilterChanged();

			expect(currentFilterJSON.value).toBe(
				JSON.stringify({
					type: 'and',
					filters: [
						{
							columnName: 'name',
							condition: 'ilike',
							value: 'john',
						},
					],
				}),
			);
		});

		it('should return undefined when no filters', () => {
			const gridApi = ref(mockGridApi);
			const { onFilterChanged, currentFilterJSON } = useDataStoreColumnFilters({
				gridApi,
				colDefs,
				setGridData: mockSetGridData,
			});

			mockGridApi.getFilterModel = vi.fn().mockReturnValue({});

			onFilterChanged();

			expect(currentFilterJSON.value).toBeUndefined();
		});
	});

	describe('hasActiveFilters', () => {
		it('should be false when no filters are active', () => {
			const gridApi = ref(mockGridApi);
			const { hasActiveFilters } = useDataStoreColumnFilters({
				gridApi,
				colDefs,
				setGridData: mockSetGridData,
			});

			expect(hasActiveFilters.value).toBe(false);
		});

		it('should be true when filters are active', () => {
			const gridApi = ref(mockGridApi);
			const { onFilterChanged, hasActiveFilters } = useDataStoreColumnFilters({
				gridApi,
				colDefs,
				setGridData: mockSetGridData,
			});

			mockGridApi.getFilterModel = vi.fn().mockReturnValue({
				name: {
					filterType: 'text',
					type: 'contains',
					filter: 'john',
				},
			});

			onFilterChanged();

			expect(hasActiveFilters.value).toBe(true);
		});
	});
});
