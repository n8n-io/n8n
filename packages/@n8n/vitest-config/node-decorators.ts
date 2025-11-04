import { mergeConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';

import { createVitestConfig } from './node.js';

/**
 * SWC options for TypeScript decorator metadata support.
 * Use with `unplugin-swc` in consuming packages.
 *
 * @example
 * ```typescript
 * // vitest.config.ts
 * import swc from 'unplugin-swc';
 * import { mergeConfig } from 'vitest/config';
 * import { createVitestConfigNodeWithDecorators, swcOptions } from '@n8n/vitest-config/node-decorators';
 *
 * export default mergeConfig(
 *   createVitestConfigNodeWithDecorators(),
 *   { plugins: [swc.vite(swcOptions)] }
 * );
 * ```
 */
export const swcOptions = {
	jsc: {
		parser: {
			syntax: 'typescript' as const,
			decorators: true,
		},
		transform: {
			legacyDecorator: true,
			decoratorMetadata: true,
		},
		target: 'es2022' as const,
	},
};

/**
 * Vitest config for Node.js packages that use TypeScript decorator metadata.
 * Requires `swc` because `esbuild` does not support `emitDecoratorMetadata`.
 *
 * **Important**: Consuming packages must:
 * 1. Install `unplugin-swc` as a devDependency
 * 2. Add the swc plugin using `swcOptions` (see example above)
 */
export const createVitestConfigNodeWithDecorators = (testOptions: InlineConfig = {}) => {
	const baseNodeConfig = createVitestConfig(testOptions);

	return mergeConfig(baseNodeConfig, {
		esbuild: false,
		resolve: {
			alias: {
				'@n8n/tournament': '@n8n/tournament/dist/index.js',
			},
		},
		...testOptions,
	});
};

export const vitestConfigNodeWithDecorators = createVitestConfigNodeWithDecorators();
