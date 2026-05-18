import { mergeConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';
import { createVitestConfig } from './node.js';

export const createVitestConfigWithDecorators = (options: InlineConfig = {}) => {
	const baseConfig = createVitestConfig(options);
	return mergeConfig(baseConfig, {
		server: {
			deps: {
				// force vitest to inline node_modules deps instead of externalizing them
				inline: [/.*/],
			},
		},
	});
};

export const vitestConfigWithDecorators = createVitestConfigWithDecorators();
