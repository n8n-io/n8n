import { adjustPutItem } from '../utils';
import type { PutItemUi } from '../types';

describe('adjustPutItem', () => {
	it('should classify actual JS numbers as DynamoDB N type', () => {
		const result = adjustPutItem({ age: 34 } as unknown as PutItemUi);
		expect(result).toEqual({ age: { N: '34' } });
	});

	it('should classify numeric strings as DynamoDB S type', () => {
		const result = adjustPutItem({ id: '34' } as unknown as PutItemUi);
		expect(result).toEqual({ id: { S: '34' } });
	});

	it('should classify regular strings as DynamoDB S type', () => {
		const result = adjustPutItem({ name: 'hello' } as unknown as PutItemUi);
		expect(result).toEqual({ name: { S: 'hello' } });
	});

	it('should classify booleans as DynamoDB BOOL type', () => {
		const result = adjustPutItem({ active: true } as unknown as PutItemUi);
		expect(result).toEqual({ active: { BOOL: 'true' } });
	});

	it('should classify plain objects as DynamoDB M type', () => {
		const result = adjustPutItem({ meta: { foo: 'bar' } } as unknown as PutItemUi);
		expect(result).toEqual({ meta: { M: '[object Object]' } });
	});

	it('should handle zero as a number', () => {
		const result = adjustPutItem({ count: 0 } as unknown as PutItemUi);
		expect(result).toEqual({ count: { N: '0' } });
	});

	it('should handle string "0" as a string', () => {
		const result = adjustPutItem({ code: '0' } as unknown as PutItemUi);
		expect(result).toEqual({ code: { S: '0' } });
	});

	it('should handle floating point numbers', () => {
		const result = adjustPutItem({ price: 3.14 } as unknown as PutItemUi);
		expect(result).toEqual({ price: { N: '3.14' } });
	});

	it('should handle string that looks like a float as a string', () => {
		const result = adjustPutItem({ version: '3.14' } as unknown as PutItemUi);
		expect(result).toEqual({ version: { S: '3.14' } });
	});

	it('should handle multiple attributes with mixed types', () => {
		const result = adjustPutItem({
			id: '34',
			count: 5,
			name: 'test',
			active: false,
		} as unknown as PutItemUi);
		expect(result).toEqual({
			id: { S: '34' },
			count: { N: '5' },
			name: { S: 'test' },
			active: { BOOL: 'false' },
		});
	});
});
