import { readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import type { n8n } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

const { NODE_ENV, E2E_TESTS } = process.env;
export const inProduction = NODE_ENV === 'production';
export const inDevelopment = !NODE_ENV || NODE_ENV === 'development';
export const inTest = NODE_ENV === 'test';
export const inE2ETests = E2E_TESTS === 'true';

export const CUSTOM_API_CALL_NAME = 'Custom API Call';
export const CUSTOM_API_CALL_KEY = '__CUSTOM_API_CALL__';

export const CLI_DIR = resolve(__dirname, '..');
export const TEMPLATES_DIR = join(CLI_DIR, 'templates');
export const NODES_BASE_DIR = dirname(require.resolve('n8n-nodes-base'));
export const EDITOR_UI_DIST_DIR = join(dirname(require.resolve('n8n-editor-ui')), 'dist');

export function getN8nPackageJson() {
	return jsonParse<n8n.PackageJson>(readFileSync(join(CLI_DIR, 'package.json'), 'utf8'));
}

export const STARTING_NODES = [
	'@n8n/n8n-nodes-langchain.manualChatTrigger',
	'n8n-nodes-base.start',
	'n8n-nodes-base.manualTrigger',
];

export const N8N_VERSION = getN8nPackageJson().version;

export const NODE_PACKAGE_PREFIX = 'n8n-nodes-';

export const STARTER_TEMPLATE_NAME = `${NODE_PACKAGE_PREFIX}starter`;

export const RESPONSE_ERROR_MESSAGES = {
	NO_CREDENTIAL: 'Credential not found',
	NO_NODE: 'Node not found',
	PACKAGE_NAME_NOT_PROVIDED: 'Package name is required',
	PACKAGE_NAME_NOT_VALID: `Package name is not valid - it must start with "${NODE_PACKAGE_PREFIX}"`,
	PACKAGE_NOT_INSTALLED: 'This package is not installed - you must install it first',
	PACKAGE_FAILED_TO_INSTALL: 'Package could not be installed - check logs for details',
	PACKAGE_NOT_FOUND: 'Package not found in npm',
	PACKAGE_VERSION_NOT_FOUND: 'The specified package version was not found',
	PACKAGE_DOES_NOT_CONTAIN_NODES: 'The specified package does not contain any nodes',
	PACKAGE_LOADING_FAILED: 'The specified package could not be loaded',
	DISK_IS_FULL: 'There appears to be insufficient disk space',
	USERS_QUOTA_REACHED: 'Maximum number of users reached',
	OAUTH2_CREDENTIAL_TEST_SUCCEEDED: 'Connection Successful!',
	OAUTH2_CREDENTIAL_TEST_FAILED: 'This OAuth2 credential was not connected to an account.',
	MISSING_SCOPE: 'User is missing a scope required to perform this action',
} as const;

export const AUTH_COOKIE_NAME = 'n8n-auth';

export const NPM_COMMAND_TOKENS = {
	NPM_PACKAGE_NOT_FOUND_ERROR: '404 Not Found',
	NPM_PACKAGE_VERSION_NOT_FOUND_ERROR: 'No matching version found for',
	NPM_NO_VERSION_AVAILABLE: 'No valid versions available',
	NPM_DISK_NO_SPACE: 'ENOSPC',
	NPM_DISK_INSUFFICIENT_SPACE: 'insufficient space',
};

export const NPM_PACKAGE_STATUS_GOOD = 'OK';

export const UNKNOWN_FAILURE_REASON = 'Unknown failure reason';

export const WORKFLOW_REACTIVATE_INITIAL_TIMEOUT = 1000; // 1 second
export const WORKFLOW_REACTIVATE_MAX_TIMEOUT = 24 * 60 * 60 * 1000; // 1 day

export const SETTINGS_LICENSE_CERT_KEY = 'license.cert';

export const LICENSE_FEATURES = {
	SHARING: 'feat:sharing',
	LDAP: 'feat:ldap',
	SAML: 'feat:saml',
	LOG_STREAMING: 'feat:logStreaming',
	ADVANCED_EXECUTION_FILTERS: 'feat:advancedExecutionFilters',
	VARIABLES: 'feat:variables',
	SOURCE_CONTROL: 'feat:sourceControl',
	API_DISABLED: 'feat:apiDisabled',
	EXTERNAL_SECRETS: 'feat:externalSecrets',
	SHOW_NON_PROD_BANNER: 'feat:showNonProdBanner',
	WORKFLOW_HISTORY: 'feat:workflowHistory',
	DEBUG_IN_EDITOR: 'feat:debugInEditor',
	BINARY_DATA_S3: 'feat:binaryDataS3',
	MULTIPLE_MAIN_INSTANCES: 'feat:multipleMainInstances',
	WORKER_VIEW: 'feat:workerView',
	ADVANCED_PERMISSIONS: 'feat:advancedPermissions',
	PROJECT_ROLE_ADMIN: 'feat:projectRole:admin',
	PROJECT_ROLE_EDITOR: 'feat:projectRole:editor',
	PROJECT_ROLE_VIEWER: 'feat:projectRole:viewer',
} as const;

export const LICENSE_QUOTAS = {
	TRIGGER_LIMIT: 'quota:activeWorkflows',
	VARIABLES_LIMIT: 'quota:maxVariables',
	USERS_LIMIT: 'quota:users',
	WORKFLOW_HISTORY_PRUNE_LIMIT: 'quota:workflowHistoryPrune',
	TEAM_PROJECT_LIMIT: 'quota:maxTeamProjects',
} as const;
export const UNLIMITED_LICENSE_QUOTA = -1;

export const CREDENTIAL_BLANKING_VALUE = '__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6';

export const UM_FIX_INSTRUCTION =
	'Please fix the database by running ./packages/cli/bin/n8n user-management:reset';

/**
 * Units of time in milliseconds
 * @deprecated Please use constants.Time instead.
 */
export const TIME = {
	SECOND: 1000,
	MINUTE: 60 * 1000,
	HOUR: 60 * 60 * 1000,
	DAY: 24 * 60 * 60 * 1000,
} as const;

/**
 * Convert time from any unit to any other unit
 *
 * Please amend conversions as necessary.
 * Eventually this will superseed `TIME` above
 */
export const Time = {
	seconds: {
		toMilliseconds: 1000,
	},
	minutes: {
		toMilliseconds: 60 * 1000,
	},
	hours: {
		toMilliseconds: 60 * 60 * 1000,
		toSeconds: 60 * 60,
	},
	days: {
		toSeconds: 24 * 60 * 60,
		toMilliseconds: 24 * 60 * 60 * 1000,
	},
};

export const MIN_PASSWORD_CHAR_LENGTH = 8;

export const MAX_PASSWORD_CHAR_LENGTH = 64;

export const TEST_WEBHOOK_TIMEOUT = 2 * TIME.MINUTE;

export const TEST_WEBHOOK_TIMEOUT_BUFFER = 30 * TIME.SECOND;

export const N8N_DOCS_URL = 'https://docs.n8n.io';
