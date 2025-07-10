import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['{credentials,nodes,test,types,utils}/**/*.ts', '!**/*.d.ts', '!**/*.test.ts'],
	format: ['cjs'],
	clean: true,
	dts: false,
	bundle: false,
	sourcemap: true,
	silent: true,
});
