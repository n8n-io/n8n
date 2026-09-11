import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';
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
	backendConfig,
	{
		rules: {
			'n8n-local-rules/project-owned-entity-transfer': [
				'error',
				{ acknowledged: acknowledgedProjectOwnedEntities },
			],

			'@typescript-eslint/no-base-to-string': 'warn',
			'@typescript-eslint/no-restricted-types': 'warn',
			'no-useless-escape': 'warn',
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
