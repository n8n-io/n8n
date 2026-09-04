import vue from '@vitejs/plugin-vue';
import icons from 'unplugin-icons/vite';
import svgLoader from 'vite-svg-loader';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vite';
import { frontendAliases } from '@n8n/frontend-vite-config';
import { vitestConfig } from '@n8n/vitest-config/frontend';

const packageDir = fileURLToPath(new URL('.', import.meta.url));
const packagesDir = resolve(packageDir, '..', '..', '..');

export default mergeConfig(
	defineConfig({
		// What lets a test render a design-system component. Its icon set imports
		// `~icons/lucide/*` (unplugin-icons) and `./custom/*.svg` (svgLoader); without
		// either, an icon resolves to a URL string and rendering throws. The shared
		// vitest config stubs only the `nodes/*.svg` subset.
		plugins: [vue(), icons({ compiler: 'vue3' }), svgLoader()],
		resolve: {
			// The same platform mapping the editor-ui dev server uses, so a test resolves
			// `@n8n/stores/...` from source rather than from a stale `dist` — the two disagreeing is
			// what put 1,111 specifiers on the wrong side of the src/dist line. Sibling modules are
			// deliberately absent: nothing here should make a cross-module import resolve.
			alias: frontendAliases(packagesDir),
		},
	}),
	vitestConfig,
);
