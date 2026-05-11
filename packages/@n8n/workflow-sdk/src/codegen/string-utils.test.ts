import { describe, it, expect } from '@jest/globals';

import { escapeString, needsQuoting, formatKey, escapeRegexChars } from './string-utils';

describe('string-utils', () => {
	describe('escapeString', () => {
		it('escapes backslashes', () => {
			expect(escapeString('path\\to\\file')).toBe('path\\\\to\\\\file');
		});

		it('escapes single quotes', () => {
			expect(escapeString("it's working")).toBe("it\\'s working");
		});

		it('escapes newlines', () => {
			expect(escapeString('line1\nline2')).toBe('line1\\nline2');
		});

		it('escapes carriage returns', () => {
			expect(escapeString('line1\rline2')).toBe('line1\\rline2');
		});

		it('preserves left single quotation mark as unicode', () => {
			expect(escapeString('test\u2018value')).toBe('test\\u2018value');
		});

		it('preserves right single quotation mark as unicode', () => {
			expect(escapeString('test\u2019value')).toBe('test\\u2019value');
		});

		it('preserves left double quotation mark as unicode', () => {
			expect(escapeString('test\u201Cvalue')).toBe('test\\u201Cvalue');
		});

		it('preserves right double quotation mark as unicode', () => {
			expect(escapeString('test\u201Dvalue')).toBe('test\\u201Dvalue');
		});

		it('handles multiple escape sequences', () => {
			expect(escapeString("it's a\ntest\\path")).toBe("it\\'s a\\ntest\\\\path");
		});

		it('returns empty string unchanged', () => {
			expect(escapeString('')).toBe('');
		});
	});

	describe('needsQuoting', () => {
		it('returns false for valid identifiers starting with letter', () => {
			expect(needsQuoting('name')).toBe(false);
			expect(needsQuoting('myVariable')).toBe(false);
			expect(needsQuoting('CamelCase')).toBe(false);
		});

		it('returns false for identifiers starting with underscore', () => {
			expect(needsQuoting('_private')).toBe(false);
			expect(needsQuoting('_')).toBe(false);
		});

		it('returns false for identifiers starting with dollar sign', () => {
			expect(needsQuoting('$data')).toBe(false);
			expect(needsQuoting('$')).toBe(false);
		});

		it('returns false for identifiers with digits after first char', () => {
			expect(needsQuoting('var1')).toBe(false);
			expect(needsQuoting('item123')).toBe(false);
		});

		it('returns true for identifiers starting with digit', () => {
			expect(needsQuoting('1name')).toBe(true);
			expect(needsQuoting('123')).toBe(true);
		});

		it('returns true for strings with spaces', () => {
			expect(needsQuoting('my name')).toBe(true);
		});

		it('returns true for strings with special characters', () => {
			expect(needsQuoting('my-name')).toBe(true);
			expect(needsQuoting('my.name')).toBe(true);
			expect(needsQuoting('my@name')).toBe(true);
		});

		it('returns true for empty string', () => {
			expect(needsQuoting('')).toBe(true);
		});
	});

	describe('formatKey', () => {
		it('returns unquoted key for valid identifier', () => {
			expect(formatKey('name')).toBe('name');
			expect(formatKey('_private')).toBe('_private');
			expect(formatKey('$data')).toBe('$data');
		});

		it('returns quoted key for invalid identifier', () => {
			expect(formatKey('my-name')).toBe("'my-name'");
			expect(formatKey('123')).toBe("'123'");
			expect(formatKey('my name')).toBe("'my name'");
		});

		it('escapes quotes inside quoted keys', () => {
			expect(formatKey("it's")).toBe("'it\\'s'");
		});

		it('escapes special characters in quoted keys', () => {
			expect(formatKey('path\\to')).toBe("'path\\\\to'");
		});
	});

	describe('escapeRegexChars', () => {
		it('escapes dot', () => {
			expect(escapeRegexChars('a.b')).toBe('a\\.b');
		});

		it('escapes asterisk', () => {
			expect(escapeRegexChars('a*b')).toBe('a\\*b');
		});

		it('escapes plus', () => {
			expect(escapeRegexChars('a+b')).toBe('a\\+b');
		});

		it('escapes question mark', () => {
			expect(escapeRegexChars('a?b')).toBe('a\\?b');
		});

		it('escapes caret', () => {
			expect(escapeRegexChars('^start')).toBe('\\^start');
		});

		it('escapes dollar', () => {
			expect(escapeRegexChars('end$')).toBe('end\\$');
		});

		it('escapes curly braces', () => {
			expect(escapeRegexChars('a{1,3}b')).toBe('a\\{1,3\\}b');
		});

		it('escapes parentheses', () => {
			expect(escapeRegexChars('(group)')).toBe('\\(group\\)');
		});

		it('escapes pipe', () => {
			expect(escapeRegexChars('a|b')).toBe('a\\|b');
		});

		it('escapes square brackets', () => {
			expect(escapeRegexChars('[abc]')).toBe('\\[abc\\]');
		});

		it('escapes backslash', () => {
			expect(escapeRegexChars('a\\b')).toBe('a\\\\b');
		});

		it('handles multiple special characters', () => {
			expect(escapeRegexChars('file.name (copy)')).toBe('file\\.name \\(copy\\)');
		});

		it('returns empty string unchanged', () => {
			expect(escapeRegexChars('')).toBe('');
		});

		it('returns string without special chars unchanged', () => {
			expect(escapeRegexChars('simple')).toBe('simple');
		});
	});
});
