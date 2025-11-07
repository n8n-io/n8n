import eslint from '@eslint/js';
import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';
import { globalIgnores } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importPlugin from 'eslint-plugin-import-x';
import n8nNodesPlugin from 'eslint-plugin-n8n-nodes-base';
import tseslint, { type ConfigArray } from 'typescript-eslint';

function createConfig(supportCloud = true): ConfigArray {
	return tseslint.config(
		globalIgnores(['dist']),
		{
			files: ['**/*.ts'],
			extends: [
				eslint.configs.recommended,
				tseslint.configs.recommended,
				supportCloud
					? n8nCommunityNodesPlugin.configs.recommended
					: n8nCommunityNodesPlugin.configs.recommendedWithoutN8nCloudSupport,
				importPlugin.configs['flat/recommended'],
			],
			rules: {
				'prefer-spread': 'off',
			},
		},
		{
			plugins: { 'n8n-nodes-base': n8nNodesPlugin },
			settings: {
				'import-x/resolver-next': [createTypeScriptImportResolver()],
			},
		},
		{
			files: ['package.json'],
			rules: {
				...n8nNodesPlugin.configs.community.rules,
			},
			languageOptions: {
				parser: tseslint.parser,
				parserOptions: {
					extraFileExtensions: ['.json'],
				},
			},
		},
		{
			files: ['./credentials/**/*.ts'],
			rules: {
				...n8nNodesPlugin.configs.credentials.rules,
				// Not valid for community nodes
				'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
				// @n8n/eslint-plugin-community-nodes credential-password-field rule is more accurate
				'n8n-nodes-base/cred-class-field-type-options-password-missing': 'off',
			},
		},
		{
			files: ['./nodes/**/*.ts'],
			rules: {
				...n8nNodesPlugin.configs.nodes.rules,
				// Inputs and outputs can be enum instead of string "main"
				'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
				'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
				// Sometimes the 3rd party API does have a maximum limit, so maxValue is valid
				'n8n-nodes-base/node-param-type-options-max-value-present': 'off',
			},
		},
	);
}
export const config = createConfig();
export const configWithoutCloudSupport = createConfig(false);

export default config;
