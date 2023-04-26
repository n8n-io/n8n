import config from '@/config';

export const REST_PATH_SEGMENT = config.getEnv('endpoints.rest') as Readonly<string>;

export const PUBLIC_API_REST_PATH_SEGMENT = config.getEnv('publicApi.path') as Readonly<string>;

export const AUTHLESS_ENDPOINTS: Readonly<string[]> = [
	'healthz',
	'metrics',
	config.getEnv('endpoints.webhook'),
	config.getEnv('endpoints.webhookWaiting'),
	config.getEnv('endpoints.webhookTest'),
];

export const SUCCESS_RESPONSE_BODY = {
	data: {
		success: true,
	},
} as const;

export const LOGGED_OUT_RESPONSE_BODY = {
	data: {
		loggedOut: true,
	},
};

/**
 * Routes requiring a valid `n8n-auth` cookie for a user, either owner or member.
 */
export const ROUTES_REQUIRING_AUTHENTICATION: Readonly<string[]> = [
	'PATCH /me',
	'PATCH /me/password',
	'POST /me/survey',
	'POST /owner/setup',
	'GET /non-existent',
];

/**
 * Routes requiring a valid `n8n-auth` cookie for an owner.
 */
export const ROUTES_REQUIRING_AUTHORIZATION: Readonly<string[]> = [
	'POST /users',
	'DELETE /users/123',
	'POST /users/123/reinvite',
	'GET /owner/pre-setup',
	'POST /owner/setup',
	'POST /owner/skip-setup',
];

export const COMMUNITY_PACKAGE_VERSION = {
	CURRENT: '0.1.0',
	UPDATED: '0.2.0',
};

export const COMMUNITY_NODE_VERSION = {
	CURRENT: 1,
	UPDATED: 2,
};

/**
 * Timeout (in milliseconds) to account for DB being slow to initialize.
 */
export const DB_INITIALIZATION_TIMEOUT = 30_000;
