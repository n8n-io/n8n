import { computed, ref, type Ref } from 'vue';
import type { ColDef, GridApi } from 'ag-grid-community';
import type { DataStoreRow } from '@/features/dataStore/datastore.types';
import type {
	BackendFilter,
	BackendFilterRecord,
	FilterModel,
} from '../types/dataStoreFilters.types';
import { GRID_FILTER_CONFIG, SPECIAL_COLUMNS } from '../utils/filterMappings';
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

export const useDataStoreColumnFilters = ({
	gridApi,
	colDefs,
	setGridData,
}: UseDataStoreColumnFiltersParams) => {
	const currentFilterJSON = ref<string | undefined>(undefined);

	const initializeFilters = () => {
		// Enable default filters for all columns via defaultColDef
		gridApi.value.setGridOption('defaultColDef', GRID_FILTER_CONFIG.defaultColDef);

		// Explicitly disable filters for special columns that shouldn't be filterable
		const updated = colDefs.value.map((def) => {
			const colId = def.colId ?? def.field;
			if (!colId) return def;
			if (SPECIAL_COLUMNS.includes(colId as (typeof SPECIAL_COLUMNS)[number])) {
				return { ...def, filter: false } as ColDef;
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
			// Skip special/internal columns
			if (SPECIAL_COLUMNS.includes(colField as (typeof SPECIAL_COLUMNS)[number])) continue;

			const filterType: string | undefined = filter?.filterType || filter?.type;
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
					// Unrecognized filter type; skip
					break;
			}
		}

		if (allFilters.length === 0) return undefined;
		return { type: 'and', filters: allFilters };
	}

	const onFilterChanged = () => {
		const model = gridApi.value.getFilterModel();
		const backend = convertAgModelToBackend(model, colDefs.value);
		currentFilterJSON.value = backend ? JSON.stringify(backend) : undefined;
	};

	const hasActiveFilters = computed(() => Boolean(currentFilterJSON.value));

	return {
		initializeFilters,
		onFilterChanged,
		currentFilterJSON,
		hasActiveFilters,
	};
};
