'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.FREE_AI_CREDITS_CREDENTIAL_NAME =
	exports.WsStatusCodes =
	exports.HIGHEST_SHUTDOWN_PRIORITY =
	exports.DEFAULT_SHUTDOWN_PRIORITY =
	exports.LOWEST_SHUTDOWN_PRIORITY =
	exports.TRIMMED_TASK_DATA_CONNECTIONS =
	exports.ARTIFICIAL_TASK_DATA =
	exports.GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE =
	exports.TEST_WEBHOOK_TIMEOUT_BUFFER =
	exports.TEST_WEBHOOK_TIMEOUT =
	exports.UM_FIX_INSTRUCTION =
	exports.CREDENTIAL_BLANKING_VALUE =
	exports.SETTINGS_LICENSE_CERT_KEY =
	exports.WORKFLOW_REACTIVATE_MAX_TIMEOUT =
	exports.WORKFLOW_REACTIVATE_INITIAL_TIMEOUT =
	exports.UNKNOWN_FAILURE_REASON =
	exports.NPM_PACKAGE_STATUS_GOOD =
	exports.NPM_COMMAND_TOKENS =
	exports.AUTH_COOKIE_NAME =
	exports.RESPONSE_ERROR_MESSAGES =
	exports.STARTER_TEMPLATE_NAME =
	exports.NODE_PACKAGE_PREFIX =
	exports.MCP_TRIGGER_NODE_TYPE =
	exports.STARTING_NODES =
	exports.N8N_RELEASE_DATE =
	exports.N8N_VERSION =
	exports.EDITOR_UI_DIST_DIR =
	exports.NODES_BASE_DIR =
	exports.TEMPLATES_DIR =
	exports.CLI_DIR =
	exports.CUSTOM_API_CALL_KEY =
	exports.CUSTOM_API_CALL_NAME =
	exports.inE2ETests =
		void 0;
const constants_1 = require('@n8n/constants');
const fs_1 = require('fs');
const n8n_workflow_1 = require('n8n-workflow');
const path_1 = require('path');
const { E2E_TESTS } = process.env;
exports.inE2ETests = E2E_TESTS === 'true';
exports.CUSTOM_API_CALL_NAME = 'Custom API Call';
exports.CUSTOM_API_CALL_KEY = '__CUSTOM_API_CALL__';
exports.CLI_DIR = (0, path_1.resolve)(__dirname, '..');
exports.TEMPLATES_DIR = (0, path_1.join)(exports.CLI_DIR, 'templates');
exports.NODES_BASE_DIR = (0, path_1.dirname)(require.resolve('n8n-nodes-base'));
exports.EDITOR_UI_DIST_DIR = (0, path_1.join)(
	(0, path_1.dirname)(require.resolve('n8n-editor-ui')),
	'dist',
);
const packageJsonPath = (0, path_1.join)(exports.CLI_DIR, 'package.json');
const n8nPackageJson = (0, n8n_workflow_1.jsonParse)(
	(0, fs_1.readFileSync)(packageJsonPath, 'utf8'),
);
exports.N8N_VERSION = n8nPackageJson.version;
exports.N8N_RELEASE_DATE = (0, fs_1.statSync)(packageJsonPath).mtime;
exports.STARTING_NODES = [
	'@n8n/n8n-nodes-langchain.manualChatTrigger',
	'n8n-nodes-base.start',
	'n8n-nodes-base.manualTrigger',
];
exports.MCP_TRIGGER_NODE_TYPE = '@n8n/n8n-nodes-langchain.mcpTrigger';
exports.NODE_PACKAGE_PREFIX = 'n8n-nodes-';
exports.STARTER_TEMPLATE_NAME = `${exports.NODE_PACKAGE_PREFIX}starter`;
exports.RESPONSE_ERROR_MESSAGES = {
	NO_CREDENTIAL: 'Credential not found',
	NO_NODE: 'Node not found',
	PACKAGE_NAME_NOT_PROVIDED: 'Package name is required',
	PACKAGE_NAME_NOT_VALID: `Package name is not valid - it must start with "${exports.NODE_PACKAGE_PREFIX}"`,
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
};
exports.AUTH_COOKIE_NAME = 'n8n-auth';
exports.NPM_COMMAND_TOKENS = {
	NPM_PACKAGE_NOT_FOUND_ERROR: '404 Not Found',
	NPM_PACKAGE_VERSION_NOT_FOUND_ERROR: 'No matching version found for',
	NPM_NO_VERSION_AVAILABLE: 'No valid versions available',
	NPM_DISK_NO_SPACE: 'ENOSPC',
	NPM_DISK_INSUFFICIENT_SPACE: 'insufficient space',
};
exports.NPM_PACKAGE_STATUS_GOOD = 'OK';
exports.UNKNOWN_FAILURE_REASON = 'Unknown failure reason';
exports.WORKFLOW_REACTIVATE_INITIAL_TIMEOUT = 1000;
exports.WORKFLOW_REACTIVATE_MAX_TIMEOUT = 24 * 60 * 60 * 1000;
exports.SETTINGS_LICENSE_CERT_KEY = 'license.cert';
exports.CREDENTIAL_BLANKING_VALUE = '__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6';
exports.UM_FIX_INSTRUCTION =
	'Please fix the database by running ./packages/cli/bin/n8n user-management:reset';
exports.TEST_WEBHOOK_TIMEOUT = 2 * constants_1.Time.minutes.toMilliseconds;
exports.TEST_WEBHOOK_TIMEOUT_BUFFER = 30 * constants_1.Time.seconds.toMilliseconds;
exports.GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE = [
	'oAuth2Api',
	'googleOAuth2Api',
	'microsoftOAuth2Api',
	'highLevelOAuth2Api',
];
exports.ARTIFICIAL_TASK_DATA = {
	main: [
		[
			{
				json: { isArtificialRecoveredEventItem: true },
				pairedItem: undefined,
			},
		],
	],
};
exports.TRIMMED_TASK_DATA_CONNECTIONS = {
	main: [
		[
			{
				json: { [n8n_workflow_1.TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true },
				pairedItem: undefined,
			},
		],
	],
};
exports.LOWEST_SHUTDOWN_PRIORITY = 0;
exports.DEFAULT_SHUTDOWN_PRIORITY = 100;
exports.HIGHEST_SHUTDOWN_PRIORITY = 200;
exports.WsStatusCodes = {
	CloseNormal: 1000,
	CloseGoingAway: 1001,
	CloseProtocolError: 1002,
	CloseUnsupportedData: 1003,
	CloseNoStatus: 1005,
	CloseAbnormal: 1006,
	CloseInvalidData: 1007,
};
exports.FREE_AI_CREDITS_CREDENTIAL_NAME = 'n8n free OpenAI API credits';
//# sourceMappingURL=constants.js.map
