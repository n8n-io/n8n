import { defineConfig, globalIgnores } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(
	globalIgnores(['scripts/**', 'examples/**', 'dist/**']),
	baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		},
	},
	{
		// Tests legitimately mock `Response`-like objects (whose `.json()` /
		// `.text()` are async by spec) and poke at the dynamic proxy through
		// `unknown`-typed accessors. The rules below collide with those
		// idiomatic patterns; we relax them only for test files.
		files: ['**/__tests__/**/*.ts', '**/*.test.ts'],
		rules: {
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/promise-function-async': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			// Tests inspect serialized request bodies via JSON.parse; a parse
			// failure there is itself a useful test signal, so the surrounding
			// try/catch noise isn't worth its weight.
			'n8n-local-rules/no-uncaught-json-parse': 'off',
		},
	},
);
