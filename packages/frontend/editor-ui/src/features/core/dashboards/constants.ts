export const DASHBOARDS_VIEW = 'dashboards';
export const PROJECT_DASHBOARDS = 'project-dashboards';
export const DASHBOARD_DETAILS = 'dashboard-details';
export const DASHBOARDS_STORE = 'dashboardsStore';

export const ADD_DASHBOARD_MODAL_KEY = 'addDashboardModal';

export const DASHBOARD_MODULE_NAME = 'dashboard';

export const DEFAULT_GRID_COLUMNS = 12;
export const DEFAULT_WIDGET_COL_SPAN = 4;
export const DEFAULT_WIDGET_ROW_SPAN = 1;

export const DASHBOARD_WIDGET_REFRESH_MS = 30_000;

export const DASHBOARD_CARD_ACTIONS = {
	RENAME: 'rename',
	DELETE: 'delete',
	DUPLICATE: 'duplicate',
	ARCHIVE: 'archive',
	UNARCHIVE: 'unarchive',
} as const;
