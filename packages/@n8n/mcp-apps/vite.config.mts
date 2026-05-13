import vue from '@vitejs/plugin-vue';
import { rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const workflowDiagramRoot = resolve(__dirname, 'src/apps/workflow-diagram');

export default defineConfig({
	root: workflowDiagramRoot,
	plugins: [vue(), viteSingleFile(), renameHtmlOutput('index.html', 'workflow-diagram.html')],
	build: {
		assetsInlineLimit: Number.MAX_SAFE_INTEGER,
		emptyOutDir: true,
		outDir: resolve(__dirname, 'dist/apps'),
		rollupOptions: {
			input: resolve(workflowDiagramRoot, 'index.html'),
		},
	},
});

function renameHtmlOutput(fromFileName: string, toFileName: string): Plugin {
	return {
		name: 'rename-mcp-app-html',
		async writeBundle(options) {
			if (!options.dir) return;

			await rename(resolve(options.dir, fromFileName), resolve(options.dir, toFileName));
		},
	};
}
