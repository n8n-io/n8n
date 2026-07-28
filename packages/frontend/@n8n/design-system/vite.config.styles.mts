import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const srcDir = resolve(__dirname, 'src');
const distDir = resolve(__dirname, 'dist');

/**
 * Ship the SCSS sources next to the compiled CSS so consumers can `@use` our
 * mixins and token maps in their own stylesheets (`./scss/*` in exports).
 *
 * The copy lands in `dist/scss/` — the same depth below the package root as
 * `src/css/`, which is what keeps the `../../assets/fonts/*` URLs inside
 * `fonts.scss` resolving without rewriting them.
 */
function copyScssSources(): Plugin {
	return {
		name: 'n8n:copy-scss-sources',
		closeBundle() {
			mkdirSync(distDir, { recursive: true });
			cpSync(resolve(srcDir, 'css'), resolve(distDir, 'scss'), { recursive: true });
			cpSync(resolve(srcDir, 'utils.scss'), resolve(distDir, 'scss', 'utils.scss'));
		},
	};
}

/**
 * Second build pass, run after the library build. `src/css/index.scss` is the
 * theme every consumer needs — design tokens, `@font-face` rules, the reset and
 * the element-plus overrides — none of which live in a Vue SFC, so the library
 * build never emits them.
 */
export default defineConfig({
	plugins: [copyScssSources()],
	// Emit font `url()`s relative to the CSS file instead of Vite's default
	// absolute `/assets/...`, which would 404 for anyone whose app is not served
	// from the web root.
	base: './',
	build: {
		// The library build owns dist; this pass adds to it.
		emptyOutDir: false,
		outDir: 'dist',
		cssCodeSplit: true,
		rollupOptions: {
			// Emitted at the dist root, not under `css/`: Vite writes asset `url()`s
			// relative to outDir, so only a root-level stylesheet resolves
			// `./assets/*` correctly.
			input: { theme: resolve(srcDir, 'css', 'index.scss') },
			output: {
				assetFileNames: (assetInfo) =>
					assetInfo.names?.[0]?.endsWith('.css') ? '[name][extname]' : 'assets/[name][extname]',
			},
		},
	},
});
