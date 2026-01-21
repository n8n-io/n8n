import swcTransform from 'vite-plugin-swc-transform';
import { defineConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';

/**
 * Creates a Vitest config for packages that use TypeScript decorators.
 * Uses SWC for transpilation to support `emitDecoratorMetadata`.
 *
 * @example
 * // vitest.config.ts
 * import { createVitestDecoratorConfig } from '@n8n/vitest-config/node-decorators';
 * export default createVitestDecoratorConfig();
 */
export const createVitestDecoratorConfig = (options: InlineConfig = {}) => {
	return defineConfig({
		test: {
			silent: true,
			globals: true,
			environment: 'node',
			...(process.env.COVERAGE_ENABLED === 'true'
				? {
						coverage: {
							enabled: true,
							provider: 'v8',
							reporter: process.env.CI === 'true' ? 'cobertura' : 'text-summary',
							all: true,
						},
					}
				: {}),
			...options,
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		plugins: [
			swcTransform({
				swcOptions: {
					jsc: {
						parser: {
							syntax: 'typescript',
							decorators: true,
						},
						transform: {
							legacyDecorator: true,
							decoratorMetadata: true,
							useDefineForClassFields: false,
						},
						target: 'es2022',
					},
					module: {
						type: 'es6',
					},
				},
				// Type cast needed due to vite version mismatch (rolldown-vite vs vite)
			}) as any,
		],
	});
};

export const vitestDecoratorConfig = createVitestDecoratorConfig();
