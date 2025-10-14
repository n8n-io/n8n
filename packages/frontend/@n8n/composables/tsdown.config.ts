import { defineConfig } from 'tsdown';

// eslint-disable-next-line import-x/no-default-export
export default defineConfig({
	entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts', '!src/__tests__/**/*'],
	format: ['cjs', 'esm'],
	clean: true,
	dts: true,
	sourcemap: true,
});
