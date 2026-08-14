import { JSDOM } from 'jsdom';

import { applyExtensionOptOut, OPT_OUT_SCRIPT } from './extension-opt-out';

function runOptOut(html: string) {
	const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://test.local/page' });
	dom.window.eval(OPT_OUT_SCRIPT);
	return dom.window.document;
}

describe('OPT_OUT_SCRIPT', () => {
	it('marks every form field with the password manager opt-out attributes', () => {
		const document = runOptOut(
			'<input id="a"><textarea id="b"></textarea><select id="c"></select>',
		);

		for (const id of ['a', 'b', 'c']) {
			const field = document.getElementById(id);
			expect(field?.hasAttribute('data-1p-ignore')).toBe(true);
			expect(field?.getAttribute('data-lpignore')).toBe('true');
			expect(field?.hasAttribute('data-bwignore')).toBe(true);
			expect(field?.hasAttribute('data-protonpass-ignore')).toBe(true);
			expect(field?.getAttribute('data-form-type')).toBe('other');
		}
	});

	it('marks the body with the 1Password whole-page switch only', () => {
		const document = runOptOut('<input>');

		expect(document.body.hasAttribute('data-1p-ignore')).toBe(true);
		expect(document.body.hasAttribute('data-lpignore')).toBe(false);
		expect(document.body.hasAttribute('data-form-type')).toBe(false);
	});

	it('marks editable text with the writing assistant opt-out attributes', () => {
		const document = runOptOut('<textarea id="a"></textarea><div id="b" contenteditable></div>');

		for (const id of ['a', 'b']) {
			const field = document.getElementById(id);
			expect(field?.getAttribute('data-gramm')).toBe('false');
			expect(field?.getAttribute('data-gramm_editor')).toBe('false');
			expect(field?.getAttribute('data-enable-grammarly')).toBe('false');
			expect(field?.getAttribute('data-lt-active')).toBe('false');
		}
	});

	it('leaves plain inputs out of the writing assistant group', () => {
		const document = runOptOut('<input id="a">');

		expect(document.getElementById('a')?.hasAttribute('data-gramm')).toBe(false);
	});

	it('skips explicitly non-editable contenteditable elements', () => {
		const document = runOptOut('<div id="a" contenteditable="false"></div>');

		expect(document.getElementById('a')?.hasAttribute('data-gramm')).toBe(false);
	});

	it('leaves attributes the page already set untouched', () => {
		const document = runOptOut('<input id="a" data-form-type="password">');

		expect(document.getElementById('a')?.getAttribute('data-form-type')).toBe('password');
	});

	it('reaches fields inside open shadow roots', () => {
		const dom = new JSDOM('<div id="host"></div>', {
			runScripts: 'dangerously',
			url: 'http://test.local/page',
		});
		const shadow = dom.window.document
			.getElementById('host')!
			.attachShadow({ mode: 'open' }) as unknown as ShadowRoot;
		shadow.innerHTML = '<input id="inner">';

		dom.window.eval(OPT_OUT_SCRIPT);

		expect(shadow.getElementById('inner')?.hasAttribute('data-1p-ignore')).toBe(true);
	});

	it('reaches fields inside same-origin iframes', () => {
		const dom = new JSDOM('<iframe></iframe>', {
			runScripts: 'dangerously',
			url: 'http://test.local/page',
		});
		const frame = dom.window.document.querySelector('iframe');
		frame?.contentDocument?.open();
		frame?.contentDocument?.write('<input id="inner">');
		frame?.contentDocument?.close();

		dom.window.eval(OPT_OUT_SCRIPT);

		expect(frame?.contentDocument?.getElementById('inner')?.hasAttribute('data-1p-ignore')).toBe(
			true,
		);
	});

	it('does not throw on a page with no fields', () => {
		expect(() => runOptOut('<p>nothing here</p>')).not.toThrow();
	});
});

describe('applyExtensionOptOut', () => {
	it('passes the script to the evaluator', async () => {
		const evaluate = vi.fn().mockResolvedValue(undefined);

		await applyExtensionOptOut(evaluate);

		expect(evaluate).toHaveBeenCalledWith(OPT_OUT_SCRIPT);
	});

	it('swallows evaluator failures', async () => {
		const evaluate = vi.fn().mockRejectedValue(new Error('CSP blocked eval'));

		await expect(applyExtensionOptOut(evaluate)).resolves.toBeUndefined();
	});
});
