import { Time } from '@n8n/constants';
import { readFileSync, statSync } from 'fs';
import type { n8n } from 'n8n-core';
import type { ITaskDataConnections } from 'n8n-workflow';
import { jsonParse, TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import { resolve, join, dirname } from 'path';

const { E2E_TESTS } = process.env;
export const inE2ETests = E2E_TESTS === 'true';

export const CUSTOM_API_CALL_NAME = 'Custom API Call';
export const CUSTOM_API_CALL_KEY = '__CUSTOM_API_CALL__';

export const CLI_DIR = resolve(__dirname, '..');
export const TEMPLATES_DIR = join(CLI_DIR, 'templates');
export const NODES_BASE_DIR = dirname(require.resolve('n8n-nodes-base'));
export const EDITOR_UI_DIST_DIR = join(dirname(require.resolve('n8n-editor-ui')), 'dist');

const packageJsonPath = join(CLI_DIR, 'package.json');
const n8nPackageJson = jsonParse<n8n.PackageJson>(readFileSync(packageJsonPath, 'utf8'));
export const N8N_VERSION = n8nPackageJson.version;
export const N8N_RELEASE_DATE = statSync(packageJsonPath).mtime;

export const STARTING_NODES = [
	'@n8n/n8n-nodes-langchain.manualChatTrigger',
	'n8n-nodes-base.start',
	'n8n-nodes-base.manualTrigger',
];

export const MCP_TRIGGER_NODE_TYPE = '@n8n/n8n-nodes-langchain.mcpTrigger';

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
export const OIDC_STATE_COOKIE_NAME = 'n8n-oidc-state';
export const OIDC_NONCE_COOKIE_NAME = 'n8n-oidc-nonce';

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

export const CREDENTIAL_BLANKING_VALUE = '__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6';

export const UM_FIX_INSTRUCTION =
	'Please fix the database by running ./packages/cli/bin/n8n user-management:reset';

export const TEST_WEBHOOK_TIMEOUT = 2 * Time.minutes.toMilliseconds;

export const TEST_WEBHOOK_TIMEOUT_BUFFER = 30 * Time.seconds.toMilliseconds;

export const GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE = [
	'oAuth2Api',
	'googleOAuth2Api',
	'microsoftOAuth2Api',
	'highLevelOAuth2Api',
];

export const ARTIFICIAL_TASK_DATA = {
	main: [
		[
			{
				json: { isArtificialRecoveredEventItem: true },
				pairedItem: undefined,
			},
		],
	],
};

/**
 * Connections for an item standing in for a manual execution data item too
 * large to be sent live via pubsub. This signals to the client to direct the
 * user to the execution history.
 */
export const TRIMMED_TASK_DATA_CONNECTIONS: ITaskDataConnections = {
	main: [
		[
			{
				json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true },
				pairedItem: undefined,
			},
		],
	],
};

/** Lowest priority, meaning shut down happens after other groups */
export const LOWEST_SHUTDOWN_PRIORITY = 0;
export const DEFAULT_SHUTDOWN_PRIORITY = 100;
/** Highest priority, meaning shut down happens before all other groups */
export const HIGHEST_SHUTDOWN_PRIORITY = 200;

export const WsStatusCodes = {
	CloseNormal: 1000,
	CloseGoingAway: 1001,
	CloseProtocolError: 1002,
	CloseUnsupportedData: 1003,
	CloseNoStatus: 1005,
	CloseAbnormal: 1006,
	CloseInvalidData: 1007,
} as const;

export const FREE_AI_CREDITS_CREDENTIAL_NAME = 'n8n free OpenAI API credits';
