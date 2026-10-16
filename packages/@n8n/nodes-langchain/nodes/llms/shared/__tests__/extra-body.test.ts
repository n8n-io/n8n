import type { INode, NodeOperationError } from 'n8n-workflow';

import { parseExtraBody } from '../extra-body';

const node = {
	id: '1',
	name: 'n',
	type: 't',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
} as INode;
const ctx = { getNode: () => node };

const parse = (value: unknown) => parseExtraBody(ctx, value, 0);

describe('parseExtraBody', () => {
	it('should parse a JSON object string', () => {
		expect(parse('{"top_k":40}')).toEqual({ top_k: 40 });
	});

	// The field default. Opening the option without editing it must not change the request.
	it('should accept the empty object the field defaults to', () => {
		expect(parse('{}')).toEqual({});
	});

	// A whole-value expression on a `json` field arrives already resolved.
	it('should accept an object that an expression already resolved', () => {
		expect(parse({ top_k: 40 })).toEqual({ top_k: 40 });
	});

	it.each([
		['not json', 'The value in the "Extra Body" field is not valid JSON'],
		['{"a":', 'The value in the "Extra Body" field is not valid JSON'],
	])('should reject %s', (value, message) => {
		expect(() => parse(value)).toThrow(message);
	});

	it.each([
		['an array', '[1,2]'],
		['a quoted string', '"nope"'],
		['a number', '7'],
		['null', 'null'],
		['a resolved array', [1, 2]],
		['a resolved number', 7],
	])('should reject %s, which is not an object', (_, value) => {
		expect(() => parse(value)).toThrow('must be a JSON object');
	});

	// These pass a bare "is it an object" check but have no enumerable own keys, so accepting one
	// would merge nothing and the field would look ignored rather than rejected.
	it.each([
		['a Date', new Date('2026-01-01')],
		['a Map', new Map([['top_k', 40]])],
		['a Set', new Set([1, 2])],
		['a RegExp', /x/],
		['a class instance', new (class Thing {})()],
	])('should reject %s, which is an object but not an object literal', (_, value) => {
		expect(() => parse(value)).toThrow('must be a JSON object');
	});

	it('should accept a null-prototype object, which is still plain data', () => {
		const bare = Object.assign(Object.create(null), { top_k: 40 });

		expect(parse(bare)).toEqual({ top_k: 40 });
	});

	// The whole shared denylist, not a sample: this test is what claims the policy is locked down,
	// so it has to fail if n8n-workflow adds a name and this parser silently stops covering it.
	it.each([
		'__proto__',
		'prototype',
		'constructor',
		'getPrototypeOf',
		'setPrototypeOf',
		'getOwnPropertyDescriptor',
		'getOwnPropertyDescriptors',
		'defineProperty',
		'defineProperties',
		'mainModule',
		'binding',
		'_linkedBinding',
		'_load',
		'prepareStackTrace',
		'__lookupGetter__',
		'__lookupSetter__',
		'__defineGetter__',
		'__defineSetter__',
		'caller',
		'callee',
		'arguments',
		'getBuiltinModule',
		'dlopen',
		'execve',
		'loadEnvFile',
	])('should refuse the reserved key %s', (key) => {
		expect(() => parse(JSON.stringify({ [key]: 1 }))).toThrow(
			`The "Extra Body" field cannot set "${key}"`,
		);
	});

	it('should name the key in the description so the builder knows what to remove', () => {
		try {
			parse('{"__proto__":{"x":1}}');
			throw new Error('expected a throw');
		} catch (error) {
			expect((error as NodeOperationError).description).toContain('__proto__');
		}
	});

	// Only the top level is merged into the request options, so a nested name is inert data.
	it('should allow a reserved name nested inside a value', () => {
		expect(parse('{"tools":{"constructor":1}}')).toEqual({ tools: { constructor: 1 } });
	});
});
