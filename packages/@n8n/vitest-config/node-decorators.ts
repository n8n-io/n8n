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
});

/**
 * Vitest config for Node.js packages that use TypeScript decorator metadata.
 * Requires `swc` because `esbuild` does not support `emitDecoratorMetadata`.
 */
export const createVitestConfigNodeWithDecorators = (testOptions: InlineConfig = {}) => {
	const baseNodeConfig = createVitestConfig(testOptions);

	return mergeConfig(baseNodeConfig, {
		plugins: [swcPlugin],
		esbuild: false,
		resolve: {
			alias: {
				'@n8n/tournament': '@n8n/tournament/dist/index.js',
			},
		},
	});
};

export const vitestConfigNodeWithDecorators = createVitestConfigNodeWithDecorators();
