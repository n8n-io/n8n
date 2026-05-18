import { containsNoHtml } from '../no-html';

describe('containsNoHtml', () => {
	test.each([
		'My Workflow',
		'My Workflow 2024',
		'Workflow with spaces and 123 numbers',
		"O'Brien's workflow",
		'workflow & report',
		'a',
		'name-with-dashes_and.dots',
		'name/with/slashes',
		'name (with) (parens)',
	])('returns true for plain string %p', (value) => {
		expect(containsNoHtml(value)).toBe(true);
	});

	test.each([
		'<script>alert(1)</script>',
		'<img src=x onerror=alert(1)>',
		'<svg onload=alert(1)>',
		'<a href="javascript:alert(1)">click</a>',
		'<iframe src="evil"></iframe>',
		'Name with <b>bold</b>',
		'<style>body{}</style>',
		'<SCRIPT>alert(1)</SCRIPT>',
		'<script src=//evil.com></script>',
		'7 > 3 is true',
		'< not really a tag',
	])('returns false for value containing HTML-significant characters %p', (value) => {
		expect(containsNoHtml(value)).toBe(false);
	});

	test('returns true for empty string', () => {
		expect(containsNoHtml('')).toBe(true);
	});
});
