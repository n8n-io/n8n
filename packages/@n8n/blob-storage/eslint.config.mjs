import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(
	baseConfig,
	{
		// Relax type-aware unsafe rules for untyped mock plumbing, mirroring n8n-core
		files: ['**/__tests__/**/*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
		},
	},
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],

			/**
			 * This package is full of AWS SDK params (`Bucket`, `Key`, `Delete`) and
			 * HTTP header maps (`content-type`, `x-amz-meta-filename`).
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
	},
);
