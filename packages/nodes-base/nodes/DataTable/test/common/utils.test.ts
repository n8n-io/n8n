import { DateTime } from 'luxon';
import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { ANY_CONDITION, ALL_CONDITIONS } from '../../common/constants';
import { dataObjectToApiInput, buildGetManyFilter } from '../../common/utils';

const mockNode: INode = {
	id: 'test-node',
	name: 'Test Node',
	type: 'test',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('dataObjectToApiInput', () => {
	describe('primitive types', () => {
		it('should handle string values', () => {
			const input = { name: 'John', email: 'john@example.com' };
			const result = dataObjectToApiInput(input, mockNode, 0);

			expect(result).toEqual({
				name: 'John',
				email: 'john@example.com',
			});
		});

		it('should handle number values', () => {
			const input = { age: 25, price: 99.99, count: 0 };
			const result = dataObjectToApiInput(input, mockNode, 0);

			expect(result).toEqual({
				age: 25,
				price: 99.99,
				count: 0,
			});
		});

		it('should handle boolean values', () => {
			const input = { isActive: true, isDeleted: false };
			const result = dataObjectToApiInput(input, mockNode, 0);

			expect(result).toEqual({
				isActive: true,
				isDeleted: false,
			});
		});
	});

	describe('null and undefined values', () => {
		it('should convert null values to null', () => {
			const input = { field1: null, field2: 'value' };
			const result = dataObjectToApiInput(input, mockNode, 0);

			expect(result).toEqual({
				field1: null,
				field2: 'value',
			});
		});

		it('should convert undefined values to null', () => {
			const input = { field1: undefined, field2: 'value' };
			const result = dataObjectToApiInput(input, mockNode, 0);

			expect(result).toEqual({
				field1: null,
				field2: 'value',
			});
		});
	});

	describe('Date objects', () => {
		it('should handle JavaScript Date objects', () => {
			const testDate = new Date('2025-09-01T12:00:00.000Z');
			const input = { createdAt: testDate, name: 'test' };
			const result = dataObjectToApiInput(input, mockNode, 0);

			expect(result).toEqual({
				createdAt: testDate,
				name: 'test',
			});
		});
	});

	describe('Luxon DateTime objects', () => {
		it('should convert Luxon DateTime objects to JavaScript Date', () => {
			const luxonDateTime = DateTime.fromISO('2025-09-01T12:00:00.000Z');
			const input = { createdAt: luxonDateTime, name: 'test' };
			const result = dataObjectToApiInput(input, mockNode, 0);

			expect(result.name).toBe('test');
			expect(result.createdAt).toBeInstanceOf(Date);
			expect((result.createdAt as Date).toISOString()).toBe('2025-09-01T12:00:00.000Z');
		});
	});

	describe('date-like objects', () => {
		it('should convert objects with toISOString method to Date', () => {
			const dateLikeObject = {
				toISOString: () => '2025-09-01T12:00:00.000Z',
			};
			const input = { createdAt: dateLikeObject, name: 'test' };
			const result = dataObjectToApiInput(input, mockNode, 0);

			expect(result.name).toBe('test');
			expect(result.createdAt).toBeInstanceOf(Date);
			expect((result.createdAt as Date).toISOString()).toBe('2025-09-01T12:00:00.000Z');
		});

		it('should handle date-like objects where toISOString throws', () => {
			const dateLikeObject = {
				toISOString: () => {
					throw new Error('toISOString failed');
				},
			};
			const input = { createdAt: dateLikeObject, name: 'test' };

			expect(() => dataObjectToApiInput(input, mockNode, 0)).toThrow(NodeOperationError);
			expect(() => dataObjectToApiInput(input, mockNode, 0)).toThrow('unexpected object input');
		});
	});

	describe('error cases', () => {
		it('should throw error for array inputs', () => {
			const input = { items: ['item1', 'item2'] };

			expect(() => dataObjectToApiInput(input, mockNode, 0)).toThrow(NodeOperationError);
			expect(() => dataObjectToApiInput(input, mockNode, 0)).toThrow(
				'unexpected array input \'["item1","item2"]\' in row 0',
			);
		});

		it('should throw error for plain objects', () => {
			const input = { metadata: { key: 'value' } };

			expect(() => dataObjectToApiInput(input, mockNode, 0)).toThrow(NodeOperationError);
			expect(() => dataObjectToApiInput(input, mockNode, 0)).toThrow(
				'unexpected object input \'{"key":"value"}\' in row 0',
			);
		});

		it('should throw error for objects without toISOString method', () => {
			const input = { config: { setting1: true, setting2: 'value' } };

			expect(() => dataObjectToApiInput(input, mockNode, 0)).toThrow(NodeOperationError);
			expect(() => dataObjectToApiInput(input, mockNode, 0)).toThrow('unexpected object input');
		});

		test('dataObjectToApiInput throws on invalid date-like object', () => {
			const dateLikeObject = {
				toISOString: () => 'not-a-date',
			};
			const input = { createdAt: dateLikeObject, name: 'test' };

			expect(() => dataObjectToApiInput(input, mockNode, 0)).toThrow(NodeOperationError);
			expect(() => dataObjectToApiInput(input, mockNode, 0)).toThrow(
				"unexpected object input '{}' in row 0",
			);
		});

		it('should include correct row number in error message', () => {
			const input = { items: ['item1'] };

			expect(() => dataObjectToApiInput(input, mockNode, 5)).toThrow(
				'unexpected array input \'["item1"]\' in row 5',
			);
		});
	});

	describe('mixed data types', () => {
		it('should handle mixed valid data types', () => {
			const testDate = new Date('2025-09-01T12:00:00.000Z');
			const luxonDateTime = DateTime.fromISO('2025-09-02T10:30:00.000Z');
			const dateLikeObject = {
				toISOString: () => '2025-09-03T08:15:00.000Z',
			};

			const input = {
				name: 'John Doe',
				age: 30,
				isActive: true,
				createdAt: testDate,
				updatedAt: luxonDateTime,
				scheduledAt: dateLikeObject,
				deletedAt: null,
				description: undefined,
			};

			const result = dataObjectToApiInput(input, mockNode, 0);

			expect(result.name).toBe('John Doe');
			expect(result.age).toBe(30);
			expect(result.isActive).toBe(true);
			expect(result.createdAt).toBe(testDate);
			expect(result.updatedAt).toBeInstanceOf(Date);
			expect((result.updatedAt as Date).toISOString()).toBe('2025-09-02T10:30:00.000Z');
			expect(result.scheduledAt).toBeInstanceOf(Date);
			expect((result.scheduledAt as Date).toISOString()).toBe('2025-09-03T08:15:00.000Z');
			expect(result.deletedAt).toBe(null);
			expect(result.description).toBe(null);
		});
	});
});

describe('buildGetManyFilter', () => {
	describe('isEmpty/isNotEmpty translation', () => {
		it('should translate isEmpty to eq with null value', () => {
			const fieldEntries = [
				{ keyName: 'name', condition: 'isEmpty' as const, keyValue: 'ignored' },
			];

			const result = buildGetManyFilter(fieldEntries, ALL_CONDITIONS);

			expect(result).toEqual({
				type: 'and',
				filters: [
					{
						columnName: 'name',
						condition: 'eq',
						value: null,
					},
				],
			});
		});

		it('should translate isNotEmpty to neq with null value', () => {
			const fieldEntries = [
				{ keyName: 'email', condition: 'isNotEmpty' as const, keyValue: 'ignored' },
			];

			const result = buildGetManyFilter(fieldEntries, ANY_CONDITION);

			expect(result).toEqual({
				type: 'or',
				filters: [
					{
						columnName: 'email',
						condition: 'neq',
						value: null,
					},
				],
			});
		});

		it('should handle mixed conditions including isEmpty/isNotEmpty', () => {
			const fieldEntries = [
				{ keyName: 'name', condition: 'eq' as const, keyValue: 'John' },
				{ keyName: 'email', condition: 'isEmpty' as const, keyValue: 'ignored' },
				{ keyName: 'phone', condition: 'isNotEmpty' as const, keyValue: 'ignored' },
			];

			const result = buildGetManyFilter(fieldEntries, ALL_CONDITIONS);

			expect(result).toEqual({
				type: 'and',
				filters: [
					{
						columnName: 'name',
						condition: 'eq',
						value: 'John',
					},
					{
						columnName: 'email',
						condition: 'eq',
						value: null,
					},
					{
						columnName: 'phone',
						condition: 'neq',
						value: null,
					},
				],
			});
		});
	});

	describe('isTrue/isFalse translation', () => {
		it('should translate isTrue to eq with true value', () => {
			const fieldEntries = [
				{ keyName: 'isActive', condition: 'isTrue' as const, keyValue: 'ignored' },
			];

			const result = buildGetManyFilter(fieldEntries, ALL_CONDITIONS);

			expect(result).toEqual({
				type: 'and',
				filters: [
					{
						columnName: 'isActive',
						condition: 'eq',
						value: true,
					},
				],
			});
		});

		it('should translate isFalse to eq with false value', () => {
			const fieldEntries = [
				{ keyName: 'email', condition: 'isFalse' as const, keyValue: 'ignored' },
			];

			const result = buildGetManyFilter(fieldEntries, ANY_CONDITION);

			expect(result).toEqual({
				type: 'or',
				filters: [
					{
						columnName: 'email',
						condition: 'eq',
						value: false,
					},
				],
			});
		});

		it('should handle mixed conditions including isTrue/isFalse', () => {
			const fieldEntries = [
				{ keyName: 'name', condition: 'eq' as const, keyValue: 'John' },
				{ keyName: 'isActive', condition: 'isTrue' as const, keyValue: 'ignored' },
				{ keyName: 'isDeleted', condition: 'isFalse' as const, keyValue: 'ignored' },
			];

			const result = buildGetManyFilter(fieldEntries, ALL_CONDITIONS);

			expect(result).toEqual({
				type: 'and',
				filters: [
					{
						columnName: 'name',
						condition: 'eq',
						value: 'John',
					},
					{
						columnName: 'isActive',
						condition: 'eq',
						value: true,
					},
					{
						columnName: 'isDeleted',
						condition: 'eq',
						value: false,
					},
				],
			});
		});
	});

	it('should handle other conditions', () => {
		const fieldEntries = [
			{ keyName: 'age', condition: 'gt' as const, keyValue: 18 },
			{ keyName: 'name', condition: 'like' as const, keyValue: '%john%' },
		];

		const result = buildGetManyFilter(fieldEntries, ANY_CONDITION);

		expect(result).toEqual({
			type: 'or',
			filters: [
				{
					columnName: 'age',
					condition: 'gt',
					value: 18,
				},
				{
					columnName: 'name',
					condition: 'like',
					value: '%john%',
				},
			],
		});
	});
});
