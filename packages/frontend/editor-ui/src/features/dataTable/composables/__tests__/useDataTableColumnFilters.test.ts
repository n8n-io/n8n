import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, type Ref } from 'vue';
import { useDataTableColumnFilters } from '../useDataTableColumnFilters';
import type { ColDef, GridApi } from 'ag-grid-community';

describe('useDataTableColumnFilters', () => {
	let mockGridApi: GridApi;
	let colDefs: Ref<ColDef[]>;

	beforeEach(() => {
		mockGridApi = {
			setGridOption: vi.fn(),
			getFilterModel: vi.fn(),
		} as unknown as GridApi;

		colDefs = ref([
			{ field: 'name', colId: 'name' },
			{ field: 'age', colId: 'age' },
			{ field: 'add-column', colId: 'add-column' },
		]);
	});

	describe('onFilterChanged', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should process text filters', () => {
			const gridApi = ref(mockGridApi);
			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi,
				colDefs,
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
			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi,
				colDefs,
			});

			mockGridApi.getFilterModel = vi.fn().mockReturnValue({});

			onFilterChanged();

			expect(currentFilterJSON.value).toBeUndefined();
		});
	});

	describe('hasActiveFilters', () => {
		it('should be false when no filters are active', () => {
			const gridApi = ref(mockGridApi);
			const { hasActiveFilters } = useDataTableColumnFilters({
				gridApi,
				colDefs,
			});

			expect(hasActiveFilters.value).toBe(false);
		});

		it('should be true when filters are active', () => {
			const gridApi = ref(mockGridApi);
			const { onFilterChanged, hasActiveFilters } = useDataTableColumnFilters({
				gridApi,
				colDefs,
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
