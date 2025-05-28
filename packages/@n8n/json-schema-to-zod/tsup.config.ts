import { defineConfig } from 'tsup';

export default defineConfig(
	(['esm', 'cjs'] as const).map((format) => ({
		entry: ['src/**/*.ts'],
		format,
		outDir: `dist/${format}`,
		clean: true,
		dts: true,
		cjsInterop: false,
		splitting: false,
	})),
);
