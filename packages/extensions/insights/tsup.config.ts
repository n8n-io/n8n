import { defineConfig } from 'tsup';

export default defineConfig({
	entry: [
		'src/backend/**/*.ts',
		'!src/backend/**/*.test.ts',
		'!src/backend/**/*.d.ts',
		'!src/backend/__tests__**/*',
	],
	outDir: 'dist/backend',
	format: ['cjs', 'esm'],
	dts: true,
	sourcemap: true,
	tsconfig: 'tsconfig.backend.json',
});
