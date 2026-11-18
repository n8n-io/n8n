import { describe, it, expect } from 'vitest';
import { stringExtensions } from '../string-extensions';

const isEmail = stringExtensions.functions.isEmail as (value: string) => boolean;
const extractEmail = stringExtensions.functions.extractEmail as (
	value: string,
) => string | undefined;
const extractDomain = stringExtensions.functions.extractDomain as (
	value: string,
) => string | undefined;

describe('isEmail', () => {
	it.each([
		'test@example.com!',
		'test@example.com;',
		'test@example.com/extra',
		'<test@example.com>',
	])('returns false when the string contains extra characters: %s', (value) => {
		expect(isEmail(value)).toBe(false);
	});

	it.each(['me@example.com', 'test@example.com', 'first.last@sub.example.org'])(
		'returns true for a plain valid email: %s',
		(value) => {
			expect(isEmail(value)).toBe(true);
		},
	);

	it.each(['hello', "It's me@example.com", 'test @ n8n', 'me@example.com and more'])(
		'returns false for a non-email or a sentence: %s',
		(value) => {
			expect(isEmail(value)).toBe(false);
		},
	);
});

describe('extractEmail', () => {
	it('still extracts an email from a sentence', () => {
		expect(extractEmail('My email is me@example.com')).toBe('me@example.com');
	});

	it('still extracts the first email when followed by punctuation', () => {
		expect(extractEmail('Contact test@example.com; thanks')).toBe('test@example.com');
	});
});

describe('extractDomain', () => {
	it('still extracts the domain from a valid email', () => {
		expect(extractDomain('me@example.com')).toBe('example.com');
	});
});
