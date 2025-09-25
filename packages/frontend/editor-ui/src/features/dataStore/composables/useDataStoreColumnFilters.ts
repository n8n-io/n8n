import { computed, ref, type Ref } from 'vue';
import type { ColDef, GridApi } from 'ag-grid-community';
import type { DataStoreRow } from '@/features/dataStore/datastore.types';
import type {
	BackendFilter,
	BackendFilterRecord,
	FilterModel,
} from '../types/dataStoreFilters.types';
import { GRID_FILTER_CONFIG, isSpecialColumn } from '../utils/filterMappings';
import {
	processTextFilter,
	processNumberFilter,
	processDateFilter,
} from '../utils/filterProcessors';

export type UseDataStoreColumnFiltersParams = {
	gridApi: Ref<GridApi>;
	colDefs: Ref<ColDef[]>;
	setGridData: (params: { rowData?: DataStoreRow[]; colDefs?: ColDef[] }) => void;
};

const EMPTY_BACKEND_FILTER: BackendFilter = { type: 'or', filters: [] };
export const useDataStoreColumnFilters = ({
	gridApi,
	colDefs,
	setGridData,
}: UseDataStoreColumnFiltersParams) => {
	const currentBEFilters = ref<BackendFilter>(EMPTY_BACKEND_FILTER);

	const initializeFilters = () => {
		gridApi.value.setGridOption('defaultColDef', GRID_FILTER_CONFIG.defaultColDef);

		const updated = colDefs.value.map((def) => {
			const colId = def.colId ?? def.field;
			if (!colId) return def;
			if (isSpecialColumn(colId)) {
				return { ...def, filter: false };
			}
			return def;
		});
		colDefs.value = updated;
		setGridData({ colDefs: updated });
	};

	function convertAgModelToBackend(model: FilterModel, defs: ColDef[]): BackendFilter | undefined {
		const allFilters: BackendFilterRecord[] = [];

		const colIdToField = new Map<string, string>();
		defs.forEach((d) => {
			if (d.colId && d.field) colIdToField.set(d.colId, d.field);
			else if (d.field) colIdToField.set(d.field, d.field);
		});

		for (const [key, filter] of Object.entries(model)) {
			const colField = colIdToField.get(key) ?? key;
			const filterType = filter.filterType || filter.type;
			if (!filterType) continue;

			switch (filter.filterType) {
				case 'text':
					allFilters.push(processTextFilter(filter, colField));
					break;
				case 'number':
					allFilters.push(...processNumberFilter(filter, colField));
					break;
				case 'date':
					allFilters.push(...processDateFilter(filter, colField));
					break;
				default:
					break;
			}
		}

		if (allFilters.length === 0) return undefined;
		return { type: 'and', filters: allFilters };
	}

	const onFilterChanged = () => {
		const model = gridApi.value.getFilterModel();
		const backend = convertAgModelToBackend(model, colDefs.value);
		currentBEFilters.value = backend ?? EMPTY_BACKEND_FILTER;
	};

	const hasActiveFilters = computed(() => Boolean(currentBEFilters.value));

	return {
		initializeFilters,
		onFilterChanged,
		currentBEFilters,
		hasActiveFilters,
	};
};
