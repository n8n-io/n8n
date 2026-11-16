export const BUILTIN_RECENT_RUNS_VIEW_ID = 'builtin:recent-runs';

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
