import swcTransform from 'vite-plugin-swc-transform';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		// Force @n8n/tournament to use CJS build (its ESM export points to TypeScript source)
		alias: {
			'@n8n/tournament': '@n8n/tournament/dist/index.js',
		},
	},
	test: {
		silent: true,
		globals: true,
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
	plugins: [
		swcTransform({
			include: [/\.tsx?$/, /@n8n\/tournament/],
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
		}),
	],
});
