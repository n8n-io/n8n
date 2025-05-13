import { defineConfig } from 'tsup';

export function defineN8nExtensionTsupConfig() {
	return defineConfig({
		entry: [
			'src/backend/**/*.ts',
			'!src/backend/**/*.test.ts',
			'!src/backend/**/*.d.ts',
			'!**/__tests__/**/*',
		],
		outDir: 'dist/backend',
		format: ['cjs', 'esm'],
		dts: true,
		sourcemap: true,
		tsconfig: 'tsconfig.backend.json',
	});
}
