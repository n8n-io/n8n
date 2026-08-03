import { JSDOM } from 'jsdom';

import { HTML_PROBE_SCRIPT, parseHtmlProbeResult } from './html-probe';

function runProbe(html: string) {
	const dom = new JSDOM(html, {
		runScripts: 'dangerously',
		url: 'http://test.local/page',
	});
	return dom.window.eval(HTML_PROBE_SCRIPT);
}

function runProbeWithFrame(html: string, frameHtml: string) {
	const dom = new JSDOM(html, {
		runScripts: 'dangerously',
		url: 'http://test.local/page',
	});
	const frame = dom.window.document.querySelector('iframe');
	frame?.contentDocument?.open();
	frame?.contentDocument?.write(frameHtml);
	frame?.contentDocument?.close();
	return dom.window.eval(HTML_PROBE_SCRIPT);
}

describe('HTML_PROBE_SCRIPT', () => {
	it('serializes the top-level document HTML', () => {
		const result = parseHtmlProbeResult(runProbe('<main><h1>Hello</h1></main>'));

		expect(result.ok && result.root?.kind).toBe('document');
		expect(result.ok && result.root?.html).toContain('<main><h1>Hello</h1></main>');
		expect(result.ok && result.root?.url).toBe('http://test.local/page');
	});

	it('collects same-origin iframe HTML as a child bundle', () => {
		const result = parseHtmlProbeResult(
			runProbeWithFrame('<iframe title="frame"></iframe>', '<p>inside frame</p>'),
		);

		expect(result.ok && result.root?.children).toHaveLength(1);
		expect(result.ok && result.root?.children[0].kind).toBe('iframe');
		expect(result.ok && result.root?.children[0].html).toContain('inside frame');
	});

	it('collects open shadow-root HTML rather than host outerHTML', () => {
		const result = parseHtmlProbeResult(
			runProbe(`
				<div id="host"></div>
				<script>
					const shadow = document.querySelector('#host').attachShadow({ mode: 'open' });
					shadow.innerHTML = '<section><p>inside shadow</p></section>';
				</script>
			`),
		);

		const shadowChild = result.ok
			? result.root?.children.find((child) => child.kind === 'shadow-root')
			: undefined;
		expect(shadowChild?.html).toContain('inside shadow');
		expect(shadowChild?.html).not.toContain('id="host"');
	});

	it('serializes live input and textarea values that are not reflected in markup', () => {
		const result = parseHtmlProbeResult(
			runProbe(`
				<input id="api-key" type="password" value="">
				<textarea id="token"></textarea>
				<script>
					document.querySelector('#api-key').value = 'live-input-secret';
					document.querySelector('#token').value = 'live-textarea-secret';
				</script>
			`),
		);

		expect(result.ok && result.root?.html).toContain('value="live-input-secret"');
		expect(result.ok && result.root?.html).toContain('>live-textarea-secret</textarea>');
	});
});

describe('parseHtmlProbeResult', () => {
	it('returns an error for malformed probe output', () => {
		expect(parseHtmlProbeResult('not an object')).toEqual({
			ok: false,
			error: 'HTML probe returned malformed data',
		});
	});

	it('drops malformed child entries and normalizes optional fields', () => {
		const result = parseHtmlProbeResult({
			kind: 'document',
			html: '<html></html>',
			children: ['bad child', { kind: 'iframe', html: '<p>ok</p>' }],
			errors: ['boom', 42],
		});

		expect(result).toEqual({
			ok: true,
			root: {
				kind: 'document',
				html: '<html></html>',
				url: undefined,
				children: [
					{
						kind: 'iframe',
						html: '<p>ok</p>',
						url: undefined,
						children: [],
						errors: [],
					},
				],
				errors: ['boom'],
			},
		});
	});
});
