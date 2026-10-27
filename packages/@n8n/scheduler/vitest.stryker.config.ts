// Vitest config used by Stryker only — NOT by `pnpm test`, NOT by CI unit runs.
//
// Scheduler is a pure package (no isolated-vm engine to swap out), so this is
// just the package's normal vitest setup with `include` narrowed to the
// colocated `__tests__` layout under `src/`, keeping the `@ -> ./src` alias.

import path from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import { createVitestConfig } from '@n8n/vitest-config/node';

export default mergeConfig(
	defineConfig({
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src'),
			},
		},
	}),
	createVitestConfig({
		include: ['src/**/__tests__/*.test.ts'],
	}),
);
