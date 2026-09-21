import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import { configDefaults, mergeConfig } from 'vitest/config';

export default mergeConfig(createVitestConfigWithDecorators(), {
	test: {
		// One fork per file: tests register mocks in the shared `@n8n/di` Container.
		pool: 'forks',
		setupFiles: ['./test/setup-test-folder.ts'],
		// Vitest's default exclude does not cover dist; stale compiled tests there fail as CJS.
		exclude: [...configDefaults.exclude, '**/dist/**'],
	},
});
