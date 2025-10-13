import type { ESLint, Linter } from 'eslint';
import { rules } from './rules/index.js';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const plugin = {
	meta: {
		name: pkg.name,
		version: pkg.version,
		namespace: '@n8n/eslint-plugin-community-nodes',
	},
	// @ts-expect-error Rules type does not match for typescript-eslint and eslint
	rules: rules as ESLint.Plugin['rules'],
} satisfies ESLint.Plugin;

const configs = {
	recommended: {
		ignores: ['eslint.config.{js,mjs,ts,mts}'],
		plugins: {
			'@n8n/eslint-plugin-community-nodes': plugin,
		},
		rules: {
			'@n8n/eslint-plugin-community-nodes/no-restricted-globals': 'error',
			'@n8n/eslint-plugin-community-nodes/no-restricted-imports': 'error',
			'@n8n/eslint-plugin-community-nodes/credential-password-field': 'error',
			'@n8n/eslint-plugin-community-nodes/no-deprecated-workflow-functions': 'error',
			'@n8n/eslint-plugin-community-nodes/node-usable-as-tool': 'error',
			'@n8n/eslint-plugin-community-nodes/package-name-convention': 'error',
			'@n8n/eslint-plugin-community-nodes/credential-test-required': 'error',
			'@n8n/eslint-plugin-community-nodes/no-credential-reuse': 'error',
			'@n8n/eslint-plugin-community-nodes/icon-validation': 'error',
			'@n8n/eslint-plugin-community-nodes/resource-operation-pattern': 'warn',
		},
	},
	recommendedWithoutN8nCloudSupport: {
		ignores: ['eslint.config.{js,mjs,ts,mts}'],
		plugins: {
			'@n8n/eslint-plugin-community-nodes': plugin,
		},
		rules: {
			'@n8n/eslint-plugin-community-nodes/credential-password-field': 'error',
			'@n8n/eslint-plugin-community-nodes/no-deprecated-workflow-functions': 'error',
			'@n8n/eslint-plugin-community-nodes/node-usable-as-tool': 'error',
			'@n8n/eslint-plugin-community-nodes/package-name-convention': 'error',
			'@n8n/eslint-plugin-community-nodes/credential-test-required': 'error',
			'@n8n/eslint-plugin-community-nodes/no-credential-reuse': 'error',
			'@n8n/eslint-plugin-community-nodes/icon-validation': 'error',
			'@n8n/eslint-plugin-community-nodes/resource-operation-pattern': 'warn',
		},
	},
} satisfies Record<string, Linter.Config>;

export const n8nCommunityNodesPlugin = { ...plugin, configs } satisfies ESLint.Plugin;
export default n8nCommunityNodesPlugin;
