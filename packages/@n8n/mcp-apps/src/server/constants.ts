export const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';
export const RESOURCE_URI_META_KEY = 'ui/resourceUri';

export const WORKFLOW_PREVIEW_APP_URI = 'ui://workflow-preview/workflow-preview.html';
export const WORKFLOW_PREVIEW_ORIGIN = 'https://n8n-preview-service.internal.n8n.cloud';
// Scoped to the single preview-service origin (CSP `frame-src`). The preview is
// instance-agnostic: workflow data is pushed into the iframe via postMessage, so
// the same origin renders cloud and self-hosted workflows without needing the
// instance origin framed. Keep this narrow — MCP hosts reject broad/wildcard
// frame domains.
export const WORKFLOW_PREVIEW_FRAME_DOMAINS = [WORKFLOW_PREVIEW_ORIGIN] as const;
