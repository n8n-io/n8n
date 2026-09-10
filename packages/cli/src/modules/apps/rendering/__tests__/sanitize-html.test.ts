import { sanitizeHtml } from '../sanitize-html';

describe('sanitizeHtml', () => {
	test('keeps an allowed element with an allowed attribute', () => {
		expect(sanitizeHtml("<p class='note'>hello</p>")).toBe('<p class="note">hello</p>');
	});

	test('strips a script tag and its content', () => {
		expect(sanitizeHtml('<script>alert(1)</script><p>safe</p>')).toBe('<p>safe</p>');
	});

	test('strips an inline event handler attribute', () => {
		expect(sanitizeHtml('<button onclick="evil()">click</button>')).not.toContain('onclick');
	});

	test('strips a style attribute', () => {
		expect(sanitizeHtml('<div style="color:red">text</div>')).not.toContain('style');
	});

	test('drops a javascript: href', () => {
		expect(sanitizeHtml("<a href='javascript:alert(1)'>x</a>")).not.toContain('javascript:');
	});

	test('keeps an https href', () => {
		expect(sanitizeHtml("<a href='https://n8n.io'>x</a>")).toContain('https://n8n.io');
	});

	test('keeps a relative href', () => {
		expect(sanitizeHtml("<a href='/apps/acme/clients'>x</a>")).toContain('/apps/acme/clients');
	});

	test('keeps a mailto href', () => {
		expect(sanitizeHtml("<a href='mailto:a@b.com'>x</a>")).toContain('mailto:a@b.com');
	});

	test('keeps an https img src', () => {
		expect(sanitizeHtml("<img src='https://n8n.io/logo.png' />")).toContain(
			'https://n8n.io/logo.png',
		);
	});

	test('drops a non-https img src', () => {
		expect(sanitizeHtml("<img src='http://n8n.io/logo.png' />")).not.toContain('http://n8n.io');
	});

	test('strips an iframe and its content', () => {
		expect(sanitizeHtml("<iframe src='https://evil.example'>fallback</iframe>")).toBe('');
	});

	test('strips a form element', () => {
		expect(sanitizeHtml("<form action='/x'><input /></form>")).not.toContain('<form');
	});

	test('keeps the layout hooks the editor reads', () => {
		expect(
			sanitizeHtml("<div data-block-id='menu' data-foo='x'></div><main data-app-slot></main>"),
		).toBe('<div data-block-id="menu"></div><main data-app-slot></main>');
	});

	test('strips an unsupported element but keeps its text', () => {
		expect(sanitizeHtml('<marquee>hi</marquee>')).toBe('hi');
	});
});
