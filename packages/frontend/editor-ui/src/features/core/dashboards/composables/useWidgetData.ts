import { shallowRef } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';

import { aggregateDataTableApi } from '@/features/core/dashboards/dashboards.api';
import { getDataTableRowsApi } from '@/features/core/dataTable/dataTable.api';
import type {
	ChartWidget,
	DashboardWidget,
	KpiWidget,
	TableWidget,
} from '@/features/core/dashboards/dashboards.types';

export function useWidgetData(projectId: string) {
	const rootStore = useRootStore();

	const loading = shallowRef<Record<string, boolean>>({});
	const errors = shallowRef<Record<string, string>>({});
	const data = shallowRef<Record<string, unknown>>({});

	function setLoading(widgetId: string, value: boolean) {
		loading.value = { ...loading.value, [widgetId]: value };
	}
	function setError(widgetId: string, value: string | undefined) {
		const next = { ...errors.value };
		if (value === undefined) delete next[widgetId];
		else next[widgetId] = value;
		errors.value = next;
	}
	function setData(widgetId: string, value: unknown) {
		data.value = { ...data.value, [widgetId]: value };
	}

	async function loadKpi(widget: KpiWidget) {
		setLoading(widget.id, true);
		setError(widget.id, undefined);
		try {
			const result = await aggregateDataTableApi(
				rootStore.restApiContext,
				projectId,
				widget.dataSource.dataTableId,
				{
					ops: [widget.aggregate],
					filter: widget.dataSource.filter,
				},
			);
			setData(widget.id, result.rows[0]?.[widget.aggregate.alias] ?? 0);
		} catch (e) {
			setError(widget.id, e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(widget.id, false);
		}
	}

	async function loadChart(widget: ChartWidget) {
		setLoading(widget.id, true);
		setError(widget.id, undefined);
		try {
			const groupBy = widget.groupBy?.length ? widget.groupBy : [widget.xAxis];
			const result = await aggregateDataTableApi(
				rootStore.restApiContext,
				projectId,
				widget.dataSource.dataTableId,
				{
					ops: widget.yAxis,
					groupBy,
					filter: widget.dataSource.filter,
					sort: [{ column: widget.xAxis, direction: 'ASC' }],
					take: 500,
				},
			);
			setData(widget.id, result.rows);
		} catch (e) {
			setError(widget.id, e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(widget.id, false);
		}
	}

	async function loadTable(widget: TableWidget) {
		setLoading(widget.id, true);
		setError(widget.id, undefined);
		try {
			// The data-table rows endpoint still uses the legacy "col:DIR" string —
			// flatten our structured sort directive to the first directive.
			const sortDirective = widget.dataSource.sort?.[0];
			const sortString = sortDirective
				? `${sortDirective.column}:${sortDirective.direction}`
				: undefined;
			const result = await getDataTableRowsApi(
				rootStore.restApiContext,
				widget.dataSource.dataTableId,
				projectId,
				{
					take: widget.pageSize,
					filter: widget.dataSource.filter ? JSON.stringify(widget.dataSource.filter) : undefined,
					sortBy: sortString,
				},
			);
			setData(widget.id, result.data);
		} catch (e) {
			setError(widget.id, e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(widget.id, false);
		}
	}

	async function load(widget: DashboardWidget) {
		switch (widget.type) {
			case 'kpi':
				await loadKpi(widget);
				break;
			case 'chart':
				await loadChart(widget);
				break;
			case 'table':
				await loadTable(widget);
				break;
		}
	}

	return { data, loading, errors, load };
}
