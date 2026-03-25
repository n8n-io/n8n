import type { SetupFriction } from './credentialsSetup.types';

export const SURFACE_FLAGS = {
	badges: true,
	modal: true,
	setupPanel: false,
} as const;

export const BADGE_LABELS: Record<SetupFriction, string | undefined> = {
	one_click: '1-click',
	one_field_then_connect: '1 field + connect',
	paste_token: 'Paste token',
	server_wizard: 'Server details',
	multi_step: undefined,
};

export const FRICTION_SORT_ORDER: SetupFriction[] = [
	'one_click',
	'one_field_then_connect',
	'paste_token',
	'server_wizard',
	'multi_step',
];

export const BOOTSTRAP_FIELD_PATTERNS = [
	'subdomain',
	'domain',
	'host',
	'tenant',
	'instance',
	'shop',
	'site',
	'org',
	'account',
	'workspace',
	'environment',
	'region',
	'server',
	'url',
	'base',
] as const;

// Exact bootstrap field names from tenant OAuth credential types:
// - shopifyOAuth2Api: shopSubdomain
// - zendeskOAuth2Api: subdomain
// - serviceNowOAuth2Api: subdomain
// - databricksOAuth2Api: host
export const KNOWN_BOOTSTRAP_FIELDS = new Set([
	'subdomain',
	'shopSubdomain',
	'host',
	'tenantId',
	'instanceUrl',
]);

export const TOKEN_FIELD_PATTERNS = [
	'apiKey',
	'apiToken',
	'accessToken',
	'secretKey',
	'token',
] as const;

export const SERVER_FIELD_PATTERNS = [
	'host',
	'url',
	'server',
	'port',
	'baseUrl',
	'endpoint',
] as const;
