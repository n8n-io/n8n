import { runInNewContext } from 'node:vm';

import {
	buildViewDocument,
	VIEW_FRAME_CONTENT_SECURITY_POLICY,
	viewSourceToScript,
} from './ui-extensions.frame';

const VIEW = 'export default {};';
const runtime = { js: 'console.log("</script><!--")', css: 'body{color:red}</style><b>' };

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

const decodeScript = (src: string) =>
	new TextDecoder().decode(Uint8Array.from(atob(src.split(',')[1]), (c) => c.charCodeAt(0)));

/** Runs a view script the way the frame does, and returns the factory that it sets. */
function loadFactory(script: string) {
	const window: Record<string, unknown> = {};
	runInNewContext(script, { window });
	return window.__n8nUiExtensionView as (vue: unknown, n8n: unknown) => unknown;
}

describe('viewSourceToScript', () => {
	it('turns the default export into a factory that gets the two globals', () => {
		const factory = loadFactory(
			viewSourceToScript('const x = n8n.prefix;\nexport default { name: Vue.name + x };'),
		);

		expect(factory({ name: 'vue' }, { prefix: '-n8n' })).toEqual({ name: 'vue-n8n' });
	});

	it('runs the view in strict mode', () => {
		const factory = loadFactory(viewSourceToScript('undeclared = 1;\nexport default {};'));

		expect(() => factory({}, {})).toThrow();
	});

	it('checks a source of many blank lines in linear time', () => {
		const source = `${'\n'.repeat(99_000)}export default {};`;

		const started = performance.now();
		viewSourceToScript(source);

		expect(performance.now() - started).toBeLessThan(500);
	});

	it.each([
		['an indented import statement', "  import { ref } from 'vue';\nexport default {};", 'import'],
		['an import statement', "import { ref } from 'vue';\nexport default {};", 'import'],
		['no default export', 'const x = 1;', 'exactly one'],
		['two default exports', 'export default {};\nexport default {};', 'exactly one'],
	])('rejects a source with %s', (_case, source, message) => {
		expect(() => viewSourceToScript(source)).toThrow(message);
	});
});

describe('buildViewDocument', () => {
	it('blocks network access in the frame policy', () => {
		const doc = parse(buildViewDocument({ runtime, source: 'export default {}' }));
		const policy = doc
			.querySelector('meta[http-equiv="Content-Security-Policy"]')
			?.getAttribute('content');

		expect(policy).toBe(VIEW_FRAME_CONTENT_SECURITY_POLICY);
		expect(policy).toContain("default-src 'none'");
		expect(policy).toContain("connect-src 'none'");
		expect(policy).not.toContain('http');
	});

	it('loads the runtime, then the view, from data URLs, so no text can end an element', () => {
		const source = 'export default { template: "</script><img src=x onerror=alert(1)><!--" };';

		const doc = parse(buildViewDocument({ runtime, source }));
		const scripts = [...doc.querySelectorAll('script')];

		expect(doc.querySelectorAll('img')).toHaveLength(0);
		expect(scripts).toHaveLength(2);
		expect(scripts.every((script) => script.textContent === '')).toBe(true);
		const [runtimeSrc, viewSrc] = scripts.map((script) => script.getAttribute('src')!);
		expect(runtimeSrc.startsWith('data:text/javascript;base64,')).toBe(true);
		expect(decodeScript(runtimeSrc)).toBe(runtime.js);
		expect(decodeScript(viewSrc)).toBe(viewSourceToScript(source));
	});

	it('throws for a source that is not a view', () => {
		expect(() => buildViewDocument({ runtime, source: 'const x = 1;' })).toThrow('exactly one');
	});

	it('keeps the runtime CSS inside its style element', () => {
		const doc = parse(buildViewDocument({ runtime, source: VIEW }));

		expect(doc.querySelectorAll('b')).toHaveLength(0);
		expect(doc.querySelector('style')?.textContent).toContain('color:red');
	});

	it('copies the nonce and the theme', () => {
		const doc = parse(
			buildViewDocument({ runtime, source: VIEW, nonce: 'abc"def', theme: 'dark' }),
		);

		expect(doc.querySelector('script[src]')?.getAttribute('nonce')).toBe('abc"def');
		expect(doc.body.getAttribute('data-theme')).toBe('dark');
	});

	it('encodes a runtime with non-ASCII text', () => {
		const doc = parse(
			buildViewDocument({ runtime: { js: 'const s = "ä→😀";', css: '' }, source: VIEW }),
		);
		const src = doc.querySelector('script[src]')!.getAttribute('src')!;
		const decoded = new TextDecoder().decode(
			Uint8Array.from(atob(src.split(',')[1]), (c) => c.charCodeAt(0)),
		);

		expect(decoded).toBe('const s = "ä→😀";');
	});
});
