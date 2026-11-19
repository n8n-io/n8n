import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { preprocessCSS, resolveConfig } from 'vite';

/**
 * Every consumer compiles `index.scss` on startup, the editor's dev server
 * included. A Sass deprecation in it, or in a dependency stylesheet that it
 * loads, prints a warning block on each start. Load element-plus styles from
 * its prebuilt CSS, not from its Sass sources.
 */

const themeFile = resolve(process.cwd(), 'src', 'css', 'index.scss');

describe('index.scss', () => {
	it('compiles without Sass deprecation warnings', async () => {
		const deprecations: string[] = [];

		const config = await resolveConfig(
			{
				configFile: false,
				root: process.cwd(),
				logLevel: 'silent',
				css: {
					preprocessorOptions: {
						scss: {
							logger: {
								warn: (message: string, options: { deprecation: boolean }) => {
									if (options.deprecation) deprecations.push(message);
								},
							},
						},
					},
				},
			},
			'serve',
		);

		const { code } = await preprocessCSS(readFileSync(themeFile, 'utf8'), themeFile, config);

		// An empty result would make the assertion below vacuously pass.
		expect(code).toContain('.el-slider');
		expect(deprecations).toEqual([]);
	}, 60_000);
});
