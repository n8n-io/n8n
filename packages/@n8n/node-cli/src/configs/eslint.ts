// Included with peer dependency eslint
// eslint-disable-next-line import-x/no-extraneous-dependencies
import eslint from '@eslint/js';
import { globalIgnores } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importPlugin from 'eslint-plugin-import-x';
import n8nNodesPlugin from 'eslint-plugin-n8n-nodes-base';
import tseslint, { type ConfigArray } from 'typescript-eslint';

export const config: ConfigArray = tseslint.config(
	globalIgnores(['dist']),
	{
		files: ['**/*.ts'],
		extends: [
			eslint.configs.recommended,
			tseslint.configs.recommended,
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
			'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
		},
	},
	{
		files: ['./nodes/**/*.ts'],
		rules: {
			...n8nNodesPlugin.configs.nodes.rules,
			'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
			'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
			'n8n-nodes-base/node-param-type-options-max-value-present': 'off',
		},
	},
);

export default config;
