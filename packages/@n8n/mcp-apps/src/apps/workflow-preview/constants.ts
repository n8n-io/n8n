export const WORKFLOW_PREVIEW_APP_SLUG = 'workflow-preview';

export const WORKFLOW_PREVIEW_TELEMETRY_EVENTS = {
	PREVIEW_CRASHED: 'workflow-preview app crashed',
	PREVIEW_RENDERED_SUCCESSFULLY: 'workflow-preview app rendered successfully',
	PREVIEW_RENDER_FAILED: 'workflow-preview app render failed',
	PREVIEW_TOOL_CALL_COMPLETED: 'workflow-preview app tool call completed',
	PREVIEW_TOOL_CALL_REQUESTED: 'workflow-preview app tool call requested',
	OPEN_IN_N8N_CLICKED: 'User clicked Open in n8n button',
} as const;

export const WORKFLOW_PREVIEW_OPEN_IN_N8N_SOURCES = {
	FALLBACK_CARD: 'fallback_card',
	PREVIEW_HEADER: 'preview_header',
} as const;

export type WorkflowPreviewOpenInN8nSource =
	(typeof WORKFLOW_PREVIEW_OPEN_IN_N8N_SOURCES)[keyof typeof WORKFLOW_PREVIEW_OPEN_IN_N8N_SOURCES];

export const WORKFLOW_PREVIEW_TOOL_NAMES = {
	GET_WORKFLOW_DETAILS: 'get_workflow_details',
} as const;

export const WORKFLOW_PREVIEW_TOOL_CALL_OUTCOMES = {
	INVALID_WORKFLOW: 'invalid_workflow',
	REQUEST_ERROR: 'request_error',
	STALE: 'stale',
	SUCCESS: 'success',
	TOOL_ERROR: 'tool_error',
} as const;

export type WorkflowPreviewToolCallOutcome =
	(typeof WORKFLOW_PREVIEW_TOOL_CALL_OUTCOMES)[keyof typeof WORKFLOW_PREVIEW_TOOL_CALL_OUTCOMES];

export const WORKFLOW_PREVIEW_CRASH_SOURCES = {
	APP_ERROR: 'app_error',
	APP_UNHANDLED_REJECTION: 'app_unhandled_rejection',
	PREVIEW_IFRAME_ERROR: 'preview_iframe_error',
} as const;

export type WorkflowPreviewCrashSource =
	(typeof WORKFLOW_PREVIEW_CRASH_SOURCES)[keyof typeof WORKFLOW_PREVIEW_CRASH_SOURCES];

export const WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS = {
	HOST_CONNECTION_FAILED: 'host_connection_failed',
	INVALID_WORKFLOW: 'invalid_workflow',
	PREVIEW_CRASHED: 'preview_crashed',
	PREVIEW_NOT_SUPPORTED: 'preview_not_supported',
	WORKFLOW_DETAILS_UNAVAILABLE: 'workflow_details_unavailable',
} as const;

export type WorkflowPreviewRenderFailureReason =
	(typeof WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS)[keyof typeof WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS];
