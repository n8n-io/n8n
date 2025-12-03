import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/**/*.ts', '!**/*.d.ts', '!**/*.test.ts'],
	format: ['cjs'],
	clean: true,
	dts: true,
	bundle: false,
	sourcemap: true,
	silent: true,
});
