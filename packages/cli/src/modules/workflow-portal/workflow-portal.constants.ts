export const WORKFLOW_PORTAL_PATH = '/workflow-portal';
export const WORKFLOW_PORTAL_ASSETS_PATH = `${WORKFLOW_PORTAL_PATH}/assets`;
export const WORKFLOW_PORTAL_ROUTES = {
	index: '/',
	login: `${WORKFLOW_PORTAL_PATH}/login`,
	oauthCallback: `${WORKFLOW_PORTAL_PATH}/callback`,
	workflows: `${WORKFLOW_PORTAL_PATH}/workflows`,
} satisfies Record<string, `/${string}`>;
export const WORKFLOW_PORTAL_CALLBACK_PATH = WORKFLOW_PORTAL_ROUTES.oauthCallback;
export const WORKFLOW_PORTAL_COOKIE = 'n8n-workflow-portal';
export const WORKFLOW_PORTAL_STATE_COOKIE = 'n8n-workflow-portal-state';
