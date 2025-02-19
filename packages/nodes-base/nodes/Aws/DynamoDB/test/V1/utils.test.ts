import type { AdjustedPutItem, IAttributeValue } from '../../V1/types';
import { adjustPutItem, simplify } from '../../V1/utils';

describe('DynamoDB Utils V1 (Original Implementation)', () => {
	describe('adjustPutItem', () => {
		it('should handle primitive types with original flaws', () => {
			const input = {
				stringField: 'hello',
				numberString: '42',
				booleanField: true,
				numberField: 42,
				arrayField: [1, 2, 3],
			};

			const expected: AdjustedPutItem = {
				stringField: { S: 'hello' },
				numberString: { N: '42' },
				booleanField: { BOOL: 'true' },
				numberField: { N: '42' },
				arrayField: { S: '1,2,3' },
			};

			expect(adjustPutItem(input as any)).toEqual(expected);
		});

		it('should incorrectly type numeric strings', () => {
			const input = {
				validNumber: '123',
				invalidNumber: '123abc',
				exponential: '1e3',
				emptyString: '',
			};

			const expected: AdjustedPutItem = {
				validNumber: { N: '123' },
				invalidNumber: { S: '123abc' },
				exponential: { N: '1e3' },
				emptyString: { N: '' },
			};

			expect(adjustPutItem(input as any)).toEqual(expected);
		});

		it('should handle objects and preserve original array handling flaw', () => {
			const input = {
				simpleObject: { a: 1 },
				nestedObject: { a: { b: 2 } },
				array: [1, 'two', false],
				emptyArray: [],
			};

			const expected: AdjustedPutItem = {
				simpleObject: { M: '[object Object]' },
				nestedObject: { M: '[object Object]' },
				array: { S: '1,two,false' },
				emptyArray: { N: '' },
			};

			expect(adjustPutItem(input as any)).toEqual(expected);
		});

		it('should handle edge cases with original behavior', () => {
			const input = {
				zero: 0,
				negative: -5,
				booleanString: 'true',
				emptyObject: {},
			};

			const expected: AdjustedPutItem = {
				zero: { N: '0' },
				negative: { N: '-5' },
				booleanString: { S: 'true' },
				emptyObject: { M: '[object Object]' },
			};

			expect(adjustPutItem(input as any)).toEqual(expected);
		});
	});

	describe('simplify', () => {
		it('should decode primitive types with original behavior', () => {
			const input: IAttributeValue = {
				stringField: { S: 'hello' },
				numberField: { N: '42' },
				booleanField: { BOOL: 'true' },
				nullField: { NULL: 'true' },
			};

			const expected = {
				stringField: 'hello',
				numberField: 42,
				booleanField: true,
				nullField: null,
			};

			expect(simplify(input)).toEqual(expected);
		});

		it('should handle nested objects and preserve flaws', () => {
			const input: IAttributeValue = {
				nested: {
					M: {
						a: { N: '1' },
						b: { S: 'two' },
						c: {
							M: {
								d: { BOOL: 'false' },
							},
						},
					},
				},
				list: { S: '1,two,true' },
			};

			const expected = {
				nested: {
					a: 1,
					b: 'two',
					c: {
						d: true,
					},
				},
				list: '1,two,true',
			};

			expect(simplify(input)).toEqual(expected);
		});

		it('should incorrectly handle number/string ambiguities', () => {
			const input: IAttributeValue = {
				numberAsString: { S: '42' },
				stringAsNumber: { N: 'hello' },
			};

			const expected = {
				numberAsString: '42',
				stringAsNumber: NaN,
			};

			const result = simplify(input);
			expect(result.numberAsString).toBe(expected.numberAsString);
			expect(isNaN(result.stringAsNumber as number)).toBe(true);
		});

		it('should handle empty values and edge cases', () => {
			const input: IAttributeValue = {
				emptyString: { S: '' },
				zero: { N: '0' },
				emptyMap: { M: {} },
				invalidBool: { BOOL: 'maybe' },
			};

			const expected = {
				emptyString: '',
				zero: 0,
				emptyMap: {},
				invalidBool: true,
			};

			expect(simplify(input)).toEqual(expected);
		});
	});

	describe('Original Flaw Preservation', () => {
		test('Arrays are stringified with commas', () => {
			const input = { arr: [1, 'a', true] };
			const result = adjustPutItem(input as any);
			expect(result.arr).toEqual({ S: '1,a,true' });
		});

		test('Non-numeric strings in N type become NaN', () => {
			const input: IAttributeValue = {
				badNumber: { N: 'abc' },
			};
			const result = simplify(input);
			expect(isNaN(result.badNumber as number)).toBe(true);
		});

		test('Boolean strings not converted properly', () => {
			const input = { boolStr: 'true' };
			const result = adjustPutItem(input as any);
			expect(result.boolStr).toEqual({ S: 'true' });
		});
	});
});
