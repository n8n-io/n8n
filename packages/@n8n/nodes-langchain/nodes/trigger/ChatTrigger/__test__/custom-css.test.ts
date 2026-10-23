import { JSDOM } from 'jsdom';

import { createPage } from '../templates';

/**
 * The custom-CSS sink, tested through a real HTML parser and a real JS engine.
 *
 * The page ships an empty `<style>` element and a classic script that assigns the CSS to
 * its `textContent`. Two boundaries decide whether that holds: the HTML parser, which
 * must never see the value, and the JS string literal the value travels in. A test that
 * matches the rendered page with a regular expression asserts against *our* model of
 * those two parsers, and the spellings that matter here (`</STYLE`, `</style/`,
 * `<!--</style>`) are exactly where such a model is most likely to be wrong. JSDOM
 * replaces the model with the parsers themselves.
 */

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/** Ties the assertions to the element `templates.ts` fills. */
const CUSTOM_CSS_ELEMENT_ID = 'n8n-chat-custom-css';

// Inputs a browser resolves as closing a style element, including the spellings an HTML
// parser disagrees on. The `<<` and `</st<` shapes cover the case that matters most for
// this sink: a filter that removes an inner `</style` splices the text around it into a
// closing tag it has already checked, so removing a match can create one.
const STYLE_CLOSING_INPUTS = [
	'<</style/style><script>alert(document.domain)</script>',
	'</style><script>alert(1)</script>',
	'</style/><script>alert(1)</script>',
	'</style//><img src=x onerror=alert(1)>',
	'</style ><script>alert(1)</script>',
	'</style\t><script>alert(1)</script>',
	'</STYLE><script>alert(1)</script>',
	'</sTyLe><svg onload=alert(1)>',
	'</st<</style/yle><script>alert(1)</script>',
	'</style',
	'<!--</style><script>alert(1)</script>-->',
];

// Inputs aimed at the assignment the CSS travels in rather than at the style element:
// closing the JS string literal, closing the script element, and the two line
// terminators that a JSON string may hold but a pre-ES2019 string literal could not.
const SCRIPT_CONTEXT_INPUTS = [
	'"; alert("foobar"); //',
	'"; alert(1); "',
	'\\"; alert(1); //',
	'\\\\"; alert(1); //',
	'"}); alert(1); ({"',
	'</script><script>alert(1)</script>',
	'</SCRIPT ><script>alert(1)</script>',
	'<!--</script>--><script>alert(1)</script>',
	`";${LINE_SEPARATOR}alert(1);//`,
	`";${PARAGRAPH_SEPARATOR}alert(1);//`,
	'\n"; alert(1); //',
	'\u0000"; alert(1); //',
];

// Legal CSS that a filter would damage. The range syntax of Media Queries Level 4 holds
// a bare `<`, so any rule that removes or escapes `<` in the markup drops it silently.
// These are the reason the CSS travels as a string instead.
const LEGAL_CSS = [
	['plain rules', '.chat { color: red; font-size: 14px; }'],
	['combinators', 'div > span + p ~ .class:hover { background: #fff; }'],
	['media query range', '@media (width < 600px) { .chat { display: none; } }'],
	['container query range', '@container (width < 400px) { .chat { gap: 0; } }'],
	['a literal < in a value', '.chat::after { content: "<3"; }'],
	['an escaped quote', ".chat::after { content: '\\\\'; }"],
	['a line separator', `.chat { color: red; }${LINE_SEPARATOR}`],
] as const;

const params = {
	instanceId: 'test-instance',
	webhookUrl: 'http://test.com/webhook',
	showWelcomeScreen: false,
	loadPreviousSession: 'notSupported' as const,
	i18n: { en: {} },
	mode: 'test' as const,
	authentication: 'none' as const,
	allowFileUploads: false,
	allowedFilesMimeTypes: '',
	customCss: '',
	enableStreaming: false,
	initialMessages: '',
};

/**
 * Parses the rendered page the way a browser does, with its classic scripts running.
 *
 * `beforeParse` is where the recorders go: JSDOM runs scripts inside the constructor, so
 * anything assigned to `dom.window` afterwards arrives too late and the test silently
 * stops watching for execution. The widget bootstrap is a module script, which JSDOM
 * skips, and `resources` defaults to loading nothing, so no test reaches the CDN.
 */
function renderPage(customCss: string) {
	const executed: string[] = [];

	const dom = new JSDOM(createPage({ ...params, customCss }), {
		runScripts: 'dangerously',
		url: 'http://test.local/chat',
		beforeParse(window) {
			window.alert = (message?: string) => executed.push(`alert(${String(message)})`);
			window.addEventListener('error', (event) =>
				executed.push(`error(${(event as ErrorEvent).message})`),
			);
		},
	});

	return { document: dom.window.document, executed };
}

/** The classic scripts in the page. The module bootstrap never runs under JSDOM. */
function executableScripts(document: Document) {
	return [...document.querySelectorAll('script')].filter((script) => {
		const type = script.getAttribute('type');
		return type === null || type === 'text/javascript';
	});
}

/**
 * The whole contract, asserted against the parsed page. Every input goes through this:
 * a hostile one must not behave differently from a benign one, which is the point of
 * moving the value out of the markup.
 */
function expectDeliveredAsCssText(customCss: string) {
	const { document, executed } = renderPage(customCss);

	// Execution comes first. A payload that ran is the finding; asserting the delivered
	// text before this would report a mismatched string and hide it.
	expect(executed).toEqual([]);
	// The input contributed no tag - neither one it spelled out nor one spliced together
	// from the text on either side of a removed match.
	expect(document.querySelectorAll('img, svg, iframe, object, embed')).toHaveLength(0);
	// The page's own base block and the custom one. A third means the input opened it.
	expect(document.querySelectorAll('style')).toHaveLength(2);
	// The injector is the only script the page can ever execute, and only when there is
	// CSS to apply.
	expect(executableScripts(document)).toHaveLength(customCss ? 1 : 0);

	const element = document.getElementById(CUSTOM_CSS_ELEMENT_ID);
	expect(element?.tagName).toBe('STYLE');
	// The CSS arrives byte for byte. Nothing is removed and nothing is escaped, which is
	// what no HTML context can offer: reaching this element through one would cost the
	// legal CSS below, and a NUL would arrive as U+FFFD.
	expect(element?.textContent).toBe(customCss);
}

describe('ChatTrigger custom CSS', () => {
	it.each(STYLE_CLOSING_INPUTS)('does not let %j close the style element', (customCss) => {
		expectDeliveredAsCssText(customCss);
	});

	it.each(SCRIPT_CONTEXT_INPUTS)('does not let %j escape the assignment', (customCss) => {
		expectDeliveredAsCssText(customCss);
	});

	it.each(LEGAL_CSS)('delivers %s unchanged', (_label, customCss) => {
		expectDeliveredAsCssText(customCss);
	});

	it('leaves the element empty and adds no script when there is no custom CSS', () => {
		expectDeliveredAsCssText('');
	});

	// The one property the parsed DOM cannot state: that the value reached a single place
	// in the page. The DOM shows where it landed, not that it landed nowhere else.
	it('writes the CSS to exactly one place in the page', () => {
		// Anchored at both ends, so the only part that may vary between two pages is the
		// string literal. An input that added a statement, or escaped the literal or the
		// script element, cannot still match.
		const injector = new RegExp(
			'\\s*<script>\\s*' +
				`document\\.getElementById\\("${CUSTOM_CSS_ELEMENT_ID}"\\)\\.textContent =\\s*` +
				'("(?:[^"\\\\]|\\\\.)*");' +
				'\\s*</script>',
		);
		const pageWithoutCustomCss = createPage({ ...params, customCss: '' });

		for (const customCss of [...STYLE_CLOSING_INPUTS, ...SCRIPT_CONTEXT_INPUTS]) {
			const page = createPage({ ...params, customCss });

			expect(page).toMatch(injector);
			// Everything outside the literal is fixed text, so dropping the injector must
			// give back the page built with no custom CSS at all.
			expect(page.replace(injector, '')).toBe(pageWithoutCustomCss);
		}
	});
});
