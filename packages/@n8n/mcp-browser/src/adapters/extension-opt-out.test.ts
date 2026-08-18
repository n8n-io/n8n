import type { DOMWindow } from 'jsdom';
import { JSDOM } from 'jsdom';

import { applyExtensionOptOut, OPT_OUT_SCRIPT } from './extension-opt-out';

/** `beforeParse` mirrors init-script timing; otherwise the script sees a parsed document. */
function makeDom(html: string, { beforeParse = false } = {}) {
	return new JSDOM(html, {
		runScripts: 'dangerously',
		url: 'http://test.local/page',
		...(beforeParse
			? {
					beforeParse: (window: DOMWindow) => {
						window.eval(OPT_OUT_SCRIPT);
					},
				}
			: {}),
	});
}

function runOptOut(html: string) {
	const dom = makeDom(html);
	dom.window.eval(OPT_OUT_SCRIPT);
	return dom.window.document;
}

const runAsInitScript = (html: string) => makeDom(html, { beforeParse: true });

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

describe('OPT_OUT_SCRIPT as an init script', () => {
	it('stamps fields parsed after it ran, with no <html> present at install time', async () => {
		const dom = runAsInitScript('<html><body><input id="server"></body></html>');

		await vi.waitFor(() =>
			expect(dom.window.document.getElementById('server')?.hasAttribute('data-bwignore')).toBe(
				true,
			),
		);
		expect(dom.window.document.body.hasAttribute('data-1p-ignore')).toBe(true);
	});

	it('stamps a field inserted long after parsing', async () => {
		const dom = runAsInitScript('<html><body><div id="app"></div></body></html>');

		const input = dom.window.document.createElement('input');
		input.id = 'late';
		dom.window.document.getElementById('app')!.appendChild(input);

		await vi.waitFor(() => expect(input.hasAttribute('data-bwignore')).toBe(true));
	});

	it('stamps a field nested inside an inserted subtree', async () => {
		const dom = runAsInitScript('<html><body><div id="app"></div></body></html>');

		const modal = dom.window.document.createElement('div');
		modal.innerHTML = '<form><input id="nested"></form>';
		dom.window.document.getElementById('app')!.appendChild(modal);

		await vi.waitFor(() =>
			expect(dom.window.document.getElementById('nested')?.hasAttribute('data-bwignore')).toBe(
				true,
			),
		);
	});

	it('re-stamps on every call so repeat callers catch up', () => {
		const dom = runAsInitScript('<html><body><div id="app"></div></body></html>');
		const host = dom.window.document.getElementById('app')!;
		const shadow = host.attachShadow({ mode: 'open' });
		shadow.innerHTML = '<input id="inner">';

		// The observer cannot see into a shadow root it never walked; a second pass must.
		dom.window.eval(OPT_OUT_SCRIPT);

		expect(shadow.getElementById('inner')?.hasAttribute('data-bwignore')).toBe(true);
	});

	it('installs one observer per root even when run repeatedly', () => {
		let observers = 0;
		const dom = new JSDOM('<html><body></body></html>', {
			runScripts: 'dangerously',
			url: 'http://test.local/page',
			beforeParse(window) {
				const Native = window.MutationObserver;
				class Counting extends Native {
					constructor(onMutation: MutationCallback) {
						super(onMutation);
						observers++;
					}
				}
				Reflect.set(window, 'MutationObserver', Counting);
				window.eval(OPT_OUT_SCRIPT);
			},
		});

		dom.window.eval(OPT_OUT_SCRIPT);
		dom.window.eval(OPT_OUT_SCRIPT);

		expect(observers).toBe(1);
	});
});

describe('applyExtensionOptOut', () => {
	it('passes the script to the evaluator and reports success', async () => {
		const evaluate = vi.fn().mockResolvedValue(undefined);

		await expect(applyExtensionOptOut(evaluate)).resolves.toBe(true);

		expect(evaluate).toHaveBeenCalledWith(OPT_OUT_SCRIPT);
	});

	it('reports failure instead of throwing when delivery fails', async () => {
		const evaluate = vi.fn().mockRejectedValue(new Error('CSP blocked eval'));

		await expect(applyExtensionOptOut(evaluate)).resolves.toBe(false);
	});
});
