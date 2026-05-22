import { defineStore } from 'pinia';
import { ref } from 'vue';
import { v4 as uuid } from 'uuid';
import type { Dashboard, QueryResult, Widget, WidgetChartType } from './dashboards.types';

export const useDashboardsStore = defineStore('dashboards', () => {
	const dashboards = ref<Dashboard[]>([]);

	function getByProjectId(projectId: string): Dashboard[] {
		return dashboards.value.filter((d) => d.projectId === projectId);
	}

	function getById(id: string): Dashboard | undefined {
		return dashboards.value.find((d) => d.id === id);
	}

	function create(projectId: string): Dashboard {
		const dashboard: Dashboard = {
			id: uuid(),
			name: 'Untitled Dashboard',
			projectId,
			widgets: [],
		};
		dashboards.value.push(dashboard);
		return dashboard;
	}

	function rename(id: string, name: string) {
		const dashboard = getById(id);
		if (dashboard) {
			dashboard.name = name;
		}
	}

	function remove(id: string) {
		dashboards.value = dashboards.value.filter((d) => d.id !== id);
	}

	function addWidget(dashboardId: string): Widget | undefined {
		const dashboard = getById(dashboardId);
		if (!dashboard) return;
		const widget: Widget = { id: uuid(), name: 'Untitled Widget', query: '', chartType: 'table' };
		dashboard.widgets.push(widget);
		return widget;
	}

	function renameWidget(dashboardId: string, widgetId: string, name: string) {
		const dashboard = getById(dashboardId);
		const widget = dashboard?.widgets.find((w) => w.id === widgetId);
		if (widget) {
			widget.name = name;
		}
	}

	function setWidgetQuery(
		dashboardId: string,
		widgetId: string,
		query: string,
		queryResult?: QueryResult,
	) {
		const dashboard = getById(dashboardId);
		const widget = dashboard?.widgets.find((w) => w.id === widgetId);
		if (widget) {
			widget.query = query;
			widget.queryResult = queryResult;
		}
	}

	function setWidgetChartType(dashboardId: string, widgetId: string, chartType: WidgetChartType) {
		const dashboard = getById(dashboardId);
		const widget = dashboard?.widgets.find((w) => w.id === widgetId);
		if (widget) {
			widget.chartType = chartType;
		}
	}

	function toggleWidgetFullWidth(dashboardId: string, widgetId: string) {
		const dashboard = getById(dashboardId);
		const widget = dashboard?.widgets.find((w) => w.id === widgetId);
		if (widget) {
			widget.fullWidth = !widget.fullWidth;
		}
	}

	function removeWidget(dashboardId: string, widgetId: string) {
		const dashboard = getById(dashboardId);
		if (dashboard) {
			dashboard.widgets = dashboard.widgets.filter((w) => w.id !== widgetId);
		}
	}

	return {
		dashboards,
		getByProjectId,
		getById,
		create,
		rename,
		remove,
		addWidget,
		renameWidget,
		setWidgetQuery,
		setWidgetChartType,
		toggleWidgetFullWidth,
		removeWidget,
	};
});
