import { isJsonCompatible } from '../is-json-compatible';

describe('isJsonCompatible', () => {
	type CircularReferenceObject = { self: CircularReferenceObject };
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const circularReferencedObject: CircularReferenceObject = {} as any;
	circularReferencedObject.self = circularReferencedObject;

	type CircularReferencedArray = CircularReferencedArray[];
	const circularReferencedArray: CircularReferencedArray = [];
	circularReferencedArray.push(circularReferencedArray);

	type CircularReferencedArrayInObject = { cycle: CircularReferencedArrayInObject[] };
	const temp: CircularReferencedArrayInObject[] = [];
	const circularReferencedArrayInObject = { cycle: temp };
	temp.push(circularReferencedArrayInObject);

	type CircularReferencedObjectInArray = Array<{ cycle: CircularReferencedObjectInArray }>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const circularReferencedObjectInArray: CircularReferencedObjectInArray = [] as any;
	circularReferencedObjectInArray.push({ cycle: circularReferencedObjectInArray });

	test.each([
		{
			name: 'new Date()',
			value: { date: new Date() },
			errorPath: 'value.date',
			errorMessage: 'has non-plain prototype (Date)',
		},
		{
			name: 'a RegExp',
			value: { regexp: new RegExp('') },
			errorPath: 'value.regexp',
			errorMessage: 'has non-plain prototype (RegExp)',
		},
		{
			name: 'a Buffer',
			value: { buffer: Buffer.from('') },
			errorPath: 'value.buffer',
			errorMessage: 'has non-plain prototype (Buffer)',
		},
		{
			name: 'a function',
			value: { fn: () => {} },
			errorPath: 'value.fn',
			errorMessage: 'is a function, which is not JSON-compatible',
		},
		{
			name: 'a circular referenced object',
			value: circularReferencedObject,
			errorPath: 'value.self',
			errorMessage: 'contains a circular reference',
		},
		{
			name: 'a circular referenced array',
			value: circularReferencedArray,
			errorPath: 'value[0]',
			errorMessage: 'contains a circular reference',
		},
		{
			name: 'an array in a object referencing the object',
			value: circularReferencedArrayInObject,
			errorPath: 'value.cycle[0]',
			errorMessage: 'contains a circular reference',
		},
		{
			name: 'an object in a array referencing the array',
			value: circularReferencedObjectInArray,
			errorPath: 'value[0].cycle',
			errorMessage: 'contains a circular reference',
		},
		{
			name: 'a symbol',
			value: { symbol: Symbol() },
			errorPath: 'value.symbol',
			errorMessage: 'is a symbol, which is not JSON-compatible',
		},
		{
			name: 'a bigint',
			value: { bigint: BigInt(1) },
			errorPath: 'value.bigint',
			errorMessage: 'is a bigint, which is not JSON-compatible',
		},
		{
			name: 'a Set',
			value: { bigint: new Set() },
			errorPath: 'value.bigint',
			errorMessage: 'has non-plain prototype (Set)',
		},
		{
			name: 'Infinity',
			value: { infinity: Infinity },
			errorPath: 'value.infinity',
			errorMessage: 'is Infinity, which is not JSON-compatible',
		},
		{
			name: 'NaN',
			value: { nan: NaN },
			errorPath: 'value.nan',
			errorMessage: 'is NaN, which is not JSON-compatible',
		},
		{
			name: 'an object with symbol keys',
			value: { [Symbol.for('key')]: 1 },
			errorPath: 'value.Symbol(key)',
			errorMessage: 'has a symbol key (Symbol(key)), which is not JSON-compatible',
		},
	])('returns invalid for "$name"', ({ value, errorPath, errorMessage }) => {
		const result = isJsonCompatible(value);

		if (result.isValid) {
			fail('expected result to be invalid');
		}

		expect(result.errorPath).toBe(errorPath);
		expect(result.errorMessage).toBe(errorMessage);
	});

	const objectRef = {};
	test.each([
		{ name: 'null', value: { null: null } },
		{ name: 'undefined', value: { noValue: undefined } },
		{ name: 'an array of primitives', value: { array: [1, 'string', true, false] } },
		{
			name: 'an object without a prototype chain',
			value: { objectWithoutPrototype: Object.create(null) },
		},
		{
			name: 'repeated objects references in an array that are not circular',
			value: { array: [objectRef, objectRef] },
		},
		{
			name: 'repeated objects references in an object that are not circular',
			value: { array: { object1: objectRef, object2: objectRef } },
		},
	])('returns valid for "$name"', ({ value }) => {
		const result = isJsonCompatible(value);

		expect(result.isValid).toBe(true);
	});

	test('skip keys that are in the keysToIgnore set', () => {
		const value = {
			invalidObject: { invalidBecauseUndefined: undefined },
			validObject: { key: 'value' },
		};
		const result = isJsonCompatible(value, new Set(['invalidObject']));

		expect(result.isValid).toBe(true);
	});
});
