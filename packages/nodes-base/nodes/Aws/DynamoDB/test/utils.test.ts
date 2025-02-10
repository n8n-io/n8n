import type { IAttributeValue } from '../types';
import { adjustPutItem, simplify } from '../utils';

describe('DynamoDB Utils', () => {
	describe('V1 Implementation', () => {
		describe('adjustPutItem', () => {
			it('should handle primitive types with original flaws', () => {
				const input = {
					stringField: 'hello',
					numberString: '42',
					booleanField: true,
					numberField: 42,
					arrayField: [1, 2, 3],
				};

				const expected = {
					stringField: { S: 'hello' },
					numberString: { N: '42' },
					booleanField: { BOOL: 'true' },
					numberField: { N: '42' },
					arrayField: { S: '1,2,3' },
				} as any;

				expect(adjustPutItem(input, 1)).toEqual(expected);
			});

			it('should incorrectly type numeric strings', () => {
				const input = {
					validNumber: '123',
					invalidNumber: '123abc',
					exponential: '1e3',
					emptyString: '',
				};

				const expected = {
					validNumber: { N: '123' },
					invalidNumber: { S: '123abc' },
					exponential: { N: '1e3' },
					emptyString: { N: '' },
				};

				expect(adjustPutItem(input, 1)).toEqual(expected);
			});

			it('should handle objects and preserve original array handling flaw', () => {
				const input = {
					simpleObject: { a: 1 },
					nestedObject: { a: { b: 2 } },
					array: [1, 'two', false],
					emptyArray: [],
				};

				const expected = {
					simpleObject: { M: '[object Object]' },
					nestedObject: { M: '[object Object]' },
					array: { S: '1,two,false' },
					emptyArray: { N: '' },
				};

				expect(adjustPutItem(input, 1)).toEqual(expected);
			});

			it('should handle edge cases with original behavior', () => {
				const input = {
					zero: 0,
					negative: -5,
					booleanString: 'true',
					emptyObject: {},
				};

				const expected = {
					zero: { N: '0' },
					negative: { N: '-5' },
					booleanString: { S: 'true' },
					emptyObject: { M: '[object Object]' },
				};

				expect(adjustPutItem(input, 1)).toEqual(expected);
			});
		});

		describe('simplify', () => {
			it('should decode primitive types with original behavior', () => {
				const input: IAttributeValue = {
					stringField: { S: 'hello' },
					numberField: { N: '42' },
					booleanField: { BOOL: 'true' },
					nullField: { NULL: 'true' },
				} as any;

				const expected = {
					stringField: 'hello',
					numberField: 42,
					booleanField: true,
					nullField: null,
				};

				expect(simplify(input, 1)).toEqual(expected);
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
				} as any;

				const expected = {
					nested: {
						a: 1,
						b: 'two',
						c: {
							d: false,
						},
					},
					list: '1,two,true',
				};

				expect(simplify(input, 1)).toEqual(expected);
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

				const result = simplify(input, 1);
				expect(result.numberAsString).toBe(expected.numberAsString);
				expect(isNaN(result.stringAsNumber as number)).toBe(true);
			});

			it('should handle empty values and edge cases', () => {
				const input: IAttributeValue = {
					emptyString: { S: '' },
					zero: { N: '0' },
					emptyMap: { M: {} },
					invalidBool: { BOOL: 'maybe' },
				} as any;

				const expected = {
					emptyString: '',
					zero: 0,
					emptyMap: {},
					invalidBool: true,
				};

				expect(simplify(input, 1)).toEqual(expected);
			});
		});

		describe('Original Flaw Preservation', () => {
			test('Arrays are stringified with commas', () => {
				const input = { arr: [1, 'a', true] };
				const result = adjustPutItem(input, 1);
				expect(result.arr).toEqual({ S: '1,a,true' });
			});

			test('Non-numeric strings in N type become NaN', () => {
				const input: IAttributeValue = {
					badNumber: { N: 'abc' },
				};
				const result = simplify(input, 1);
				expect(isNaN(result.badNumber as number)).toBe(true);
			});

			test('Boolean strings not converted properly', () => {
				const input = { boolStr: 'true' };
				const result = adjustPutItem(input, 1);
				expect(result.boolStr).toEqual({ S: 'true' });
			});
		});
	});

	describe('V1.1 Implementation', () => {
		describe('adjustPutItem', () => {
			it('should handle primitive types correctly', () => {
				const input = {
					stringField: 'hello',
					numberField: 42,
					booleanField: true,
					nullField: null,
				};

				const expected: IAttributeValue = {
					stringField: { S: 'hello' },
					numberField: { N: '42' },
					booleanField: { BOOL: true },
					nullField: { NULL: true },
				};

				expect(adjustPutItem(input, 1.1)).toEqual(expected);
			});

			it('should handle string numbers correctly', () => {
				const input = {
					stringNumber: '42',
					notANumber: 'hello',
					actualNumber: 42,
				};

				const expected: IAttributeValue = {
					stringNumber: { S: '42' },
					notANumber: { S: 'hello' },
					actualNumber: { N: '42' },
				};

				expect(adjustPutItem(input, 1.1)).toEqual(expected);
			});

			it('should handle arrays correctly', () => {
				const input = {
					emptyArray: [],
					stringArray: ['a', 'b', 'c'],
					numberArray: [1, 2, 3],
					mixedArray: ['a', 1, true, { key: 'value' }],
				};

				const expected: IAttributeValue = {
					emptyArray: { L: [] },
					stringArray: { SS: ['a', 'b', 'c'] },
					numberArray: { NS: ['1', '2', '3'] },
					mixedArray: {
						L: [{ S: 'a' }, { N: '1' }, { BOOL: true }, { M: { key: { S: 'value' } } }],
					},
				};

				expect(adjustPutItem(input, 1.1)).toEqual(expected);
			});

			it('should handle nested objects correctly', () => {
				const input = {
					user: {
						name: 'John',
						age: 30,
						address: {
							street: '123 Main St',
							city: 'New York',
							coordinates: {
								lat: 40.7128,
								lng: -74.006,
							},
						},
					},
				};

				const expected: IAttributeValue = {
					user: {
						M: {
							name: { S: 'John' },
							age: { N: '30' },
							address: {
								M: {
									street: { S: '123 Main St' },
									city: { S: 'New York' },
									coordinates: {
										M: {
											lat: { N: '40.7128' },
											lng: { N: '-74.006' },
										},
									},
								},
							},
						},
					},
				};

				expect(adjustPutItem(input, 1.1)).toEqual(expected);
			});

			it('should handle edge cases correctly', () => {
				const input = {
					undefinedField: undefined,
					emptyString: '',
					zero: 0,
					negativeNumber: -123.456,
					emptyObject: {},
					complexArray: [[1, 2, 3], { nested: true }, ['a', 'b']],
				};

				const expected: IAttributeValue = {
					undefinedField: { NULL: true },
					emptyString: { S: '' },
					zero: { N: '0' },
					negativeNumber: { N: '-123.456' },
					emptyObject: { M: {} },
					complexArray: {
						L: [{ NS: ['1', '2', '3'] }, { M: { nested: { BOOL: true } } }, { SS: ['a', 'b'] }],
					},
				};

				expect(adjustPutItem(input, 1.1)).toEqual(expected);
			});
		});

		describe('simplify/decodeAttribute', () => {
			it('should decode primitive types correctly', () => {
				const input: IAttributeValue = {
					stringField: { S: 'hello' },
					numberField: { N: '42' },
					booleanField: { BOOL: 'true' },
					nullField: { NULL: true },
				} as any;

				const expected = {
					stringField: 'hello',
					numberField: 42,
					booleanField: true,
					nullField: null,
				};

				expect(simplify(input, 1.1)).toEqual(expected);
			});

			it('should decode arrays correctly', () => {
				const input: IAttributeValue = {
					stringSet: { SS: ['a', 'b', 'c'] },
					numberSet: { NS: ['1', '2', '3'] },
					list: {
						L: [{ S: 'a' }, { N: '1' }, { BOOL: true }, { M: { key: { S: 'value' } } }],
					},
				};

				const expected = {
					stringSet: ['a', 'b', 'c'],
					numberSet: [1, 2, 3],
					list: ['a', 1, true, { key: 'value' }],
				};

				expect(simplify(input, 1.1)).toEqual(expected);
			});

			it('should decode nested objects correctly', () => {
				const input: IAttributeValue = {
					user: {
						M: {
							name: { S: 'John' },
							age: { N: '30' },
							address: {
								M: {
									street: { S: '123 Main St' },
									city: { S: 'New York' },
									coordinates: {
										M: {
											lat: { N: '40.7128' },
											lng: { N: '-74.006' },
										},
									},
								},
							},
							tags: { SS: ['customer', 'premium'] },
							scores: { NS: ['95', '87', '92'] },
						},
					},
				};

				const expected = {
					user: {
						name: 'John',
						age: 30,
						address: {
							street: '123 Main St',
							city: 'New York',
							coordinates: {
								lat: 40.7128,
								lng: -74.006,
							},
						},
						tags: ['customer', 'premium'],
						scores: [95, 87, 92],
					},
				};

				expect(simplify(input, 1.1)).toEqual(expected);
			});

			it('should handle edge cases correctly', () => {
				const input: IAttributeValue = {
					emptyString: { S: '' },
					zero: { N: '0' },
					negativeNumber: { N: '-123.456' },
					emptyMap: { M: {} },
					emptyList: { L: [] },
				};

				const expected = {
					emptyString: '',
					zero: 0,
					negativeNumber: -123.456,
					emptyMap: {},
					emptyList: [],
				};

				expect(simplify(input, 1.1)).toEqual(expected);
			});

			it('should handle malformed input gracefully', () => {
				const input: IAttributeValue = {
					malformedMap: { M: {} },
					malformedList: { L: [] },
					malformedValue: { NULL: true },
				};

				const expected = {
					malformedMap: {},
					malformedList: [],
					malformedValue: null,
				};

				expect(simplify(input, 1.1)).toEqual(expected);
			});
		});
	});
});
