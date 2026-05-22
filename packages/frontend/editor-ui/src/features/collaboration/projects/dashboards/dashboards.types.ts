export type WidgetChartType = 'table' | 'bar' | 'line' | 'pie';

export interface Widget {
	id: string;
	name: string;
	query: string;
	queryResult?: QueryResult;
	fullWidth?: boolean;
	chartType: WidgetChartType;
}

export interface QueryResult {
	columns: string[];
	rows: Array<Record<string, unknown>>;
	durationMs: number;
	truncated: boolean;
}

export interface Dashboard {
	id: string;
	name: string;
	projectId: string;
	widgets: Widget[];
}
