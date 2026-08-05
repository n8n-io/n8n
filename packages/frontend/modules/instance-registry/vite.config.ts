import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vite';
import { frontendSourceAliases } from '@n8n/vitest-config/frontend-aliases';
import { vitestConfig } from '@n8n/vitest-config/frontend';

const packageDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(packageDir, '..', '..', '..', '..');

export default mergeConfig(
	defineConfig({
		plugins: [vue()],
		resolve: {
			// The same filesystem-derived mapping the editor-ui dev server uses, narrowed to this
			// package's declared dependencies — so a test resolves `@n8n/stores/...` from source
			// rather than from a stale `dist`.
			alias: frontendSourceAliases({ repoRoot, consumerDir: packageDir }),
		},
	}),
	vitestConfig,
);
