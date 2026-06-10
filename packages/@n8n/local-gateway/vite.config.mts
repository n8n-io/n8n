import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import svgLoader from 'vite-svg-loader';

// One ordinary Vite config for the whole app. `vite` = dev mode (renderer HMR,
// main-process hot restart, preload hot reload); `vite build` = production
// bundle. Output mirrors the original layout (dist/main, dist/renderer) so
// `package.json#main`, `start`, and electron-builder stay untouched.
// Vitest reads `vitest.config.ts` instead, so the two never collide.
//
// local-gateway lives at `packages/@n8n/local-gateway`, so `packages/` is two levels up.
const packagesDir = resolve(__dirname, '..', '..');
const designSystemSrc = resolve(packagesDir, 'frontend', '@n8n', 'design-system', 'src');

// The main process and preload keep node_modules resolution at runtime —
// native/workspace deps are never bundled.
const mainExternals = ['electron', 'electron-store', /^node:/, /^@n8n\/computer-use/];

export default defineConfig({
	// Loaded over `file://` in production, so assets must be referenced relatively.
	base: './',
	plugins: [
		vue(),
		// Design-system components import `.svg` files as Vue components (e.g. N8nLogo).
		svgLoader({
			svgoConfig: {
				plugins: [{ name: 'preset-default', params: { overrides: { removeViewBox: false } } }],
			},
		}),
		// `@n8n/design-system` icons import `~icons/lucide/*`; resolved from `@iconify/json`.
		icons({ compiler: 'vue3' }),
		electron({
			main: {
				entry: 'src/main/index.ts',
				vite: {
					build: {
						outDir: 'dist/main',
						// Main and preload share dist/main — neither may wipe the other's
						// output. `pnpm build` runs `rimraf dist` for a clean slate instead.
						emptyOutDir: false,
						rolldownOptions: { external: mainExternals },
					},
				},
			},
			preload: {
				input: 'src/main/preload.ts',
				vite: {
					build: {
						outDir: 'dist/main',
						emptyOutDir: false,
						rolldownOptions: {
							external: mainExternals,
							// The window runs with `sandbox: true`, which requires a CJS preload;
							// fix the name so `path.join(__dirname, 'preload.js')` keeps working.
							output: { format: 'cjs', entryFileNames: 'preload.js' },
						},
					},
				},
			},
			// No `renderer` option: the renderer is pure web (sandboxed, no node integration).
		}),
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
		outDir: 'dist/renderer',
		emptyOutDir: true,
	},
	server: {
		port: 5183,
		strictPort: true,
	},
});
