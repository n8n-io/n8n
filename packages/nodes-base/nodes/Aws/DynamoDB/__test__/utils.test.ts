import type { PutItemUi } from '../types';
import { adjustPutItem } from '../utils';

describe('adjustPutItem', () => {
	it('maps actual numbers to N', () => {
		expect(adjustPutItem({ count: 42 } as unknown as PutItemUi)).toEqual({
			count: { N: '42' },
		});
	});

	it('parses numeric strings as N when autoParseNumbers is enabled', () => {
		expect(
			adjustPutItem({ id: '34', executionId: '1234567890' } as unknown as PutItemUi, true),
		).toEqual({
			id: { N: '34' },
			executionId: { N: '1234567890' },
		});
	});

	it('keeps numeric strings as S when autoParseNumbers is disabled', () => {
		expect(
			adjustPutItem({ id: '34', executionId: '1234567890' } as unknown as PutItemUi, false),
		).toEqual({
			id: { S: '34' },
			executionId: { S: '1234567890' },
		});
	});

	it('maps booleans to BOOL', () => {
		expect(adjustPutItem({ active: true } as unknown as PutItemUi)).toEqual({
			active: { BOOL: 'true' },
		});
	});

	it('maps non-numeric strings to S', () => {
		expect(adjustPutItem({ name: 'hello' } as unknown as PutItemUi)).toEqual({
			name: { S: 'hello' },
		});
	});
});
