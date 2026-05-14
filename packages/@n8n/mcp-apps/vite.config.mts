import vue from '@vitejs/plugin-vue';
import { access, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig, type Plugin } from 'vitest/config';

const appsRoot = resolve(__dirname, 'src/apps');

export default defineConfig(({ mode }) => {
	if (mode === 'test') {
		return {
			root: appsRoot,
			plugins: [vue()],
			test: {
				include: ['**/*.test.ts'],
			},
		};
	}

	const appName = mode === 'credential-setup' ? 'credential-setup' : 'workflow-diagram';
	const appRoot = resolve(appsRoot, appName);

	return {
		root: appRoot,
		plugins: [vue(), viteSingleFile(), renameHtmlOutput('index.html', `${appName}.html`)],
		build: {
			assetsInlineLimit: Number.MAX_SAFE_INTEGER,
			emptyOutDir: appName === 'workflow-diagram',
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
