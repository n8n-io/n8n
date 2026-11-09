import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ownershipTransferManifest = require('../../cli/src/services/ownership-transfer/ownership-transfer.manifest.json');
const acknowledgedProjectOwnedEntities = [
	...ownershipTransferManifest.transferred,
	...ownershipTransferManifest.notTransferred,
].map(({ name, path }) => ({ name, path }));

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	ignorePatterns: ['scripts/**'],
	rules: {
		'n8n-local-rules/project-owned-entity-transfer': [
			'error',
			{ acknowledged: acknowledgedProjectOwnedEntities },
		],
	},
	overrides: [
		{
			files: ['src/migrations/**/*.ts'],
			rules: {
				'typescript/no-deprecated': 'off',
			},
		},
		{
			files: ['src/migrations/sqlite/1681134145996-AddUserActivatedProperty.ts'],
			rules: { 'typescript/no-base-to-string': 'warn' },
		},
		{
			files: ['src/migrations/sqlite/1646992772331-CreateUserManagement.ts'],
			rules: { 'no-useless-escape': 'warn' },
		},
		{
			files: ['**/*.test.ts', '**/__tests__/**/*.ts'],
			rules: { 'typescript/no-unsafe-return': 'warn' },
		},
		{
			files: ['./src/migrations/**/*.ts'],
			rules: { 'unicorn/filename-case': 'off' },
		},
	],
});
