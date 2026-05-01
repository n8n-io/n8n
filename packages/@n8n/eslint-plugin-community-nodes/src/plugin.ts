import type { ESLint, Linter } from 'eslint';

import pkg from '../package.json' with { type: 'json' };
import { rules } from './rules/index.js';

const plugin = {
	meta: {
		name: pkg.name,
		version: pkg.version,
		namespace: '@n8n/community-nodes',
	},
	// @ts-expect-error Rules type does not match for typescript-eslint and eslint
	rules: rules as ESLint.Plugin['rules'],
} satisfies ESLint.Plugin;

const configs = {
	recommended: {
		ignores: ['eslint.config.{js,mjs,ts,mts}'],
		plugins: {
			'@n8n/community-nodes': plugin,
		},
		rules: {
			'@n8n/community-nodes/ai-node-package-json': 'error',
			'@n8n/community-nodes/no-restricted-globals': 'error',
			'@n8n/community-nodes/no-restricted-imports': 'error',
			'@n8n/community-nodes/credential-password-field': 'error',
			'@n8n/community-nodes/no-deprecated-workflow-functions': 'error',
			'@n8n/community-nodes/node-usable-as-tool': 'error',
			'@n8n/community-nodes/package-name-convention': 'error',
			'@n8n/community-nodes/credential-test-required': 'error',
			'@n8n/community-nodes/no-credential-reuse': 'error',
			'@n8n/community-nodes/no-forbidden-lifecycle-scripts': 'error',
			'@n8n/community-nodes/no-http-request-with-manual-auth': 'error',
			'@n8n/community-nodes/no-overrides-field': 'error',
			'@n8n/community-nodes/icon-validation': 'error',
			'@n8n/community-nodes/options-sorted-alphabetically': 'warn',
			'@n8n/community-nodes/resource-operation-pattern': 'warn',
			'@n8n/community-nodes/credential-documentation-url': 'error',
			'@n8n/community-nodes/cred-class-field-icon-missing': 'error',
			'@n8n/community-nodes/node-connection-type-literal': 'error',
			'@n8n/community-nodes/missing-paired-item': 'error',
			'@n8n/community-nodes/require-community-node-keyword': 'warn',
			'@n8n/community-nodes/require-continue-on-fail': 'error',
			'@n8n/community-nodes/require-node-api-error': 'error',
			'@n8n/community-nodes/require-node-description-fields': 'error',
			'@n8n/community-nodes/valid-peer-dependencies': 'error',
			'@n8n/community-nodes/webhook-lifecycle-complete': 'error',
		},
	},
	recommendedWithoutN8nCloudSupport: {
		ignores: ['eslint.config.{js,mjs,ts,mts}'],
		plugins: {
			'@n8n/community-nodes': plugin,
		},
		rules: {
			'@n8n/community-nodes/ai-node-package-json': 'error',
			'@n8n/community-nodes/credential-password-field': 'error',
			'@n8n/community-nodes/no-deprecated-workflow-functions': 'error',
			'@n8n/community-nodes/node-usable-as-tool': 'error',
			'@n8n/community-nodes/package-name-convention': 'error',
			'@n8n/community-nodes/credential-test-required': 'error',
			'@n8n/community-nodes/no-credential-reuse': 'error',
			'@n8n/community-nodes/no-forbidden-lifecycle-scripts': 'error',
			'@n8n/community-nodes/no-http-request-with-manual-auth': 'error',
			'@n8n/community-nodes/no-overrides-field': 'error',
			'@n8n/community-nodes/icon-validation': 'error',
			'@n8n/community-nodes/options-sorted-alphabetically': 'warn',
			'@n8n/community-nodes/credential-documentation-url': 'error',
			'@n8n/community-nodes/resource-operation-pattern': 'warn',
			'@n8n/community-nodes/cred-class-field-icon-missing': 'error',
			'@n8n/community-nodes/node-connection-type-literal': 'error',
			'@n8n/community-nodes/missing-paired-item': 'error',
			'@n8n/community-nodes/require-community-node-keyword': 'warn',
			'@n8n/community-nodes/require-continue-on-fail': 'error',
			'@n8n/community-nodes/require-node-api-error': 'error',
			'@n8n/community-nodes/require-node-description-fields': 'error',
			'@n8n/community-nodes/valid-peer-dependencies': 'error',
			'@n8n/community-nodes/webhook-lifecycle-complete': 'error',
		},
	},
} satisfies Record<string, Linter.Config>;

const pluginWithConfigs = { ...plugin, configs } satisfies ESLint.Plugin;

const n8nCommunityNodesPlugin = pluginWithConfigs;
export default pluginWithConfigs;
export { rules, configs, n8nCommunityNodesPlugin };
