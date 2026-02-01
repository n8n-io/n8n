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
				// Inline all dependencies so SWC can transform them (including TypeScript in node_modules)
				inline: [/.*/],
			},
		},
	});
};

export const vitestConfigWithDecorators = createVitestConfigWithDecorators();
