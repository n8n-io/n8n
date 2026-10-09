import { t, UserError, type Http } from '@n8n/node-sdk';

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

const DATA_URL = 'data:text/html;charset=utf-8,';

/** The v1 `html` as a `data:` URL. An expression stays an expression. */
const dataUrlOf = (html: string) => {
	if (!html.startsWith('=')) return `${DATA_URL}${encodeURIComponent(html)}`;
	// The odd parts are the code of the `{{ }}` blocks, the even parts are text.
	const parts = html
		.slice(1)
		.split(/\{\{([\s\S]*?)\}\}/)
		.flatMap((part, index) =>
			index % 2 ? [`(${part.trim()})`] : part ? [JSON.stringify(part)] : [],
		);
	return `={{ '${DATA_URL}' + encodeURIComponent(${parts.join(' + ')}) }}`;
};

/**
 * The page of `url`. The host fetches it, so the egress and the URL checks of n8n apply. The
 * container has no network, so Chromium cannot fetch it. A `data:` URL needs no request.
 */
async function pageOf(url: string, http: Http): Promise<string | Uint8Array> {
	if (/^data:/i.test(url)) {
		const comma = url.indexOf(',');
		const body = url.slice(comma + 1);
		return url.slice(0, comma).endsWith(';base64')
			? Uint8Array.from(atob(body), (char) => char.charCodeAt(0))
			: decodeURIComponent(body);
	}
	const page = await http.request({ url, headers: { accept: 'text/html,*/*' } });
	if (typeof page !== 'string') throw new UserError(`${url} gives no HTML page`);
	return page;
}

export const takeScreenshot = browser.action('screenshot', {
	// Major 2: the input is a URL, not HTML.
	version: '2.0.0',
	action: 'Take a screenshot',
	summary:
		'Open a URL with headless Chromium and keep a PNG of the window. n8n fetches the page; its scripts, styles and images from other URLs do not load.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	egress: { fromInput: 'url' },
	runtime: {
		image:
			'mcr.microsoft.com/playwright:v1.64.0-noble@sha256:06a9939e57531807f8d5fd76ce44b53165ffb7d7501d87ab10e285c20b1e971f',
		childProcess: true,
	},
	input: {
		url: t.str().title('URL').hint('Full URL of the page, e.g. https://example.com'),
		width: t.int().with({ minimum: 1, maximum: 4096 }).default(1280).title('Width'),
		height: t.int().with({ minimum: 1, maximum: 4096 }).default(720).title('Height'),
	},
	output: t.obj({ data: t.binary().hint('The PNG screenshot of the window') }),
	migrate: (fromMajor, params) => {
		const { html, ...rest } = params;
		if (fromMajor !== 1 || typeof html !== 'string') return rest;
		return { ...rest, url: dataUrlOf(html) };
	},
	async run({ input, binary, http }) {
		const { fs, childProcess } = nodeModules();
		const page = await pageOf(input.url, http);
		const dir = fs.mkdtempSync('/tmp/n8n-browser-');
		try {
			fs.writeFileSync(`${dir}/page.html`, page);
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
