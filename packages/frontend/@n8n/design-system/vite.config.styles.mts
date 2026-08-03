import { cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const srcDir = resolve(__dirname, 'src');
const distDir = resolve(__dirname, 'dist');

/**
 * Ship the SCSS sources alongside the compiled CSS so consumers who do have a
 * sass toolchain can `@use` our mixins and token maps from their own stylesheets.
 *
 * The copy keeps the `css/` folder name on purpose: internal code already writes
 * `@n8n/design-system/css/mixins/motion` (49 call sites, resolved through an
 * alias to `src/css/`), so `dist/css` is the target that lets those specifiers
 * read identically inside and outside the monorepo once the package resolves to
 * `dist`.
 *
 * `dist/css/` sits two levels below the package root, exactly like `src/css/`,
 * so the `url('../../assets/fonts/…')` in `fonts.scss` and `icon.scss` keeps
 * resolving without rewriting a single path.
 */
function copyScssSources(): Plugin {
	return {
		name: 'n8n:copy-scss-sources',
		closeBundle() {
			cpSync(resolve(srcDir, 'css'), resolve(distDir, 'css'), {
				recursive: true,
				// The stylesheets ship; the test that asserts on their selector order does not.
				filter: (source) => !source.endsWith('.test.ts'),
			});
			cpSync(resolve(srcDir, 'utils.scss'), resolve(distDir, 'css', 'utils.scss'));
		},
	};
}

/**
 * Second build pass, run after the library build. `src/css/index.scss` is the
 * theme every consumer needs — design tokens, `@font-face` rules, the reset and
 * the element-plus overrides — none of which live in a Vue SFC, so the library
 * build never emits them. Without it the published component CSS references
 * `var(--…)` tokens that are never defined.
 */
export default defineConfig({
	plugins: [copyScssSources()],
	// Emit font `url()`s relative to the stylesheet instead of Vite's default
	// absolute `/assets/…`, which would 404 for anyone whose app is not served
	// from the web root.
	base: './',
	build: {
		// The library build owns dist; this pass only adds to it.
		emptyOutDir: false,
		outDir: 'dist',
		cssCodeSplit: true,
		rollupOptions: {
			// Emitted at the dist root rather than under `css/`: Vite writes asset
			// `url()`s relative to outDir, so only a root-level stylesheet resolves
			// `./assets/*` correctly.
			input: { theme: resolve(srcDir, 'css', 'index.scss') },
			output: {
				assetFileNames: (assetInfo) =>
					assetInfo.names?.[0]?.endsWith('.css') ? '[name][extname]' : 'assets/[name][extname]',
			},
		},
	},
});
