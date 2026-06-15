export const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';
export const RESOURCE_URI_META_KEY = 'ui/resourceUri';

export const WORKFLOW_PREVIEW_APP_URI = 'ui://workflow-preview/workflow-preview.html';
export const WORKFLOW_PREVIEW_ORIGIN = 'https://n8n-preview-service.internal.n8n.cloud';
export const WORKFLOW_PREVIEW_FRAME_DOMAINS = [
	WORKFLOW_PREVIEW_ORIGIN,
	'https://*',
	'http://localhost:*',
	'http://127.0.0.1:*',
] as const;
