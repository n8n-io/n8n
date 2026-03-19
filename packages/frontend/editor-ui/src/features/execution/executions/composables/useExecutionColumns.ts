import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { computed, ref, type Ref } from 'vue';
import type {
	ExecutionColumnDefinition,
	ExecutionColumnId,
	ExecutionSummaryWithCustomData,
} from '../executions.types';

const STATIC_COLUMNS: ExecutionColumnDefinition[] = [
	{
		id: 'workflow',
		labelKey: 'generic.workflow',
		toggleable: true,
		visible: true,
		group: 'standard',
	},
	{
		id: 'startedAt',
		labelKey: 'executionsList.startedAt',
		toggleable: true,
		visible: true,
		group: 'standard',
	},
	{
		id: 'status',
		labelKey: 'executionsList.status',
		toggleable: true,
		visible: true,
		group: 'standard',
	},
	{
		id: 'runTime',
		labelKey: 'executionsList.runTime',
		toggleable: true,
		visible: true,
		group: 'standard',
	},
	{
		id: 'id',
		labelKey: 'executionsList.id',
		toggleable: true,
		visible: true,
		group: 'standard',
	},
	{
		id: 'tags',
		labelKey: 'executionsList.columns.tags',
		toggleable: true,
		visible: true,
		group: 'annotation',
	},
	{
		id: 'rating',
		labelKey: 'executionsList.columns.rating',
		toggleable: true,
		visible: true,
		group: 'annotation',
	},
	{
		id: 'mode',
		labelKey: 'executionsList.columns.mode',
		toggleable: true,
		visible: true,
		group: 'standard',
	},
];

export function useExecutionColumns(
	executions: Ref<ExecutionSummaryWithCustomData[]>,
	options?: { excludeColumns?: ExecutionColumnId[] },
) {
	const i18n = useI18n();
	const columnVisibility = ref<Record<string, boolean>>({});

	const customDataKeys = computed(() => {
		const keys = new Set<string>();
		for (const execution of executions.value) {
			if (execution.customData) {
				for (const key of Object.keys(execution.customData)) {
					keys.add(key);
				}
			}
		}
		return [...keys].sort();
	});

	const excludeSet = new Set(options?.excludeColumns ?? []);

	const allColumns = computed<ExecutionColumnDefinition[]>(() => {
		const dynamicColumns: ExecutionColumnDefinition[] = customDataKeys.value.map((key) => ({
			id: `customData:${key}` as ExecutionColumnId,
			labelKey: key,
			toggleable: true,
			visible: true,
			group: 'customData' as const,
		}));

		const columns = [...STATIC_COLUMNS, ...dynamicColumns];
		return excludeSet.size > 0 ? columns.filter((col) => !excludeSet.has(col.id)) : columns;
	});

	const visibleColumns = computed(() => allColumns.value.filter((col) => isColumnVisible(col.id)));

	const toggleableColumns = computed(() => allColumns.value.filter((col) => col.toggleable));

	const visibleColumnCount = computed(() => visibleColumns.value.length);

	function isColumnVisible(id: ExecutionColumnId): boolean {
		if (id in columnVisibility.value) {
			return columnVisibility.value[id];
		}
		const col = allColumns.value.find((c) => c.id === id);
		return col?.visible ?? true;
	}

	function toggleColumn(id: ExecutionColumnId) {
		columnVisibility.value = {
			...columnVisibility.value,
			[id]: !isColumnVisible(id),
		};
	}

	function getColumnLabel(col: ExecutionColumnDefinition): string {
		if (col.group === 'customData') {
			return col.labelKey;
		}
		return i18n.baseText(col.labelKey as BaseTextKey);
	}

	return {
		allColumns,
		visibleColumns,
		toggleableColumns,
		visibleColumnCount,
		isColumnVisible,
		toggleColumn,
		getColumnLabel,
	};
}
