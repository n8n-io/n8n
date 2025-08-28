const APP_Z_INDEXES = {
	CONTEXT_MENU: 10, // should be still in front of the logs panel
	APP_HEADER: 99,
	SELECT_BOX: 100,
	CANVAS_ADD_BUTTON: 101,
	ASK_ASSISTANT_CHAT: 300,
	APP_SIDEBAR: 999,
	CANVAS_SELECT_BOX: 100,
	TOP_BANNERS: 999,
	NODE_CREATOR: 1700,
	NDV: 1800,
	MODALS: 2000,
	TOASTS: 2100,
	ASK_ASSISTANT_FLOATING_BUTTON: 3000,
	ASK_ASSISTANT_FLOATING_BUTTON_TOOLTIP: 3000,
	CODEMIRROR_TOOLTIP: 3000,
	DRAGGABLE: 9999999,
	ACTIVE_STICKY: 9999999,
	WORKFLOW_PREVIEW_NDV: 9999999,
	NPS_SURVEY_MODAL: 3001,
} as const;

const setAppZIndexes = () => {
	Object.keys(APP_Z_INDEXES).forEach((key) => {
		const variableName = `--z-index-${key.toLowerCase().replaceAll('_', '-')}`;
		const value = APP_Z_INDEXES[key as keyof typeof APP_Z_INDEXES];
		document.documentElement.style.setProperty(variableName, `${value}`);
	});
};

export const useStyles = () => ({
	APP_Z_INDEXES,
	setAppZIndexes,
});
