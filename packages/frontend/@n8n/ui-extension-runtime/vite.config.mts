import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import icons from 'unplugin-icons/vite';
import { defineConfig, mergeConfig, type Plugin } from 'vite';
import svgLoader from 'vite-svg-loader';
import { vitestConfig } from '@n8n/vitest-config/frontend';

const designSystemSrc = resolve(__dirname, '..', 'design-system', 'src');
const apiTypesSrc = resolve(__dirname, '..', '..', '..', '@n8n', 'api-types', 'src');

/**
 * `N8nIcon` loads the node icon set on demand. The runtime is one IIFE, so a
 * dynamic import would be inlined, and views do not draw node icons. This
 * replaces the set with an empty one.
 */
function emptyNodeIconSet(): Plugin {
	const nodeIcons = resolve(designSystemSrc, 'components', 'N8nIcon', 'node-icons.ts');
	return {
		name: 'n8n:ui-extension-runtime:empty-node-icons',
		enforce: 'pre',
		load(id) {
			return id === nodeIcons ? 'export const nodeIconSet = {};' : undefined;
		},
	};
}

export default mergeConfig(
	defineConfig({
		plugins: [
			emptyNodeIconSet(),
			vue(),
			svgLoader({
				svgoConfig: {
					plugins: [
						{
							name: 'preset-default',
							params: { overrides: { cleanupIds: false, removeViewBox: false } },
						},
					],
				},
			}),
			icons({ compiler: 'vue3', autoInstall: false }),
		],
		resolve: {
			alias: [
				// The view runtime compiles `template` strings, so it needs the full Vue build.
				{ find: /^vue$/, replacement: 'vue/dist/vue.esm-bundler.js' },
				{ find: /^@n8n\/design-system/, replacement: designSystemSrc },
				// The runtime needs only the frame protocol. The rest of api-types stays out of the bundle.
				{ find: /^@n8n\/api-types$/, replacement: resolve(apiTypesSrc, 'ui-extensions.ts') },
			],
		},
		define: {
			__VUE_OPTIONS_API__: 'true',
			__VUE_PROD_DEVTOOLS__: 'false',
			__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
			'process.env.NODE_ENV': JSON.stringify('production'),
		},
		build: {
			// The editor inlines the bundle into a `srcdoc` frame, which can load no file.
			// So every asset, the font included, is inlined.
			assetsInlineLimit: () => true,
			cssCodeSplit: false,
			lib: {
				entry: resolve(__dirname, 'src', 'main.ts'),
				name: 'N8nUiExtensionRuntime',
				formats: ['iife'],
				fileName: () => 'runtime.iife.js',
				cssFileName: 'runtime',
			},
		},
	}),
	vitestConfig,
);
