import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/useDeviceSupport.ts'],
	format: ['cjs', 'esm'],
	clean: true,
	dts: true,
	cjsInterop: true,
	splitting: true,
	sourcemap: true,
});
