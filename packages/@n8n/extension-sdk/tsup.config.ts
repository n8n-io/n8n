import { defineConfig } from 'tsup';

export default defineConfig([
	{
		clean: true,
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
	},
	{
		clean: true,
		entry: [
			'src/frontend/**/*.ts',
			'!src/frontend/**/*.test.ts',
			'!src/frontend/**/*.d.ts',
			'!src/frontend/__tests__**/*',
		],
		outDir: 'dist/frontend',
		format: ['cjs', 'esm'],
		dts: true,
		sourcemap: true,
		tsconfig: 'tsconfig.frontend.json',
	},
]);
