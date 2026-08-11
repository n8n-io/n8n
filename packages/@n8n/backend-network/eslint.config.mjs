import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(baseConfig, {
	rules: {
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],

		/**
		 * This package is full of HTTP header maps (`Content-Type`, `Authorization`, `X-Custom-Header`)
		 * and charset identifiers (`iso-8859-15`, `windows-1252`).
		 */
		'@typescript-eslint/naming-convention': [
			'error',
			{ selector: 'default', format: ['camelCase'] },
			{ selector: 'import', format: ['camelCase', 'PascalCase'] },
			{
				selector: 'variable',
				format: ['camelCase', 'snake_case', 'UPPER_CASE', 'PascalCase'],
				leadingUnderscore: 'allowSingleOrDouble',
				trailingUnderscore: 'allowSingleOrDouble',
			},
			{
				selector: 'property',
				format: ['camelCase', 'snake_case', 'UPPER_CASE'],
				leadingUnderscore: 'allowSingleOrDouble',
				trailingUnderscore: 'allowSingleOrDouble',
			},
			{ selector: 'typeLike', format: ['PascalCase'] },
			{
				selector: ['method', 'function', 'parameter'],
				format: ['camelCase'],
				leadingUnderscore: 'allowSingleOrDouble',
			},
			{ selector: ['objectLiteralProperty', 'typeProperty'], format: null },
		],
	},
});
