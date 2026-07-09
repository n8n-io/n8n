import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import { tscEntityTransform } from '@n8n/vitest-config/tsc-entity-transform';
import path from 'node:path';
import { mergeConfig } from 'vite';
import { configDefaults } from 'vitest/config';

// TypeORM entities need real-tsc decorator metadata (see the plugin's docs for why
// oxc/SWC emit the wrong `design:type` for cross-file union columns). Scoping to
// `src/entities/**` keeps the cost contained: only the ~50 entity files pay the tsc
// price, while DI `@Service` constructor metadata — which oxc emits correctly —
// keeps the fast path for the rest of `src`.
const entitiesDir = path.resolve(__dirname, 'src', 'entities') + path.sep;

export default mergeConfig(createVitestConfigWithDecorators({}), {
	plugins: [
		tscEntityTransform({
			projectDir: __dirname,
			filter: (file) => file.startsWith(entitiesDir) && /\.tsx?$/.test(file),
		}),
	],
	test: {
		// Vitest 4's default exclude is only node_modules/.git — it does NOT cover dist.
		// Without this, compiled test files left in dist (tsc never deletes orphaned
		// output) get collected and fail (CJS `require('vitest')`). The build also
		// excludes test files now, but this guards against pre-existing stale artifacts.
		exclude: [...configDefaults.exclude, '**/dist/**'],
	},
});
