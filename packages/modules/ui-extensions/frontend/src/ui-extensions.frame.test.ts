import { buildViewDocument, VIEW_FRAME_CONTENT_SECURITY_POLICY } from './ui-extensions.frame';

const runtime = { js: 'console.log("</script><!--")', css: 'body{color:red}</style><b>' };

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

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

	it('keeps a source that holds HTML intact, in one script element', () => {
		const source = 'export default { template: "</script><img src=x onerror=alert(1)><!--" };';

		const doc = parse(buildViewDocument({ runtime, source }));

		expect(doc.querySelectorAll('img')).toHaveLength(0);
		expect(JSON.parse(doc.getElementById('view-source')!.textContent!)).toBe(source);
	});

	it('loads the runtime from a data URL, so its text cannot end the element', () => {
		const doc = parse(buildViewDocument({ runtime, source: 'x' }));
		const scripts = doc.querySelectorAll('script[src]');

		expect(scripts).toHaveLength(1);
		const src = scripts[0].getAttribute('src')!;
		expect(src.startsWith('data:text/javascript;base64,')).toBe(true);
		const decoded = new TextDecoder().decode(
			Uint8Array.from(atob(src.split(',')[1]), (c) => c.charCodeAt(0)),
		);
		expect(decoded).toBe(runtime.js);
	});

	it('keeps the runtime CSS inside its style element', () => {
		const doc = parse(buildViewDocument({ runtime, source: 'x' }));

		expect(doc.querySelectorAll('b')).toHaveLength(0);
		expect(doc.querySelector('style')?.textContent).toContain('color:red');
	});

	it('copies the nonce and the theme', () => {
		const doc = parse(buildViewDocument({ runtime, source: 'x', nonce: 'abc"def', theme: 'dark' }));

		expect(doc.querySelector('script[src]')?.getAttribute('nonce')).toBe('abc"def');
		expect(doc.body.getAttribute('data-theme')).toBe('dark');
	});

	it('encodes a runtime with non-ASCII text', () => {
		const doc = parse(
			buildViewDocument({ runtime: { js: 'const s = "ä→😀";', css: '' }, source: 'x' }),
		);
		const src = doc.querySelector('script[src]')!.getAttribute('src')!;
		const decoded = new TextDecoder().decode(
			Uint8Array.from(atob(src.split(',')[1]), (c) => c.charCodeAt(0)),
		);

		expect(decoded).toBe('const s = "ä→😀";');
	});
});
