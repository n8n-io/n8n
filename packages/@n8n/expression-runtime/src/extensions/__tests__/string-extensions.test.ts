import { describe, it, expect } from 'vitest';
import { stringExtensions } from '../string-extensions';

const extractUrlPath = stringExtensions.functions.extractUrlPath as (
	value: string,
) => string | undefined;

const toSentenceCase = stringExtensions.functions.toSentenceCase as (value: string) => string;

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

describe('toSentenceCase', () => {
	it.each([
		[
			'i am a test! i have multiple types of Punctuation. or do i?',
			'I am a test! I have multiple types of punctuation. Or do i?',
		],
		['i am a test!', 'I am a test!'],
		['i am a test', 'I am a test'],
		['quick! brown FOX', 'Quick! Brown fox'],
	])('should sentence-case %s', (input, expected) => {
		expect(toSentenceCase(input)).toBe(expected);
	});

	it.each([
		['hello world. 123', 'Hello world. 123'],
		['end with punc. 42!', 'End with punc. 42!'],
		['growth is high. 50%', 'Growth is high. 50%'],
	])('should preserve trailing letter-less text in %s', (input, expected) => {
		expect(toSentenceCase(input)).toBe(expected);
	});

	it.each([
		['42', '42'],
		['', ''],
	])('should return letter-free input %p unchanged', (input, expected) => {
		expect(toSentenceCase(input)).toBe(expected);
	});
});
