export const BUILTIN_PAGE_SUMMARY_VIEW_ID = 'builtin:page-summary';

/** Width of the toggle rail, which shows at all times. */
export const SIDE_PANEL_RAIL_WIDTH = 40;
export const SIDE_PANEL_DEFAULT_WIDTH = 360;
export const SIDE_PANEL_MIN_WIDTH = 280;
export const SIDE_PANEL_MAX_WIDTH = 720;

export const SIDE_PANEL_STORAGE_KEYS = {
	isOpen: 'N8N_UI_EXTENSIONS_SIDE_PANEL_OPEN',
	width: 'N8N_UI_EXTENSIONS_SIDE_PANEL_WIDTH',
	activeViewId: 'N8N_UI_EXTENSIONS_SIDE_PANEL_ACTIVE_VIEW',
} as const;

/** The strings of the built-in Page summary view. It reads them with `n8n.t(key)`. */
export const PAGE_SUMMARY_STRING_KEYS = [
	'uiExtensions.pageSummary.workflow.active',
	'uiExtensions.pageSummary.workflow.inactive',
	'uiExtensions.pageSummary.workflow.nodeCount',
	'uiExtensions.pageSummary.workflow.noNodes',
	'uiExtensions.pageSummary.workflow.hidden',
	'uiExtensions.pageSummary.workflows.heading',
	'uiExtensions.pageSummary.workflows.total',
	'uiExtensions.pageSummary.workflows.hint',
	'uiExtensions.pageSummary.other.heading',
] as const;
