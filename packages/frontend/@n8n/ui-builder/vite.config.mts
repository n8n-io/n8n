import vue from '@vitejs/plugin-vue';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { resolve } from 'path';
import icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';

// Two passes from one source, the same trick @n8n/chat uses:
//   vite build                     -> library, `vue` external, consumed by editor-ui
//   INCLUDE_VUE=true vite build    -> self-contained bundle for the served page
const includeVue = process.env.INCLUDE_VUE === 'true';

const srcPath = resolve(__dirname, 'src');
const packagesDir = resolve(__dirname, '..', '..', '..');
const distDir = resolve(__dirname, 'dist');

// The served page loads the runtime from n8n's static route. `static` is listed
// in nonUIRoutes (packages/cli/src/server.ts), so it is served verbatim rather
// than being swallowed by the history-API handler. editor-ui's `public` dir is
// copied into its dist, and vite's dev server serves it too, so dropping the
// bundle here covers both dev and built modes with no backend change.
// `public` is the source of truth: an editor-ui build copies it into `dist`.
// `dist/static` is written too when it already exists, so the served page picks
// up a new runtime without having to rebuild editor-ui.
const editorUiDir = resolve(packagesDir, 'frontend', 'editor-ui');
const staticTargets = [
	resolve(editorUiDir, 'public', 'static'),
	resolve(editorUiDir, 'dist', 'static'),
];

export default defineConfig({
	plugins: [
		vue(),
		// design-system's N8nIcon imports `~icons/...` virtual modules.
		icons({ compiler: 'vue3', autoInstall: true }),
		{
			name: 'copy-runtime-to-editor-ui-static',
			closeBundle() {
				if (!includeVue) return;

				const js = resolve(distDir, 'ui-runtime.js');
				const css = readdirSync(distDir).find((f) => f.endsWith('.css'));

				for (const [index, target] of staticTargets.entries()) {
					// Only the first target is created on demand; the dist one is
					// written to only when an editor-ui build has already made it.
					if (index === 0) mkdirSync(target, { recursive: true });
					else if (!existsSync(resolve(editorUiDir, 'dist'))) continue;
					else mkdirSync(target, { recursive: true });

					if (existsSync(js)) copyFileSync(js, resolve(target, 'ui-runtime.js'));
					if (css) copyFileSync(resolve(distDir, css), resolve(target, 'ui-runtime.css'));
				}
			},
		},
	],
	resolve: {
		alias: [
			{ find: '@', replacement: srcPath },
			{
				find: /^@n8n\/design-system(.+)$/,
				replacement: resolve(packagesDir, 'frontend', '@n8n', 'design-system', 'src$1'),
			},
		],
	},
	define: {
		'process.env.NODE_ENV': process.env.NODE_ENV ? `"${process.env.NODE_ENV}"` : '"development"',
	},
	build: {
		// The bundle pass must not wipe the library pass that ran before it.
		emptyOutDir: !includeVue,
		cssCodeSplit: false,
		lib: {
			entry: includeVue
				? resolve(srcPath, 'runtime', 'entry.ts')
				: resolve(srcPath, 'index.ts'),
			name: 'N8nUiBuilder',
			formats: includeVue ? ['es'] : ['es', 'umd'],
			fileName: (format) => (includeVue ? 'ui-runtime.js' : `ui-builder.${format}.js`),
		},
		rollupOptions: {
			external: includeVue ? [] : ['vue'],
			output: {
				// Belt and braces with src/runtime/process-shim.ts: whichever runs
				// first, `process` exists before recast's `util` shim reads it.
				banner: includeVue
					? 'globalThis.process=globalThis.process||{env:{},argv:[],platform:"browser",version:""};globalThis.global=globalThis.global||globalThis;'
					: undefined,
				exports: 'named',
				globals: includeVue ? {} : { vue: 'Vue' },
			},
		},
	},
});
