import swc from 'unplugin-swc';
import { mergeConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';
import { createVitestConfig } from './node.js';

const swcPlugin = swc.vite({
	jsc: {
		parser: {
			syntax: 'typescript',
			decorators: true,
		},
		transform: {
			legacyDecorator: true,
			decoratorMetadata: true,
		},
		target: 'es2022',
	},
	// Include node_modules TypeScript files (like @n8n/tournament)
	exclude: [],
});

export const createVitestConfigWithDecorators = (options: InlineConfig = {}) => {
	const baseConfig = createVitestConfig(options);
	return mergeConfig(baseConfig, {
		plugins: [swcPlugin],
		esbuild: false, // Disable esbuild - it doesn't support decoratorMetadata
		server: {
			deps: {
				// Inline all dependencies so SWC can transform TypeScript in node_modules
				// (e.g. `@n8n/tournament`).
				inline: [/.*/],
			},
		},
		test: {
			server: {
				deps: {
					// Load workspace packages that own the DI container or register services
					// from their built dist instead of source. Otherwise Vitest's pipeline loads
					// them as TS while CJS dist gets loaded via require, producing two `Container`
					// instances — one where `@Config`/`@Service` decorators registered, one used
					// by the test — and `Container.get(...)` returns undefined for everything.
					external: [/@n8n\/(di|config|constants)/, /n8n-workflow/],
				},
			},
		},
	});
};

export const vitestConfigWithDecorators = createVitestConfigWithDecorators();
