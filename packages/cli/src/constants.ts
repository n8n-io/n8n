/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/naming-convention */
import { readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import type { n8n } from 'n8n-core';
import { RESPONSE_ERROR_MESSAGES as CORE_RESPONSE_ERROR_MESSAGES, UserSettings } from 'n8n-core';
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
export const GENERATED_STATIC_DIR = join(UserSettings.getUserHome(), '.cache/n8n/public');
export const EDITOR_UI_DIST_DIR = join(dirname(require.resolve('n8n-editor-ui')), 'dist');

export function getN8nPackageJson() {
	return jsonParse<n8n.PackageJson>(readFileSync(join(CLI_DIR, 'package.json'), 'utf8'));
}

export const START_NODES = ['n8n-nodes-base.start', 'n8n-nodes-base.manualTrigger'];

export const N8N_VERSION = getN8nPackageJson().version;

export const NODE_PACKAGE_PREFIX = 'n8n-nodes-';

export const STARTER_TEMPLATE_NAME = `${NODE_PACKAGE_PREFIX}starter`;

export const RESPONSE_ERROR_MESSAGES = {
	NO_CREDENTIAL: 'Credential not found',
	NO_NODE: 'Node not found',
	NO_ENCRYPTION_KEY: CORE_RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY,
	PACKAGE_NAME_NOT_PROVIDED: 'Package name is required',
	PACKAGE_NAME_NOT_VALID: `Package name is not valid - it must start with "${NODE_PACKAGE_PREFIX}"`,
	PACKAGE_NOT_INSTALLED: 'This package is not installed - you must install it first',
	PACKAGE_FAILED_TO_INSTALL: 'Package could not be installed - check logs for details',
	PACKAGE_NOT_FOUND: 'Package not found in npm',
	PACKAGE_VERSION_NOT_FOUND: 'The specified package version was not found',
	PACKAGE_DOES_NOT_CONTAIN_NODES: 'The specified package does not contain any nodes',
	PACKAGE_LOADING_FAILED: 'The specified package could not be loaded',
	DISK_IS_FULL: 'There appears to be insufficient disk space',
};

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

export enum LICENSE_FEATURES {
	SHARING = 'feat:sharing',
	LDAP = 'feat:ldap',
	SAML = 'feat:saml',
	LOG_STREAMING = 'feat:logStreaming',
	ADVANCED_EXECUTION_FILTERS = 'feat:advancedExecutionFilters',
	VARIABLES = 'feat:variables',
	VERSION_CONTROL = 'feat:versionControl',
}

export enum LICENSE_QUOTAS {
	TRIGGER_LIMIT = 'quota:activeWorkflows',
	VARIABLES_LIMIT = 'quota:maxVariables',
}

export const CREDENTIAL_BLANKING_VALUE = '__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6';
