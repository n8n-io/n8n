import { adjustPutItem } from '../utils';

describe('adjustPutItem', () => {
	it('keeps regular strings as S', () => {
		expect(adjustPutItem({ name: 'hello' })).toEqual({
			name: { S: 'hello' },
		});
	});

	it('keeps numeric strings as S', () => {
		expect(adjustPutItem({ id: '34', executionId: '1234567890' })).toEqual({
			id: { S: '34' },
			executionId: { S: '1234567890' },
		});
	});

	it('maps numbers to N', () => {
		expect(adjustPutItem({ count: 42, price: 9.99 })).toEqual({
			count: { N: '42' },
			price: { N: '9.99' },
		});
	});

	it('maps booleans to BOOL', () => {
		expect(adjustPutItem({ active: true })).toEqual({
			active: { BOOL: 'true' },
		});
	});

	it('maps objects to M', () => {
		expect(adjustPutItem({ meta: { key: 'val' } })).toEqual({
			meta: { M: '[object Object]' },
		});
	});
});
