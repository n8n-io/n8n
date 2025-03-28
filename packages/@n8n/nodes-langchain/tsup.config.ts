// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
	entry: ['{credentials,nodes,test,types,utils}/**/*.ts', '!**/*.d.ts', '!**/*.test.ts'],
	format: ['cjs'],
	clean: true,
	dts: false,
	bundle: false,
});
