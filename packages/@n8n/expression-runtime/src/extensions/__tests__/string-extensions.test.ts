import { describe, it, expect } from 'vitest';
import { stringExtensions } from '../string-extensions';

const toSentenceCase = stringExtensions.functions.toSentenceCase as (value: string) => string;

const toFloat = stringExtensions.functions.toFloat as (value: string) => number;

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
