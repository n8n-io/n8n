import { defineConfig, globalIgnores } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(
	// Stryker-only config, not part of any tsconfig project (like the shared
	// base's own vite.config.ts / vitest.config.ts ignores). `.stryker-tmp` is
	// ignored too: an interrupted mutation run leaves a sandbox behind that
	// would otherwise fail `pnpm lint` with parsing errors.
	globalIgnores(['stryker.config.mjs', 'vitest.stryker.config.ts', '.stryker-tmp/**']),
	baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		},
	},
	{
		// This package must stay free of DB/DI coupling: it declares the contracts,
		// the host (cli's DurableScheduler) satisfies them.
		files: ['src/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: ['@n8n/db', '@n8n/di', '@n8n/typeorm'],
				},
			],
		},
	},
);
