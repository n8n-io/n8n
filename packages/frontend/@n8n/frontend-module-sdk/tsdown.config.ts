import { defineConfig } from 'tsdown';

// `src/index.ts` is the only public entry point, so the whole package is
// bundled through it rather than emitted file-by-file.
export default defineConfig({
	entry: ['src/index.ts'],
	format: ['cjs', 'esm'],
	clean: true,
	dts: true,
	sourcemap: true,
	hash: false,
});
