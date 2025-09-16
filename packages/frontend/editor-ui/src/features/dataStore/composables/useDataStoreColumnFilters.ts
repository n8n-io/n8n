import { computed, ref, type Ref } from 'vue';
import type { ColDef, GridApi } from 'ag-grid-community';
import type { DataStoreRow } from '@/features/dataStore/datastore.types';

type BackendFilterCondition = 'eq' | 'neq' | 'like' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte';

type BackendFilterRecord = {
	columnName: string;
	condition: BackendFilterCondition;
	value: string | number | boolean | Date | null;
};

type BackendFilter = {
	type: 'and';
	filters: BackendFilterRecord[];
};

type FilterModel = {
	[colId: string]: {
		filterType: 'text' | 'number' | 'date';
		filter?: string;
		type:
			| 'contains'
			| 'equals'
			| 'notEqual'
			| 'startsWith'
			| 'endsWith'
			| 'isEmpty'
			| 'notEmpty'
			| 'null'
			| 'notNull'
			| 'true'
			| 'false'
			| 'inRange';
		dateFrom?: string;
		dateTo?: string;
	};
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
			filterParams: {
				maxNumConditions: 1,
			},
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

	function mapTextTypeToBackend(type: string): BackendFilterCondition {
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
			case 'isEmpty':
				return 'eq';
			case 'notEmpty':
				return 'neq';
			case 'null':
				return 'eq';
			case 'notNull':
				return 'neq';
			case 'true':
				return 'eq';
			case 'false':
				return 'eq';
			default:
				throw new Error(`Unknown text type: ${type}`);
		}
	}

	function mapNumberDateTypeToBackend(type: string): BackendFilterCondition {
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
			case 'null':
				return 'eq'; // Check for null
			case 'notNull':
				return 'neq'; // Check for not null
			default:
				throw new Error(`Unknown number/date type: ${type}`);
		}
	}

	function convertAgModelToBackend(model: FilterModel, defs: ColDef[]): BackendFilter | undefined {
		const filters: BackendFilterRecord[] = [];

		const colIdToField = new Map<string, string>();
		defs.forEach((d) => {
			if (d.colId && d.field) colIdToField.set(d.colId, d.field);
			else if (d.field) colIdToField.set(d.field, d.field);
		});

		for (const [key, filter] of Object.entries(model)) {
			const colField = colIdToField.get(key) ?? key;
			// Skip special/internal columns
			if (colField === 'add-column' || colField === 'ag-Grid-SelectionColumn') continue;

			// Set Filter (commonly for boolean)
			const filterType: string | undefined = filter?.filterType || filter?.type;

			if (!filterType) continue;

			let value: string | number | boolean | Date | null = filter.filter ?? null;

			switch (filter.filterType) {
				case 'text':
					if (typeof filter.filter === 'string') {
						if (filter.type === 'startsWith') {
							value = `${filter.filter}%`;
						} else if (filter.type === 'endsWith') {
							value = `%${filter.filter}`;
						} else if (filter.type === 'contains') {
							// backend will auto-wrap to %value% if % not present
							value = filter.filter;
						}
					} else if (filter.type === 'isEmpty' || filter.type === 'notEmpty') {
						value = '';
					} else if (filter.type === 'null' || filter.type === 'notNull') {
						value = null;
					} else if (filter.type === 'true') {
						value = true;
					} else if (filter.type === 'false') {
						value = false;
					}
					filters.push({
						columnName: colField,
						condition: mapTextTypeToBackend(filter.type),
						value,
					});
					break;
				case 'number':
					if (filter.type === 'null' || filter.type === 'notNull') {
						value = null;
					}
					filters.push({
						columnName: colField,
						condition: mapNumberDateTypeToBackend(filter.type),
						value,
					});
					break;
				case 'date':
					if (filter.type === 'null' || filter.type === 'notNull') {
						value = null;
					} else {
						if (filter.dateFrom) {
							value = new Date(String(filter.dateFrom)).toISOString();
						}
						if (filter.type === 'inRange' && filter.dateFrom && filter.dateTo) {
							const fromIso = new Date(String(filter.dateFrom)).toISOString();
							const toIso = new Date(String(filter.dateTo)).toISOString();
							filters.push({ columnName: colField, condition: 'gte', value: fromIso });
							filters.push({ columnName: colField, condition: 'lte', value: toIso });
							break; // Skip the normal filter push below
						}
					}
					filters.push({
						columnName: colField,
						condition: mapNumberDateTypeToBackend(filter.type),
						value,
					});
					break;
				default:
					// Unrecognized filter type; skip
					break;
			}
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
