import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import icons from 'unplugin-icons/vite';
import svgLoader from 'vite-svg-loader';
import { defineConfig, mergeConfig } from 'vite';
import { frontendAliases } from '@n8n/frontend-vite-config';
import { vitestConfig } from '@n8n/vitest-config/frontend';

const packageDir = fileURLToPath(new URL('.', import.meta.url));
const packagesDir = resolve(packageDir, '..', '..', '..');

export default mergeConfig(
	defineConfig({
		// `@n8n/design-system`'s icon set reaches for two things Vite does not handle on its
		// own: `~icons/lucide/*` virtual modules and `./custom/*.svg` single-file components.
		// Consuming design-system from source makes both the consumer's problem — without
		// `svgLoader` an `.svg` import returns a data-URI string, which Vue then renders as a
		// tag name and jsdom rejects. Every module that renders a design-system component
		// needs these two plugins.
		plugins: [
			vue(),
			// Off, so a test never reaches the network for a missing collection.
			icons({ compiler: 'vue3', autoInstall: false }),
			svgLoader({
				svgoConfig: {
					plugins: [
						{
							name: 'preset-default',
							params: {
								overrides: {
									// The icons rely on their ids, and on a viewBox to stay scalable.
									cleanupIds: false,
									removeViewBox: false,
								},
							},
						},
					],
				},
			}),
		],
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
