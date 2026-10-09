import { t, UserError } from '@n8n/node-sdk';

import { browser } from '../browser.node';

// `node --permission` refuses readdir outside /tmp, so the shell glob finds the arch folder.
const CHROMIUM =
	'exec /ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell "$@"';

// The pack check accepts `process` only behind a `typeof` test: only the container guest has it.
const nodeModules = () => {
	if (typeof process === 'undefined') throw new UserError('This action runs only in a container');
	return {
		fs: process.getBuiltinModule('node:fs'),
		childProcess: process.getBuiltinModule('node:child_process'),
	};
};

export const takeScreenshot = browser.action('screenshot', {
	action: 'Take a screenshot',
	summary:
		'Render HTML with headless Chromium and keep a PNG of the window. The page has no network, so fetch it first, e.g. with an HTTP Request node.',
	flow: { effect: 'transform', cardinality: 'per-item', idempotent: true },
	runtime: {
		image:
			'mcr.microsoft.com/playwright:v1.64.0-noble@sha256:06a9939e57531807f8d5fd76ce44b53165ffb7d7501d87ab10e285c20b1e971f',
		childProcess: true,
	},
	input: {
		html: t.str().title('HTML').hint('The page to render, e.g. the body of an HTTP response'),
		width: t.int().with({ minimum: 1, maximum: 4096 }).default(1280).title('Width'),
		height: t.int().with({ minimum: 1, maximum: 4096 }).default(720).title('Height'),
	},
	output: t.obj({ data: t.binary().hint('The PNG screenshot of the window') }),
	async run({ input, binary }) {
		const { fs, childProcess } = nodeModules();
		const dir = fs.mkdtempSync('/tmp/n8n-browser-');
		try {
			fs.writeFileSync(`${dir}/page.html`, input.html);
			childProcess.execFileSync(
				'/bin/sh',
				[
					...['-c', CHROMIUM, 'chromium', '--no-sandbox', '--disable-gpu'],
					...['--disable-dev-shm-usage', `--user-data-dir=${dir}/profile`],
					...[`--screenshot=${dir}/shot.png`, `--window-size=${input.width},${input.height}`],
					`file://${dir}/page.html`,
				],
				{ env: { HOME: dir } },
			);
			const data = await binary.create({ mimeType: 'image/png', fileName: 'screenshot.png' }, [
				fs.readFileSync(`${dir}/shot.png`),
			]);
			return { data };
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	},
});
