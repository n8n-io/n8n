/**
 * Request header that tells the backend which client sent a Public API call.
 * The editor UI sets it. Usage telemetry reads it to split UI calls from automations.
 * A client can send any value, so use it for telemetry only, never for access control.
 */
export const N8N_CLIENT_HEADER = 'x-n8n-client';

/** Value of `N8N_CLIENT_HEADER` that the editor UI sends. */
export const N8N_CLIENT_EDITOR_UI = 'editor-ui';
