import vue from '@vitejs/plugin-vue';
import { access, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import icons from 'unplugin-icons/vite';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import svgLoader from 'vite-svg-loader';

import { MCP_APPS, type McpAppId } from './src/apps-manifest';

const appsRoot = resolve(__dirname, 'src/apps');

export default defineConfig(({ mode }) => {
	const app = MCP_APPS[mode as McpAppId];

	if (!app) {
		throw new Error(`Unknown MCP app mode: ${mode}`);
	}

	const appRoot = resolve(appsRoot, app.entry);

	return {
		root: appRoot,
		plugins: [
			vue(),
			svgLoader({
				svgoConfig: {
					plugins: [
						{
							name: 'preset-default',
							params: {
								overrides: {
									cleanupIds: false,
									removeViewBox: false,
								},
							},
						},
					],
				},
			}),
			icons({ compiler: 'vue3', autoInstall: true }),
			viteSingleFile(),
			renameHtmlOutput('index.html', app.htmlFile),
		],
		resolve: {
			alias: {
				'@n8n/design-system': resolve(__dirname, '../../frontend/@n8n/design-system/src'),
			},
		},
		build: {
			assetsInlineLimit: Number.MAX_SAFE_INTEGER,
			emptyOutDir: true,
			outDir: resolve(__dirname, 'dist/apps'),
			rollupOptions: {
				input: resolve(appRoot, 'index.html'),
			},
		},
	};
});

function renameHtmlOutput(fromFileName: string, toFileName: string): Plugin {
	return {
		name: 'rename-mcp-app-html',
		async writeBundle(options) {
			if (!options.dir) return;

			const from = resolve(options.dir, fromFileName);
			const to = resolve(options.dir, toFileName);

			try {
				await access(from);
			} catch {
				await access(to);
				return;
			}

			await rename(from, to);
		},
	};
}
