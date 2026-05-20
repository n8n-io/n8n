import type {
	Dashboard as DashboardApi,
	DashboardSpec,
	DashboardView,
	DashboardWidget,
	DashboardAction,
	KpiWidget,
	ChartWidget,
	TableWidget,
	AggregateOp,
	ChartType,
	WidgetType,
	InputHint,
	InputHintKind,
	KpiFormat,
	SortDirective,
	GroupByDirective,
	TimeBucket,
	BrokenRef,
} from '@n8n/api-types';

export type Dashboard = DashboardApi & { brokenRefs?: BrokenRef[] };
export type {
	DashboardSpec,
	DashboardView,
	DashboardWidget,
	DashboardAction,
	KpiWidget,
	ChartWidget,
	TableWidget,
	AggregateOp,
	ChartType,
	WidgetType,
	InputHint,
	InputHintKind,
	KpiFormat,
	SortDirective,
	GroupByDirective,
	TimeBucket,
	BrokenRef,
};

export type DashboardListItem = Pick<
	Dashboard,
	'id' | 'name' | 'description' | 'projectId' | 'tags' | 'archived' | 'createdAt' | 'updatedAt'
>;

export type AggregateResponse = {
	rows: Array<Record<string, unknown>>;
	totalGroups: number;
	truncated?: boolean;
};

export type DashboardActionResult = {
	status: number;
	ok: boolean;
	body: unknown;
	workflowId?: string;
	webhookNodeName?: string;
	actionLabel?: string;
};

/**
 * Normalized spec — always has a populated `views` array.
 * Legacy specs with a flat `widgets` array are wrapped into a single Overview view.
 */
export type NormalizedDashboardSpec = {
	version: 1;
	views: DashboardView[];
	globalFilters?: DashboardSpec['globalFilters'];
	actions?: DashboardSpec['actions'];
};
