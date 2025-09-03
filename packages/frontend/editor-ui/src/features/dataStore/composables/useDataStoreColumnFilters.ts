import { computed, ref, type Ref } from 'vue';
import type { ColDef, GridApi, FilterModel } from 'ag-grid-community';
import type { DataStoreRow } from '@/features/dataStore/datastore.types';

type BackendFilterCondition = 'eq' | 'neq' | 'like' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte';

type BackendFilterRecord = {
	columnName: string;
	condition: BackendFilterCondition;
	value: string | number | boolean | Date | null;
};

type BackendFilter = {
	type: 'and' | 'or';
	filters: BackendFilterRecord[];
};

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
		gridApi.value.setGridOption('defaultColDef', {
			filter: true,
		});

		// Explicitly disable filters for special columns that shouldn't be filterable
		const updated = colDefs.value.map((def) => {
			const colId = def.colId ?? def.field;
			if (!colId) return def;
			if (colId === 'add-column' || colId === 'ag-Grid-SelectionColumn') {
				return { ...def, filter: false } as ColDef;
			}
			return def;
		});
		colDefs.value = updated;
		setGridData({ colDefs: updated });
	};

	function mapTextTypeToBackend(type: string): BackendFilterCondition | undefined {
		switch (type) {
			case 'contains':
				return 'ilike';
			case 'equals':
				return 'eq';
			case 'notEqual':
				return 'neq';
			case 'startsWith':
				return 'ilike';
			case 'endsWith':
				return 'ilike';
			case 'blank':
				return 'eq';
			case 'notBlank':
				return 'neq';
			default:
				return undefined;
		}
	}

	function mapNumberDateTypeToBackend(type: string): BackendFilterCondition | undefined {
		switch (type) {
			case 'equals':
				return 'eq';
			case 'notEqual':
				return 'neq';
			case 'lessThan':
				return 'lt';
			case 'lessThanOrEqual':
				return 'lte';
			case 'greaterThan':
				return 'gt';
			case 'greaterThanOrEqual':
				return 'gte';
			default:
				return undefined;
		}
	}

	function convertAgModelToBackend(model: FilterModel, defs: ColDef[]): BackendFilter | undefined {
		const filters: BackendFilterRecord[] = [];

		const colIdToField = new Map<string, string>();
		defs.forEach((d) => {
			if (d.colId && d.field) colIdToField.set(d.colId, d.field);
			else if (d.field) colIdToField.set(d.field, d.field);
		});

		for (const [key, val] of Object.entries(model)) {
			const colField = colIdToField.get(key) ?? key;
			// Skip special/internal columns
			if (colField === 'add-column' || colField === 'ag-Grid-SelectionColumn') continue;

			// Set Filter (commonly for boolean)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const v: any = val;
			const filterType: string | undefined = v?.filterType || v?.type;

			if (!filterType) continue;

			if (filterType === 'set') {
				const values: Array<string | number | boolean | null> | undefined = v.values;
				if (!values || values.length === 0) continue;
				// If both true/false selected (or multiple values), skip as it's effectively no filter
				if (values.length === 1) {
					const only = values[0];
					filters.push({ columnName: colField, condition: 'eq', value: only as boolean | null });
				}
				continue;
			}

			// Support single condition only (we suppress AND/OR in UI by defaultColDef); if model contains
			// advanced conditions, prefer the first condition
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const extractSimple = (m: any) => {
				if (m?.operator && m.condition1) return m.condition1; // pick first
				return m;
			};

			const simple = extractSimple(v);
			if (!simple) continue;

			const type: string | undefined = simple.type;
			let backendCondition: BackendFilterCondition | undefined;
			let value: string | number | boolean | Date | null = simple.filter ?? null;

			switch (simple.filterType) {
				case 'text':
					backendCondition = mapTextTypeToBackend(type);
					if (type === 'blank') value = null;
					if (type === 'notBlank') value = null;
					if (typeof simple.filter === 'string') {
						if (type === 'startsWith') {
							value = `${simple.filter}%`;
						} else if (type === 'endsWith') {
							value = `%${simple.filter}`;
						} else if (type === 'contains') {
							// backend will auto-wrap to %value% if % not present
							value = simple.filter;
						}
					}
					break;
				case 'number':
					backendCondition = mapNumberDateTypeToBackend(type);
					break;
				case 'date':
					backendCondition = mapNumberDateTypeToBackend(type);
					const filterStr = typeof simple.filter === 'string' ? simple.filter : undefined;
					if (filterStr) {
						value = new Date(String(filterStr)).toISOString();
					}
					const filterToStr = typeof simple.filterTo === 'string' ? simple.filterTo : undefined;
					if (type === 'inRange' && filterStr && filterToStr) {
						// Convert to gte/lte pair
						const fromIso = new Date(String(filterStr)).toISOString();
						const toIso = new Date(String(filterToStr)).toISOString();
						filters.push({ columnName: colField, condition: 'gte', value: fromIso });
						filters.push({ columnName: colField, condition: 'lte', value: toIso });
						continue;
					}
					break;
				default:
					// Unrecognized filter type; skip
					break;
			}

			if (!backendCondition) continue;

			filters.push({ columnName: colField, condition: backendCondition, value });
		}

		if (filters.length === 0) return undefined;
		return { type: 'and', filters };
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
