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
		// The renderer of this package installs `N8nPlugin`, so its own suite compiles
		// design-system from source. That needs the same two plugins every module needs: the
		// `~icons/lucide/*` virtual modules and the `./custom/*.svg` single-file components.
		plugins: [
			vue(),
			icons({ compiler: 'vue3', autoInstall: false }),
			svgLoader({
				svgoConfig: {
					plugins: [
						{
							name: 'preset-default',
							params: {
								overrides: { cleanupIds: false, removeViewBox: false },
							},
						},
					],
				},
			}),
		],
		resolve: {
			alias: frontendAliases(packagesDir),
		},
	}),
	vitestConfig,
);
