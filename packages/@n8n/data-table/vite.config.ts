import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import path from 'node:path';
import { mergeConfig } from 'vite';

export default mergeConfig(createVitestConfigWithDecorators(), {
	resolve: {
		alias: {
			// Resolve the test-utils to source so Vite transforms it (ESM). Otherwise
			// it is externalized and its `import ... from 'vitest'` runs as a CJS
			// `require`, which Vitest 4 rejects. Mirrors the cli test config.
			'@n8n/backend-test-utils': path.resolve(__dirname, '../backend-test-utils/src/index.ts'),
			// The package-hosted module entrypoint can't self-resolve as a bare
			// specifier inside its own test run; point it at source.
			'@n8n/data-table/module': path.resolve(__dirname, 'src/data-table.module.ts'),
		},
	},
});
