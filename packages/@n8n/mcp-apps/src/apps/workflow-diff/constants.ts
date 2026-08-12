export const WORKFLOW_DIFF_APP_SLUG = 'workflow-diff';

export const WORKFLOW_DIFF_TELEMETRY_EVENTS = {
	DIFF_CRASHED: 'workflow-diff app crashed',
	DIFF_RENDERED_SUCCESSFULLY: 'workflow-diff app rendered successfully',
	DIFF_RENDER_FAILED: 'workflow-diff app render failed',
	DIFF_TOOL_CALL_COMPLETED: 'workflow-diff app tool call completed',
	DIFF_TOOL_CALL_REQUESTED: 'workflow-diff app tool call requested',
	OPEN_IN_N8N_CLICKED: 'User clicked Open in n8n button',
} as const;

export const WORKFLOW_DIFF_OPEN_IN_N8N_SOURCES = {
	DIFF_HEADER: 'diff_header',
	FALLBACK_CARD: 'fallback_card',
} as const;

export type WorkflowDiffOpenInN8nSource =
	(typeof WORKFLOW_DIFF_OPEN_IN_N8N_SOURCES)[keyof typeof WORKFLOW_DIFF_OPEN_IN_N8N_SOURCES];

export const WORKFLOW_DIFF_TOOL_NAMES = {
	GET_WORKFLOW_VERSION: 'get_workflow_version',
} as const;

export const WORKFLOW_DIFF_TOOL_CALL_OUTCOMES = {
	INVALID_VERSION: 'invalid_version',
	REQUEST_ERROR: 'request_error',
	STALE: 'stale',
	SUCCESS: 'success',
	TOOL_ERROR: 'tool_error',
} as const;

export type WorkflowDiffToolCallOutcome =
	(typeof WORKFLOW_DIFF_TOOL_CALL_OUTCOMES)[keyof typeof WORKFLOW_DIFF_TOOL_CALL_OUTCOMES];

export const WORKFLOW_DIFF_CRASH_SOURCES = {
	APP_ERROR: 'app_error',
	APP_UNHANDLED_REJECTION: 'app_unhandled_rejection',
	DIFF_CANVAS_ERROR: 'diff_canvas_error',
} as const;

export const WORKFLOW_DIFF_RENDER_FAILURE_REASONS = {
	HOST_CONNECTION_FAILED: 'host_connection_failed',
	DIFF_CRASHED: 'diff_crashed',
	VERSIONS_UNAVAILABLE: 'versions_unavailable',
} as const;

export type WorkflowDiffRenderFailureReason =
	(typeof WORKFLOW_DIFF_RENDER_FAILURE_REASONS)[keyof typeof WORKFLOW_DIFF_RENDER_FAILURE_REASONS];
