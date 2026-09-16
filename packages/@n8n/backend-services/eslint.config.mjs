import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	backendConfig,
	{
		rules: {
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'error',
		},
	},
	{
		files: ['src/**/__tests__/**/*.ts'],
		rules: {
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',
		},
	},
	{
		// Ratchet allowlist: TypeORM leaks that moved here from cli, pending migration to
		// use-case repository methods in @n8n/db. NEVER add to this list — a new leak must fail CI.
		files: [
			'src/credentials/credentials-finder.service.ts',
			'src/services/folder-finder.service.ts',
			'src/services/role-cache.service.ts',
			'src/services/role.service.ts',
		],
		rules: {
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',
		},
	},
);
