export const LOCAL_STORAGE_PANEL_HEIGHT = 'N8N_CANVAS_CHAT_HEIGHT';

export const LOCAL_STORAGE_PANEL_WIDTH = 'N8N_CANVAS_CHAT_WIDTH';

export const LOCAL_STORAGE_OVERVIEW_PANEL_WIDTH = 'N8N_LOGS_OVERVIEW_PANEL_WIDTH';

export const LOGS_PANEL_STATE = {
	CLOSED: 'closed',
	ATTACHED: 'attached',
	FLOATING: 'floating',
} as const;

export const LOG_DETAILS_PANEL_STATE = {
	INPUT: 'input',
	OUTPUT: 'output',
	BOTH: 'both',
} as const;
