export const WORKFLOW_PREVIEW_APP_SLUG = 'workflow-preview';

export const WORKFLOW_PREVIEW_TELEMETRY_EVENTS = {
	PREVIEW_RENDERED_SUCCESSFULLY: 'workflow-preview app rendered successfully',
	PREVIEW_RENDER_FAILED: 'workflow-preview app render failed',
	OPEN_IN_N8N_CLICKED: 'User clicked Open in n8n button',
} as const;

export const WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS = {
	HOST_CONNECTION_FAILED: 'host_connection_failed',
	INVALID_WORKFLOW: 'invalid_workflow',
	PREVIEW_NOT_SUPPORTED: 'preview_not_supported',
	WORKFLOW_DETAILS_UNAVAILABLE: 'workflow_details_unavailable',
} as const;

export type WorkflowPreviewRenderFailureReason =
	(typeof WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS)[keyof typeof WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS];
