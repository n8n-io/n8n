import { adjustPutItem, simplify } from '../utils';
import type { IAttributeValue } from '../types';

describe('DynamoDB Utils', () => {
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

			expect(adjustPutItem(input)).toEqual(expected);
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

			expect(adjustPutItem(input)).toEqual(expected);
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

			expect(adjustPutItem(input)).toEqual(expected);
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
					tags: ['customer', 'premium'],
					scores: [95, 87, 92],
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
						tags: { SS: ['customer', 'premium'] },
						scores: { NS: ['95', '87', '92'] },
					},
				},
			};

			expect(adjustPutItem(input)).toEqual(expected);
		});

		it('should handle edge cases correctly', () => {
			const input = {
				undefined: undefined,
				emptyString: '',
				zero: 0,
				negativeNumber: -123.456,
				emptyObject: {},
				complexArray: [[1, 2, 3], { nested: true }, ['a', 'b']],
			};

			const expected: IAttributeValue = {
				undefined: { NULL: true },
				emptyString: { S: '' },
				zero: { N: '0' },
				negativeNumber: { N: '-123.456' },
				emptyObject: { M: {} },
				complexArray: {
					L: [{ NS: ['1', '2', '3'] }, { M: { nested: { BOOL: true } } }, { SS: ['a', 'b'] }],
				},
			};

			expect(adjustPutItem(input)).toEqual(expected);
		});
	});

	describe('simplify/decodeAttribute', () => {
		it('should decode primitive types correctly', () => {
			const input: IAttributeValue = {
				stringField: { S: 'hello' },
				numberField: { N: '42' },
				booleanField: { BOOL: true },
				nullField: { NULL: true },
			};

			const expected = {
				stringField: 'hello',
				numberField: 42,
				booleanField: true,
				nullField: null,
			};

			expect(simplify(input)).toEqual(expected);
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

			expect(simplify(input)).toEqual(expected);
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

			expect(simplify(input)).toEqual(expected);
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

			expect(simplify(input)).toEqual(expected);
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

			expect(simplify(input)).toEqual(expected);
		});
	});
});
