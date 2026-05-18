import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import { vitestConfig } from '@n8n/vitest-config/node';

export default mergeConfig(
	defineConfig({
		test: {
			server: {
				deps: {
					// Load workspace packages from their built dist so decorators
					// share a single DI Container instance across packages.
					external: [/@n8n\/(di|config|decorators|constants)/, /n8n-workflow/],
				},
			},
		},
	}),
	vitestConfig,
);
