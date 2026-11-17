import { BadRequestError } from '@n8n/errors';

import { encodeChatHistoryCursor, parseChatHistoryPage } from '../chat-history-page';

describe('parseChatHistoryPage', () => {
	it('asks for the whole thread without a limit', () => {
		expect(parseChatHistoryPage(undefined)).toBeUndefined();
		expect(parseChatHistoryPage({})).toBeUndefined();
	});

	it('asks for the newest turns with a limit', () => {
		expect(parseChatHistoryPage({ limit: 20 })).toEqual({ limit: 20 });
	});

	it('decodes the cursor that a page returns', () => {
		const position = { createdAt: new Date('2026-05-07T10:00:00.123Z'), id: 'execution|1' };

		expect(parseChatHistoryPage({ limit: 5, cursor: encodeChatHistoryCursor(position) })).toEqual({
			limit: 5,
			before: position,
		});
	});

	it.each(['', 'no-separator', '|execution-1', 'not-a-date|execution-1', '2026-05-07T10:00:00Z|'])(
		'rejects the cursor "%s"',
		(cursor) => {
			expect(() => parseChatHistoryPage({ limit: 5, cursor })).toThrow(BadRequestError);
		},
	);

	it('rejects a cursor without a limit', () => {
		expect(() => parseChatHistoryPage({ cursor: '2026-05-07T10:00:00.000Z|execution-1' })).toThrow(
			BadRequestError,
		);
	});
});
