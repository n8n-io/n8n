/**
 * Visual regression tests for the design system.
 *
 * Every story tagged `visual` runs once per theme in a real Chromium, and
 * `.storybook/visual-setup.ts` compares a screenshot of it with a reference.
 * The design-system README, "Visual tests", tells how to run and update them.
 *
 * Do not rename this file to `vitest.config.ts`: the root `vitest.workspace.ts`
 * would then pick it up with the jsdom unit tests.
 */
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import type { ProvidedContext } from 'vitest';

import viteConfig from './vite.config';

const THEMES: Array<ProvidedContext['visualTheme']> = ['light', 'dark'];

const configDir = path.resolve(__dirname, '.storybook');
const designSystemSrc = path.resolve(__dirname, '../design-system/src');
const diffDir = path.resolve(__dirname, '.vitest/visual');

/**
 * Story files without the `visual` tag give no tests, but Vitest still loads
 * each one in the browser. That makes the run slow and the screenshots of the
 * other files unstable, so exclude them. A file is kept when it has the
 * literal `'visual'` anywhere, which also keeps a story-level tag.
 */
function storyFilesWithoutVisualTag(): string[] {
	const storyFile = /\.stories\.(js|jsx|mjs|ts|tsx)$/;
	const visualTag = /['"`]visual['"`]/;
	// `__screenshots__/<story file>/` folders also match the name, so keep files only.
	return readdirSync(designSystemSrc, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && storyFile.test(entry.name))
		.map((entry) => path.join(entry.parentPath, entry.name))
		.filter((file) => !visualTag.test(readFileSync(file, 'utf8')))
		.map((file) => path.relative(__dirname, file).split(path.sep).join('/'));
}

export default mergeConfig(
	viteConfig,
	defineConfig({
		optimizeDeps: {
			// Pre-bundle what the stories import. Without this, a cold Vite cache
			// discovers them during the run and reloads the page, and every test fails.
			include: [
				'@storybook/addon-themes',
				'@storybook/vue3',
				'element-plus/dist/locale/en.mjs',
				'pinia',
				'storybook/internal/core-events',
				'storybook/theming',
				'@n8n/i18n > vue-i18n',
			],
		},
		test: {
			projects: THEMES.map((theme) => ({
				extends: true,
				plugins: [
					storybookTest({
						configDir,
						tags: { include: ['visual'] },
						initialGlobals: { theme },
					}),
				],
				test: {
					name: `visual-${theme}`,
					exclude: storyFilesWithoutVisualTag(),
					setupFiles: [path.resolve(configDir, 'visual-setup.ts')],
					provide: {
						visualTheme: theme,
						// The a11y addon has its own checks. A visual test fails only on screenshots.
						'storybook/test-provided': { a11y: false },
					},
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
						viewport: { width: 1200, height: 900 },
						expect: {
							toMatchScreenshot: {
								// One layout for actual, diff and new reference images, which the
								// CI artifact and `scripts/accept-visual-references.mjs` read:
								// `.vitest/visual/<story dir in design-system/src>/<story file>/<name>`.
								resolveDiffPath: ({
									arg,
									ext,
									root,
									browserName,
									platform,
									testFileDirectory,
									testFileName,
								}) => {
									const storyDir = path.relative(
										designSystemSrc,
										path.resolve(root, testFileDirectory),
									);
									if (storyDir.startsWith('..') || path.isAbsolute(storyDir)) {
										throw new Error(
											`Visual tests only cover stories in ${designSystemSrc}, not ${testFileDirectory}.`,
										);
									}
									return path.join(
										diffDir,
										storyDir,
										testFileName,
										`${arg}-${browserName}-${platform}${ext}`,
									);
								},
							},
						},
					},
				},
			})),
		},
	}),
);
