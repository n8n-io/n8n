import { describe, it, expect } from 'vitest';
import { stringExtensions } from '../string-extensions';

const toSentenceCase = stringExtensions.functions.toSentenceCase as (value: string) => string;

const toFloat = stringExtensions.functions.toFloat as (value: string) => number;

const removeTags = stringExtensions.functions.removeTags as (value: string) => string;

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

describe('toFloat', () => {
	it.each([
		['R$5.50', 5.5],
		['$5.50', 5.5],
		['5.50 €', 5.5],
	])('should strip the currency symbol from %s', (input, expected) => {
		expect(toFloat(input)).toBe(expected);
	});

	it('should not accept a symbol that is not in the list', () => {
		expect(() => toFloat('Rb5')).toThrow();
	});
});

describe('removeTags', () => {
	it.each([
		['<b>bold</b>, <a>link</a>', 'bold, link'],
		['<p class="x">Hi</p><br/>there', 'Hithere'],
		['<!-- note -->text', 'text'],
		['<?xml version="1.0"?><a>x</a>', 'x'],
		['<élan>x</élan>', 'x'],
		['<_id>idhere</_id>', 'idhere'],
		['<:x>y</:x>', 'y'],
		['<ns:tag>y</ns:tag>', 'y'],
		['trailing <b', 'trailing '],
		['<b>bold</b> < 100', 'bold < 100'],
	])('should remove the tags from %s', (input, expected) => {
		expect(removeTags(input)).toBe(expected);
	});

	it.each([
		'price < 100 USD',
		'a<2 and b>1',
		'x <= y',
		'I <3 you',
		'a < b and c > d',
		'<< 3',
		'<>',
		'<%= name %>',
		'price <€50 today',
	])('should keep the text %s', (input) => {
		expect(removeTags(input)).toBe(input);
	});

	it.each([
		['<<b>script>alert(1)<</b>/script>', 'script>alert(1)/script>'],
		['<<img>img src=x onerror=alert(1)>', 'img src=x onerror=alert(1)>'],
	])('should not leave a tag in the output of %s', (input, expected) => {
		expect(removeTags(input)).toBe(expected);
	});

	it('should handle a long run of less-than signs in linear time', () => {
		const input = '<'.repeat(100_000) + ' ';
		const start = performance.now();
		expect(removeTags(input)).toBe(input);
		expect(performance.now() - start).toBeLessThan(1000);
	});
});
