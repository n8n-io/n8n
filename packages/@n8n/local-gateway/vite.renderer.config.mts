import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import svgLoader from 'vite-svg-loader';

// Renderer (browser) build config. Passed explicitly via `--config` so it never
// collides with `vite.config.ts`, which configures Vitest for the main process.
//
// local-gateway lives at `packages/@n8n/local-gateway`, so `packages/` is two levels up.
const packagesDir = resolve(__dirname, '..', '..');
const designSystemSrc = resolve(packagesDir, 'frontend', '@n8n', 'design-system', 'src');

// The renderer is loaded by Electron via `loadFile(dist/renderer/index.html)`, i.e. over
// the `file://` protocol — so assets must be referenced relatively (`base: './'`).
export default defineConfig({
	root: __dirname,
	base: './',
	plugins: [
		vue(),
		// Design-system components import `.svg` files as Vue components (e.g. N8nLogo).
		svgLoader({
			svgoConfig: {
				plugins: [
					{ name: 'preset-default', params: { overrides: { removeViewBox: false } } },
				],
			},
		}),
		// `@n8n/design-system` icons import `~icons/lucide/*`; resolved from `@iconify/json`.
		icons({ compiler: 'vue3' }),
	],
	resolve: {
		alias: [
			// Map the design system onto its source. The bare-specifier alias is essential:
			// without it the barrel resolves through `node_modules` and Vite skips the Vue
			// transform on its SFCs. Both entries keep the whole package as project source.
			{ find: /^@n8n\/design-system$/, replacement: resolve(designSystemSrc, 'index.ts') },
			{ find: /^@n8n\/design-system(.+)$/, replacement: `${designSystemSrc}$1` },
		],
	},
	build: {
		outDir: resolve(__dirname, 'dist', 'renderer'),
		emptyOutDir: true,
	},
});
