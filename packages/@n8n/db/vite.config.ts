import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import { tscDecoratorTransform } from '@n8n/vitest-config/tsc-decorator-transform';
import { mergeConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default mergeConfig(createVitestConfigWithDecorators({}), {
	plugins: [tscDecoratorTransform({ projectDir: __dirname, entityDirectories: ['src/entities'] })],
	test: {
		// Vitest 4's default exclude is only node_modules/.git — it does NOT cover dist.
		// Without this, compiled test files left in dist (tsc never deletes orphaned
		// output) get collected and fail (CJS `require('vitest')`). The build also
		// excludes test files now, but this guards against pre-existing stale artifacts.
		exclude: [...configDefaults.exclude, '**/dist/**'],
	},
});
