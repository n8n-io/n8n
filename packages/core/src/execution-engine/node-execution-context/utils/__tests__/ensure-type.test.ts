import { ExpressionError } from 'n8n-workflow';

import { ensureType } from '../ensure-type';

describe('ensureType', () => {
	it('throws error for null value', () => {
		expect(() => ensureType('string', null, 'myParam')).toThrowError(
			new ExpressionError("Parameter 'myParam' must not be null"),
		);
	});

	it('throws error for undefined value', () => {
		expect(() => ensureType('string', undefined, 'myParam')).toThrowError(
			new ExpressionError("Parameter 'myParam' could not be 'undefined'"),
		);
	});

	it('returns string value without modification', () => {
		const value = 'hello';
		const expectedValue = value;
		const result = ensureType('string', value, 'myParam');
		expect(result).toBe(expectedValue);
	});

	it('returns number value without modification', () => {
		const value = 42;
		const expectedValue = value;
		const result = ensureType('number', value, 'myParam');
		expect(result).toBe(expectedValue);
	});

	it('returns boolean value without modification', () => {
		const value = true;
		const expectedValue = value;
		const result = ensureType('boolean', value, 'myParam');
		expect(result).toBe(expectedValue);
	});

	it('converts object to string if toType is string', () => {
		const value = { name: 'John' };
		const expectedValue = JSON.stringify(value);
		const result = ensureType('string', value, 'myParam');
		expect(result).toBe(expectedValue);
	});

	it('converts string to number if toType is number', () => {
		const value = '10';
		const expectedValue = 10;
		const result = ensureType('number', value, 'myParam');
		expect(result).toBe(expectedValue);
	});

	it('throws error for invalid conversion to number', () => {
		const value = 'invalid';
		expect(() => ensureType('number', value, 'myParam')).toThrowError(
			new ExpressionError("Parameter 'myParam' must be a number, but we got 'invalid'"),
		);
	});

	it('parses valid JSON string to object if toType is object', () => {
		const value = '{"name": "Alice"}';
		const expectedValue = JSON.parse(value);
		const result = ensureType('object', value, 'myParam');
		expect(result).toEqual(expectedValue);
	});

	it('throws error for invalid JSON string to object conversion', () => {
		const value = 'invalid_json';
		expect(() => ensureType('object', value, 'myParam')).toThrowError(
			new ExpressionError("Parameter 'myParam' could not be parsed"),
		);
	});

	it('throws error for non-array value if toType is array', () => {
		const value = { name: 'Alice' };
		expect(() => ensureType('array', value, 'myParam')).toThrowError(
			new ExpressionError("Parameter 'myParam' must be an array, but we got object"),
		);
	});
});
