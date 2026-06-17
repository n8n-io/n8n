import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts', '!src/__tests__/**/*'],
	format: ['cjs', 'esm'],
	clean: true,
	dts: true,
	sourcemap: true,
	hash: false,
});
