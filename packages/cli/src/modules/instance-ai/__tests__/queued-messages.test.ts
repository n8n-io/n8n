import type { InstanceAiQueuedMessage } from '@n8n/api-types';

import {
	QUEUED_MESSAGES_METADATA_KEY,
	QUEUED_MESSAGES_METADATA_KEY as KEY,
	mergeQueuedMessages,
	readQueuedMessages,
	toQueuedMessageList,
	withQueuedMessages,
} from '../storage/queued-messages';

const message = (overrides: Partial<InstanceAiQueuedMessage> = {}): InstanceAiQueuedMessage => ({
	id: 'qm-1',
	text: 'Use the Slack node',
	createdAt: '2026-01-01T00:00:00.000Z',
	...overrides,
});

describe('queued messages metadata', () => {
	it('reads a well-formed queue', () => {
		const metadata = { [KEY]: [message()] };

		expect(readQueuedMessages(metadata)).toEqual([message()]);
	});

	it('keeps a sent timestamp', () => {
		const steering = message({ sentAt: '2026-01-01T00:01:00.000Z' });

		expect(readQueuedMessages({ [KEY]: [steering] })).toEqual([steering]);
	});

	it('reads an empty queue from metadata that never held one', () => {
		expect(readQueuedMessages(undefined)).toEqual([]);
		expect(readQueuedMessages({})).toEqual([]);
		expect(readQueuedMessages({ [KEY]: 'not-an-array' })).toEqual([]);
	});

	// The column is a JSON blob shared with other thread features, so a shape
	// written by an older or newer client must not take the whole queue down.
	it('drops entries that are not queued messages and keeps the readable ones', () => {
		const metadata = {
			[KEY]: [
				message(),
				null,
				'string',
				{ id: 'qm-2' },
				message({ id: 'qm-3', createdAt: 123 as unknown as string }),
				message({ id: 'qm-4', sentAt: 5 as unknown as string }),
				message({ id: 'qm-5', text: 99 as unknown as string }),
			],
		};

		expect(readQueuedMessages(metadata).map((item) => item.id)).toEqual(['qm-1']);
	});

	it('leaves other thread metadata untouched', () => {
		const metadata = { source: 'chat', creditsUsed: 3 };

		expect(withQueuedMessages(metadata, [message()])).toEqual({
			source: 'chat',
			creditsUsed: 3,
			[KEY]: [message()],
		});
	});

	it('drops the key when the queue is empty', () => {
		const metadata = { source: 'chat', [QUEUED_MESSAGES_METADATA_KEY]: [message()] };

		expect(withQueuedMessages(metadata, [])).toEqual({ source: 'chat' });
	});

	it('maps the stored shape onto the API shape', () => {
		expect(toQueuedMessageList([message({ sentAt: '2026-01-01T00:01:00.000Z' })])).toEqual([
			message({ sentAt: '2026-01-01T00:01:00.000Z' }),
		]);
	});

	it('omits an unset sent time from the API shape', () => {
		expect(toQueuedMessageList([message()])).toEqual([message()]);
		expect(toQueuedMessageList([message()])[0]).not.toHaveProperty('sentAt');
	});

	it('merges the queue into one turn under the head, joined with newlines', () => {
		const merged = mergeQueuedMessages([
			message({ id: 'qm-1', text: 'first' }),
			message({ id: 'qm-2', text: 'second', sentAt: '2026-01-01T00:02:00.000Z' }),
			message({ id: 'qm-3', text: 'third', sentAt: '2026-01-01T00:01:00.000Z' }),
		]);

		expect(merged).toEqual({
			id: 'qm-1',
			text: 'first\nsecond\nthird',
			createdAt: '2026-01-01T00:00:00.000Z',
			sentAt: '2026-01-01T00:01:00.000Z',
		});
		expect(mergeQueuedMessages([])).toBeUndefined();
	});
});
