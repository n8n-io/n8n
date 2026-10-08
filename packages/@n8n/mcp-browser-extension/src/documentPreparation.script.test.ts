import { applyOptOutAttributes, OPT_OUT_SCRIPT } from './documentPreparation';

const run = applyOptOutAttributes;

function html(markup: string) {
	document.body.innerHTML = markup;
}

beforeEach(() => {
	Reflect.deleteProperty(window, '__n8nExtensionOptOut');
	document.body.innerHTML = '';
	document.body.removeAttribute('data-1p-ignore');
});

describe('OPT_OUT_SCRIPT', () => {
	it('ships the function as a self-invoking source string', () => {
		expect(OPT_OUT_SCRIPT.startsWith('(function')).toBe(true);
		expect(OPT_OUT_SCRIPT.endsWith(')()')).toBe(true);
		expect(OPT_OUT_SCRIPT).toContain('data-bwignore');
	});

	it('marks every form field with the password manager opt-out attributes', () => {
		html('<input id="a"><textarea id="b"></textarea><select id="c"></select>');

		run();

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
		html('<input>');

		run();

		expect(document.body.hasAttribute('data-1p-ignore')).toBe(true);
		expect(document.body.hasAttribute('data-lpignore')).toBe(false);
		expect(document.body.hasAttribute('data-form-type')).toBe(false);
	});

	it('marks editable text with the writing assistant opt-out attributes', () => {
		html('<textarea id="a"></textarea><div id="b" contenteditable></div>');

		run();

		for (const id of ['a', 'b']) {
			const field = document.getElementById(id);
			expect(field?.getAttribute('data-gramm')).toBe('false');
			expect(field?.getAttribute('data-gramm_editor')).toBe('false');
			expect(field?.getAttribute('data-enable-grammarly')).toBe('false');
			expect(field?.getAttribute('data-lt-active')).toBe('false');
		}
	});

	it('leaves plain inputs out of the writing assistant group', () => {
		html('<input id="a">');

		run();

		expect(document.getElementById('a')?.hasAttribute('data-gramm')).toBe(false);
	});

	it('skips explicitly non-editable contenteditable elements', () => {
		html('<div id="a" contenteditable="false"></div>');

		run();

		expect(document.getElementById('a')?.hasAttribute('data-gramm')).toBe(false);
	});

	it('leaves attributes the page already set untouched', () => {
		html('<input id="a" data-form-type="password">');

		run();

		expect(document.getElementById('a')?.getAttribute('data-form-type')).toBe('password');
	});

	it('reaches fields inside open shadow roots', () => {
		html('<div id="host"></div>');
		const shadow = document.getElementById('host')!.attachShadow({ mode: 'open' });
		shadow.innerHTML = '<input id="inner">';

		run();

		expect(shadow.getElementById('inner')?.hasAttribute('data-1p-ignore')).toBe(true);
	});

	it('does not throw on a page with no fields', () => {
		html('<p>nothing here</p>');

		expect(() => run()).not.toThrow();
	});

	it('marks a field inserted after it ran', async () => {
		html('<div id="app"></div>');
		run();

		const input = document.createElement('input');
		document.getElementById('app')!.appendChild(input);

		await vi.waitFor(() => expect(input.hasAttribute('data-bwignore')).toBe(true));
	});

	it('marks a field nested inside an inserted subtree', async () => {
		html('<div id="app"></div>');
		run();

		const modal = document.createElement('div');
		modal.innerHTML = '<form><input id="nested"></form>';
		document.getElementById('app')!.appendChild(modal);

		await vi.waitFor(() =>
			expect(document.getElementById('nested')?.hasAttribute('data-bwignore')).toBe(true),
		);
	});

	it('marks a field inserted into a shadow root it has already walked', async () => {
		html('<div id="host"></div>');
		const shadow = document.getElementById('host')!.attachShadow({ mode: 'open' });
		run();

		const input = document.createElement('input');
		shadow.appendChild(input);

		await vi.waitFor(() => expect(input.hasAttribute('data-bwignore')).toBe(true));
	});

	it('installs one observer per root however often it runs', () => {
		html('<div id="app"></div>');
		let observers = 0;
		const Native = window.MutationObserver;
		class Counting extends Native {
			constructor(onMutation: MutationCallback) {
				super(onMutation);
				observers++;
			}
		}
		vi.stubGlobal('MutationObserver', Counting);

		run();
		run();
		run();

		expect(observers).toBe(1);
		vi.unstubAllGlobals();
	});

	// As an init script this runs before the parser has created <html>, let alone <body>, so the
	// empty document is the real entry state — not the populated one the cases above start from.
	it('marks a body and field parsed after it ran against an empty document', async () => {
		const documentElement = document.documentElement;
		documentElement.remove();

		expect(() => run()).not.toThrow();

		const root = document.createElement('html');
		const body = document.createElement('body');
		const input = document.createElement('input');
		body.appendChild(input);
		root.appendChild(body);
		document.appendChild(root);

		try {
			await vi.waitFor(() => {
				expect(input.hasAttribute('data-bwignore')).toBe(true);
				expect(body.hasAttribute('data-1p-ignore')).toBe(true);
			});
		} finally {
			// jsdom is per file, not per test, so every later beforeEach needs a document back.
			document.documentElement?.remove();
			document.appendChild(documentElement);
		}
	});
});
