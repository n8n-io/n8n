import eslint from '@eslint/js';
import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';
import { globalIgnores } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importPlugin from 'eslint-plugin-import-x';
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
				'no-console': 'error',
			},
			settings: {
				'import-x/resolver-next': [createTypeScriptImportResolver()],
			},
		},
		{
			files: ['package.json'],
			languageOptions: {
				parser: tseslint.parser,
				parserOptions: {
					extraFileExtensions: ['.json'],
				},
			},
		},
	);
}

export const config = createConfig();
export const configWithoutCloudSupport = createConfig(false);

export default config;
