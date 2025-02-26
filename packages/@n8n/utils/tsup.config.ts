import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/**/*.ts'],
	format: ['cjs', 'esm'],
	clean: true,
	dts: true,
	cjsInterop: true,
	splitting: true,
	sourcemap: true,
});
