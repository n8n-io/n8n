/**
 * Visual regression tests for the design system.
 *
 * Every story tagged `visual` runs once per theme in a real Chromium, and
 * `.storybook/visual-setup.ts` compares a screenshot of it with a reference.
 * The design-system README, "Visual tests", tells how to run and update them.
 *
 * Run it through `pnpm test:visual` (`scripts/run-visual-tests.ts`). That
 * script starts the browser in the pinned Playwright container and gives its
 * address in `N8N_VISUAL_TESTS_WS_ENDPOINT`.
 *
 * Do not rename this file to `vitest.config.ts`: the root `vitest.workspace.ts`
 * would then pick it up with the jsdom unit tests.
 */
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { searchForWorkspaceRoot } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';
import type { ProvidedContext } from 'vitest';

import viteConfig from './vite.config';

const THEMES: Array<ProvidedContext['visualTheme']> = ['light', 'dark'];

const configDir = path.resolve(__dirname, '.storybook');
const designSystemSrc = path.resolve(__dirname, '../design-system/src');
const diffDir = path.resolve(__dirname, '.vitest/visual');

/**
 * Reference images stay out of Git. A local run keeps them under `.vitest/`,
 * and CI sets `N8N_VISUAL_REFERENCE_DIR` to the directory of its base render.
 */
const referenceDir = process.env.N8N_VISUAL_REFERENCE_DIR || path.join(diffDir, 'references');
if (!path.isAbsolute(referenceDir)) {
	throw new Error(`N8N_VISUAL_REFERENCE_DIR must be an absolute path, not "${referenceDir}".`);
}

const wsEndpoint = process.env.N8N_VISUAL_TESTS_WS_ENDPOINT;
if (!wsEndpoint) {
	throw new Error(
		'Run the visual tests with `pnpm --filter @n8n/storybook test:visual`. It starts the browser in Docker.',
	);
}

/**
 * The browser always runs in the Linux container, so the images are Linux
 * images on every computer. Vitest's default names use the host platform.
 */
const IMAGE_PLATFORM = 'linux';

/** The directory of a stories file, relative to `design-system/src`. */
function storyDirOf(root: string, testFileDirectory: string): string {
	const storyDir = path.relative(designSystemSrc, path.resolve(root, testFileDirectory));
	if (storyDir.startsWith('..') || path.isAbsolute(storyDir)) {
		throw new Error(
			`Visual tests only cover stories in ${designSystemSrc}, not ${testFileDirectory}.`,
		);
	}
	return storyDir;
}

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
		server: {
			fs: {
				// Vitest writes screenshots only inside these directories. A CI reference
				// directory is often outside the repository. Setting `allow` turns off
				// Vite's default, so keep the workspace root too.
				allow: [searchForWorkspaceRoot(__dirname), referenceDir],
			},
		},
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
			// Each worker is one page in the container's Chromium. Without a cap, Vitest
			// sizes the pool from the host's CPUs, and on an 18-core host a run used
			// 5.9 GiB in the container. Two workers use about 2 GiB and take the same time.
			maxWorkers: 2,
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
						provider: playwright({
							// `<loopback>` lets the browser in the container load the Vite server on this computer.
							connectOptions: { wsEndpoint, exposeNetwork: '<loopback>' },
						}),
						instances: [{ browser: 'chromium' }],
						viewport: { width: 1200, height: 900 },
						expect: {
							toMatchScreenshot: {
								// `<referenceDir>/<story dir in design-system/src>/<story file>/<name>`.
								resolveScreenshotPath: ({
									arg,
									ext,
									root,
									browserName,
									testFileDirectory,
									testFileName,
								}) =>
									path.join(
										referenceDir,
										storyDirOf(root, testFileDirectory),
										testFileName,
										`${arg}-${browserName}-${IMAGE_PLATFORM}${ext}`,
									),
								// One folder for actual, diff and new images, which CI can upload:
								// `.vitest/visual/<story dir in design-system/src>/<story file>/<name>`.
								resolveDiffPath: ({
									arg,
									ext,
									root,
									browserName,
									testFileDirectory,
									testFileName,
								}) =>
									path.join(
										diffDir,
										storyDirOf(root, testFileDirectory),
										testFileName,
										`${arg}-${browserName}-${IMAGE_PLATFORM}${ext}`,
									),
							},
						},
					},
				},
			})),
		},
	}),
);
