import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/client.ts'],
	format: 'esm',
	clean: false,
	tsconfig: 'tsconfig.build.json',
	dts: { emitDtsOnly: true },
	outExtensions: () => ({ dts: '.d.ts' }),
});
