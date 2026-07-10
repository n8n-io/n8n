import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts', '!src/__tests__/**/*'],
	format: ['cjs', 'esm'],
	clean: true,
	// Use a build tsconfig that keeps `@n8n/design-system` external so its `.vue`
	// source is never parsed during declaration generation.
	dts: { tsconfig: 'tsconfig.build.json' },
	sourcemap: true,
	hash: false,
});
