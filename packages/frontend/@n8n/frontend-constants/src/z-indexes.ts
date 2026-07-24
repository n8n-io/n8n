/**
 * Application-wide z-index scale.
 *
 * Every z-index that matters at the application level belongs here so the
 * stacking order is documented in one place and shared across packages.
 * Values are injected as CSS custom properties at bootstrap by
 * `setAppZIndexes` in `@n8n/composables/useStyles`.
 */
export const APP_Z_INDEXES = {
	CONTEXT_MENU: 10, // should be still in front of the logs panel
	APP_HEADER: 99,
	SELECT_BOX: 100,
	CANVAS_ADD_BUTTON: 101,
	APP_SIDEBAR: 999,
	CANVAS_SELECT_BOX: 100,
	TOP_BANNERS: 999,
	NODE_CREATOR: 1700,
	ASK_ASSISTANT_CHAT: 1750,
	NDV: 1800,
	COMMAND_BAR: 1900,
	DIALOGS: 1950, // N8nDialog
	MODALS: 2000,
	TOASTS: 2100,
	ASK_ASSISTANT_FLOATING_BUTTON: 3000,
	ASK_ASSISTANT_FLOATING_BUTTON_TOOLTIP: 3000,
	CODEMIRROR_TOOLTIP: 3000,
	FLOATING_UI: 3000,
	DRAGGABLE: 9999999,
	ACTIVE_STICKY: 9999999,
	WORKFLOW_PREVIEW_NDV: 9999999,
	NPS_SURVEY_MODAL: 3001,
} as const;
