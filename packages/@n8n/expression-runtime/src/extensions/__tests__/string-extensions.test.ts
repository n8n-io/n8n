import { describe, it, expect } from 'vitest';
import { stringExtensions } from '../string-extensions';

const extractUrlPath = stringExtensions.functions.extractUrlPath as (
	value: string,
) => string | undefined;

describe('extractUrlPath (imperative parser, no URL constructor)', () => {
	it.each([
		['https://example.com/path', '/path'],
		['https://example.com', '/'],
		['https://example.com/', '/'],
		['https://example.com/path?query=1#hash', '/path'],
		['https://example.com:8080/path', '/path'],
		['ftp://files.example.com/doc.pdf', '/doc.pdf'],
		['https://example.com/valid/deep/path', '/valid/deep/path'],
		['http://user:pass@example.com/path', '/path'],
		['https://example.com:443/path', '/path'],
		['https://sub.domain.example.com/path', '/path'],
	])('should extract pathname from %s', (input, expected) => {
		expect(extractUrlPath(input)).toBe(expected);
	});

	it.each([
		['not-a-url'],
		['https://'],
		[''],
		[':://no-scheme'],
		['http:/malformed'],
		['h$tp://example.com/path'],
		['ht tp://example.com/path'],
	])('should return undefined for malformed input: %s', (input) => {
		expect(extractUrlPath(input)).toBeUndefined();
	});
});
