import type { Risk } from '@/security-audit/types';

/**
 * Risk categories
 */

export const RISK_CATEGORIES: Risk.Category[] = [
	'credentials',
	'database',
	'nodes',
	'instance',
	'filesystem',
	'advisories',
];

/**
 * Node types
 */

export const SQL_NODE_TYPES_WITH_QUERY_PARAMS = new Set([
	'n8n-nodes-base.postgres',
	'n8n-nodes-base.crateDb',
	'n8n-nodes-base.questDb',
	'n8n-nodes-base.timescaleDb',
]);

export const SQL_NODE_TYPES = new Set([
	...SQL_NODE_TYPES_WITH_QUERY_PARAMS,
	'n8n-nodes-base.mySql',
	'n8n-nodes-base.microsoftSql',
	'n8n-nodes-base.snowflake',
]);

export const WEBHOOK_NODE_TYPE = 'n8n-nodes-base.webhook';

export const WEBHOOK_VALIDATOR_NODE_TYPES = new Set([
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
]);

export const FILESYSTEM_INTERACTION_NODE_TYPES = new Set([
	'n8n-nodes-base.readPdf',
	'n8n-nodes-base.readBinaryFile',
	'n8n-nodes-base.readBinaryFiles',
	'n8n-nodes-base.spreadsheetFile',
	'n8n-nodes-base.writeBinaryFile',
]);

export const OFFICIAL_RISKY_NODE_TYPES = new Set([
	'n8n-nodes-base.executeCommand',
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.ssh',
	'n8n-nodes-base.ftp',
]);

/**
 * Risk reports
 */

export const DATABASE_REPORT = {
	RISK: 'database',
	SECTIONS: {
		EXPRESSIONS_IN_QUERIES: 'Expressions in "Execute Query" fields in SQL nodes',
		EXPRESSIONS_IN_QUERY_PARAMS: 'Expressions in "Query Parameters" fields in SQL nodes',
		UNUSED_QUERY_PARAMS: 'Unused "Query Parameters" fields in SQL nodes',
	},
} as const;

export const CREDENTIALS_REPORT = {
	RISK: 'credentials',
	SECTIONS: {
		CREDS_NOT_IN_ANY_USE: 'Unused credentials',
		CREDS_NOT_IN_ACTIVE_USE: 'Credentials only used in inactive workflows',
		CREDS_NOT_RECENTLY_EXECUTED: 'Credentials not recently used',
	},
} as const;

export const FILESYSTEM_REPORT = {
	RISK: 'filesystem',
	SECTIONS: {
		FILESYSTEM_INTERACTION_NODES: 'Nodes that interact with the filesystem',
	},
} as const;

export const NODES_REPORT = {
	RISK: 'nodes',
	SECTIONS: {
		OFFICIAL_RISKY_NODES: 'Nodes with system access',
		COMMUNITY_NODES: 'Community nodes',
		CUSTOM_NODES: 'Custom nodes',
	},
} as const;

export const INSTANCE_REPORT = {
	RISK: 'instance',
	SECTIONS: {
		UNPROTECTED_WEBHOOKS: 'Unprotected webhooks in instance',
		OUTDATED_INSTANCE: 'Outdated instance',
		SECURITY_SETTINGS: 'Security settings',
	},
} as const;

export const ADVISORIES_REPORT = {
	RISK: 'advisories',
	SECTIONS: {
		AFFECTING_CURRENT_VERSION: 'Security advisories affecting this instance',
		ALL_PUBLISHED: 'All published security advisories',
	},
} as const;

/**
 * Cache constants for advisories
 */
export const ADVISORIES_CACHE_KEY = 'security-advisories:github';
export const ADVISORIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * URLs
 */

export const ENV_VARS_DOCS_URL = 'https://docs.n8n.io/hosting/configuration/environment-variables/';

export const DB_QUERY_PARAMS_DOCS_URL =
	'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres#use-query-parameters';

export const COMMUNITY_NODES_RISKS_URL = 'https://docs.n8n.io/integrations/community-nodes/risks';

export const NPM_PACKAGE_URL = 'https://www.npmjs.com/package';

export const GITHUB_ADVISORIES_URL =
	'https://api.github.com/repos/n8n-io/n8n/security-advisories?state=published';
