import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Single source of truth for project-owned entity transfer decisions
const ownershipTransferManifest = require('../../cli/src/services/ownership-transfer/ownership-transfer.manifest.json');
const acknowledgedProjectOwnedEntities = [
	...ownershipTransferManifest.transferred,
	...ownershipTransferManifest.notTransferred,
].map(({ name, path }) => ({ name, path }));

export default defineConfig(
	{
		ignores: ['scripts/**'],
	},
	baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
			'n8n-local-rules/project-owned-entity-transfer': [
				'error',
				{ acknowledged: acknowledgedProjectOwnedEntities },
			],

			// TODO: Remove this
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/prefer-nullish-coalescing': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
			'@typescript-eslint/no-base-to-string': 'warn',
			'@typescript-eslint/require-await': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-function-type': 'warn',
			'@typescript-eslint/no-empty-object-type': 'warn',
			'@typescript-eslint/no-restricted-types': 'warn',
			'no-useless-escape': 'warn',
			'no-empty': 'warn',
		},
	},
	{
		files: ['**/*.test.ts', '**/__tests__/**/*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-return': 'warn',
		},
	},
	{
		files: ['./src/migrations/**/*.ts'],
		rules: {
			'unicorn/filename-case': 'off',
		},
	},
);
