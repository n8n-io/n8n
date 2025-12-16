import { isObjectLiteral } from '../is-object-literal';

describe('isObjectLiteral', () => {
	test.each([
		['empty object literal', {}, true],
		['object with properties', { foo: 'bar', num: 123 }, true],
		['nested object literal', { nested: { foo: 'bar' } }, true],
		['object with symbol key', { [Symbol.for('foo')]: 'bar' }, true],
		['null', null, false],
		['empty array', [], false],
		['array with values', [1, 2, 3], false],
		['number', 42, false],
		['string', 'string', false],
		['boolean', true, false],
		['undefined', undefined, false],
		['Date object', new Date(), false],
		['RegExp object', new RegExp(''), false],
		['Map object', new Map(), false],
		['Set object', new Set(), false],
		['arrow function', () => {}, false],
		['regular function', function () {}, false],
		['class instance', new (class TestClass {})(), false],
		['object with custom prototype', Object.create({ customMethod: () => {} }), true],
		['Object.create(null)', Object.create(null), false],
		['Buffer', Buffer.from('test'), false],
		['Serialized Buffer', Buffer.from('test').toJSON(), true],
		['Promise', new Promise(() => {}), false],
	])('should return %s for %s', (_, input, expected) => {
		expect(isObjectLiteral(input)).toBe(expected);
	});

	it('should return false for Error objects', () => {
		expect(isObjectLiteral(new Error())).toBe(false);
	});
});
