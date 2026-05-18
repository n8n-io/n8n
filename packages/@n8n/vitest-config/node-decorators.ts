import { mergeConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';
import { createVitestConfig } from './node.js';

export const createVitestConfigWithDecorators = (options: InlineConfig = {}) => {
	const baseConfig = createVitestConfig(options);
	return mergeConfig(baseConfig, {
		server: {
			deps: {
				// Inline all dependencies so SWC can transform them (including TypeScript in node_modules)
				inline: [/.*/],
			},
		},
	});
};

export const vitestConfigWithDecorators = createVitestConfigWithDecorators();
