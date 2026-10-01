import { describe, expect, it } from 'vitest';

import { assert } from './assert';

describe('assert', () => {
	it('does not throw for a truthy condition', () => {
		expect(() => assert(true)).not.toThrow();
	});

	it('throws the given message for a falsy condition', () => {
		expect(() => assert(false, 'Custom message')).toThrow('Custom message');
	});

	it('throws the default message for a falsy condition without a message', () => {
		expect(() => assert(false)).toThrow('Assertion failed');
	});

	it.each(['', '   ', '\t\n'])('throws the default message for a blank message %j', (message) => {
		expect(() => assert(false, message)).toThrow('Assertion failed');
	});
});
