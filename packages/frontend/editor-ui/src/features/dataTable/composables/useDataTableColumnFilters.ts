import { computed, ref, type Ref } from 'vue';
import type { ColDef, GridApi } from 'ag-grid-community';
import type {
	BackendFilter,
	BackendFilterRecord,
	FilterModel,
} from '../types/dataTableFilters.types';
import {
	processTextFilter,
	processNumberFilter,
	processDateFilter,
} from '../utils/filterProcessors';

export type UseDataTableColumnFiltersParams = {
	gridApi: Ref<GridApi>;
	colDefs: Ref<ColDef[]>;
};

export const useDataTableColumnFilters = ({
	gridApi,
	colDefs,
}: UseDataTableColumnFiltersParams) => {
	const currentFilterJSON = ref<string | undefined>(undefined);

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
		currentFilterJSON.value = backend ? JSON.stringify(backend) : undefined;
	};

	const hasActiveFilters = computed(() => Boolean(currentFilterJSON.value));

	return {
		onFilterChanged,
		currentFilterJSON,
		hasActiveFilters,
	};
};
