import { EventEmitter } from 'events';
import type { MailBoxes } from 'imap';
import { Readable } from 'stream';
import { mock } from 'vitest-mock-extended';

import { ConnectionClosedError, ConnectionEndedError, ConnectionTimeoutError } from './errors';
import { ImapSimple, type CloseReason, type ReconnectOptions } from './imap-simple';
import { PartData } from './part-data';
import type { Message, MessagePart } from './types';
import { box, transportFactory, settle, type FakeImap } from '../test/fake-imap';

vi.mock('./part-data', () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	PartData: { fromData: vi.fn(() => ({ toString: () => 'decoded', buffer: Buffer.from('raw') })) },
}));

const connect = async (reconnect?: ReconnectOptions, init?: (t: FakeImap) => void) => {
	const factory = transportFactory(init);
	const connection = await ImapSimple.connectWith(factory.create, reconnect);
	return { connection, imap: factory.latest(), factory };
};

/** A fetch the test drives by hand, standing in for node-imap's ImapFetch. */
const drivenFetch = (imap: FakeImap) => {
	const fetch = new EventEmitter();
	imap.fetch.mockReturnValue(fetch as never);
	return fetch;
};

const deliver = async (fetch: EventEmitter, uid: number, which: string, body: string) => {
	const message = new EventEmitter();
	const stream = Readable.from(body);
	fetch.emit('message', message, uid);
	message.emit('body', stream, { which, size: Buffer.byteLength(body) });
	message.emit('attributes', { uid });
	await new Promise((resolve) => stream.on('end', resolve));
	message.emit('end');
};

describe('ImapSimple', () => {
	describe('connect', () => {
		it('resolves once the transport is ready', async () => {
			const { connection, imap } = await connect();

			expect(imap.connect).toHaveBeenCalled();
			expect(connection.endedByCaller).toBe(false);
		});

		it('selects the mailbox it is asked to watch', async () => {
			const { imap } = await connect({ mailbox: 'Archive' });

			expect(imap.openBox).toHaveBeenCalledWith('Archive', expect.any(Function));
		});

		it('leaves the mailbox alone when no reconnect is configured', async () => {
			const { imap } = await connect();

			expect(imap.openBox).not.toHaveBeenCalled();
		});

		it.each([
			['close', ConnectionClosedError],
			['end', ConnectionEndedError],
		] as const)('rejects when the transport emits %s', async (event, expected) => {
			const factory = transportFactory((t) => (t.connectResult = event));

			await expect(ImapSimple.connectWith(factory.create)).rejects.toThrow(expected);
		});

		it('reports an auth timeout as ConnectionTimeoutError', async () => {
			const factory = transportFactory((t) => {
				t.connectResult = 'error';
				t.connectError = Object.assign(new Error('timeout'), { source: 'timeout-auth' });
			});

			await expect(ImapSimple.connectWith(factory.create)).rejects.toThrow(ConnectionTimeoutError);
		});

		it('rejects when the mailbox cannot be selected', async () => {
			const factory = transportFactory((t) => (t.mailbox = new Error('no such mailbox')));

			await expect(ImapSimple.connectWith(factory.create, { mailbox: 'Nope' })).rejects.toThrow(
				'no such mailbox',
			);
		});
	});

	describe('arrivals', () => {
		it('reports new mail to the handler', async () => {
			const { connection, imap } = await connect();
			const arrived = vi.fn();
			connection.onArrival(arrived);

			imap.emit('mail', 3);
			await settle();

			expect(arrived).toHaveBeenCalledWith({ count: 3 });
		});

		it('holds mail that lands before a handler is registered', async () => {
			const { connection, imap } = await connect();
			imap.emit('mail', 2);
			await settle();

			const arrived = vi.fn();
			connection.onArrival(arrived);
			await settle();

			expect(arrived).toHaveBeenCalledWith({ count: 2 });
		});

		it('serialises handler runs', async () => {
			const { connection, imap } = await connect();
			let running = 0;
			let overlapped = false;

			connection.onArrival(async () => {
				running += 1;
				if (running > 1) overlapped = true;
				await settle(1);
				running -= 1;
			});

			imap.emit('mail', 1);
			imap.emit('mail', 1);
			await settle(6);

			expect(overlapped).toBe(false);
		});

		it('reports a handler that throws', async () => {
			const { connection, imap } = await connect();
			const failed = vi.fn();
			connection.onError(failed);
			connection.onArrival(() => {
				throw new Error('handler blew up');
			});

			imap.emit('mail', 1);
			await settle();

			expect(failed).toHaveBeenCalledWith(expect.objectContaining({ message: 'handler blew up' }));
		});

		it('stays silent once the caller has ended it', async () => {
			const { connection, imap } = await connect();
			const arrived = vi.fn();
			connection.onArrival(arrived);

			connection.end();
			imap.emit('mail', 1);
			await settle();

			expect(arrived).not.toHaveBeenCalled();
		});
	});

	describe('flags', () => {
		it('reports metadata changes', async () => {
			const { connection, imap } = await connect();
			const changed = vi.fn();
			connection.onFlags(changed);

			imap.emit('update', 7, { num: 1, text: 'FLAGS' });

			expect(changed).toHaveBeenCalledWith({ seqNo: 7, info: { num: 1, text: 'FLAGS' } });
		});
	});

	describe('close', () => {
		const closeReason = async (act: (imap: FakeImap, connection: ImapSimple) => void) => {
			const { connection, imap } = await connect();
			const closed = vi.fn<(reason: CloseReason) => void>();
			connection.onClose(closed);
			connection.onError(vi.fn());

			act(imap, connection);
			await settle();

			return closed;
		};

		it('is `ended` when the caller ends it', async () => {
			const closed = await closeReason((_imap, connection) => connection.end());

			expect(closed).toHaveBeenCalledWith('ended');
		});

		it('is `dropped` when the server goes away silently', async () => {
			const closed = await closeReason((imap) => imap.drop());

			expect(closed).toHaveBeenCalledWith('dropped');
		});

		it('is `error` when a failure preceded it', async () => {
			const closed = await closeReason((imap) => imap.drop(new Error('ECONNRESET')));

			expect(closed).toHaveBeenCalledWith('error');
		});

		it('is reported once', async () => {
			const closed = await closeReason((imap) => {
				imap.drop();
				imap.drop();
			});

			expect(closed).toHaveBeenCalledTimes(1);
		});

		it('silences everything that follows', async () => {
			const { connection, imap } = await connect();
			const failed = vi.fn();
			connection.onError(failed);
			connection.onClose(vi.fn());

			imap.drop();
			await settle();
			imap.emit('error', new Error('late'));

			expect(failed).not.toHaveBeenCalled();
		});
	});

	describe('end', () => {
		it('tears the transport down and suppresses its parting errors', async () => {
			const { connection, imap } = await connect();

			connection.end();

			expect(imap.end).toHaveBeenCalled();
			expect(() => imap.emit('error', new Error('ECONNRESET'))).not.toThrow();
		});

		it('destroys a transport that never answers the logout', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			try {
				const { connection, imap } = await connect();
				imap.answersLogout = false;

				connection.end();
				await vi.advanceTimersByTimeAsync(2000);

				expect(imap.destroy).toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});

		it('leaves a transport that closes cleanly alone', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			try {
				const { connection, imap } = await connect();

				connection.end();
				await settle();
				await vi.advanceTimersByTimeAsync(5000);

				expect(imap.destroy).not.toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});

		it('marks the connection as ended by the caller', async () => {
			const { connection } = await connect();

			connection.end();

			expect(connection.endedByCaller).toBe(true);
		});
	});

	describe('search', () => {
		it('resolves with the messages the fetch returned', async () => {
			const { connection, imap } = await connect();
			imap.search.mockImplementation((_criteria, onResult) =>
				onResult(null as unknown as Error, [1, 2]),
			);
			const fetch = drivenFetch(imap);

			const searching = connection.search(['UNSEEN', ['FROM', 'test@n8n.io']], {
				bodies: ['BODY'],
			});
			expect(imap.search).toHaveBeenCalledWith(
				['UNSEEN', ['FROM', 'test@n8n.io']],
				expect.any(Function),
			);

			await deliver(fetch, 1, 'TEXT', 'body1');
			await deliver(fetch, 2, 'TEXT', 'body2');
			fetch.emit('end');

			await expect(searching).resolves.toEqual([
				{ attributes: { uid: 1 }, parts: [{ body: 'body1', size: 5, which: 'TEXT' }], seqNo: 1 },
				{ attributes: { uid: 2 }, parts: [{ body: 'body2', size: 5, which: 'TEXT' }], seqNo: 2 },
			]);
		});

		it('resolves empty without fetching when nothing matched', async () => {
			const { connection, imap } = await connect();
			imap.search.mockImplementation((_criteria, onResult) =>
				onResult(null as unknown as Error, []),
			);

			await expect(connection.search(['UNSEEN'], {})).resolves.toEqual([]);
			expect(imap.fetch).not.toHaveBeenCalled();
		});

		it('fetches only up to the limit', async () => {
			const { connection, imap } = await connect();
			imap.search.mockImplementation((_criteria, onResult) =>
				onResult(null as unknown as Error, [1, 2, 3]),
			);
			const fetch = drivenFetch(imap);

			const searching = connection.search(['UNSEEN'], {}, 2);
			await deliver(fetch, 1, 'TEXT', 'a');
			await deliver(fetch, 2, 'TEXT', 'b');
			await searching;

			expect(imap.fetch).toHaveBeenCalledWith([1, 2], {});
		});

		it('rejects when the search itself fails', async () => {
			const { connection, imap } = await connect();
			imap.search.mockImplementation((_criteria, onResult) => onResult(new Error('nope'), []));

			await expect(connection.search(['UNSEEN'], {})).rejects.toThrow('nope');
		});

		it('does not throw if the fetch errors after it ended', async () => {
			const { connection, imap } = await connect();
			imap.search.mockImplementation((_criteria, onResult) =>
				onResult(null as unknown as Error, [1]),
			);
			const fetch = drivenFetch(imap);

			const searching = connection.search(['UNSEEN'], { bodies: ['BODY'] });
			await deliver(fetch, 1, 'TEXT', 'body');
			fetch.emit('end');
			await searching;

			expect(() => fetch.emit('error', new Error('late error'))).not.toThrow();
		});
	});

	describe('part decoding', () => {
		const fetchBody = async (encoding: MessagePart['encoding'], body = 'encoded-body') => {
			const { connection, imap } = await connect();
			const fetch = drivenFetch(imap);
			const struct = [{ partID: '1.2', type: 'TEXT', subtype: 'plain', encoding }];

			const downloading = connection.downloadText(
				mock<Message>({ attributes: { uid: 123, struct } } as never),
				'plain',
			);
			await deliver(fetch, 123, '1.2', body);
			fetch.emit('end');
			await downloading;

			return fetch;
		};

		it('decodes with the part encoding', async () => {
			await fetchBody('BASE64');

			expect(PartData.fromData).toHaveBeenCalledWith('encoded-body', 'BASE64');
		});

		it('defaults to 7BIT when the part carries no encoding', async () => {
			await fetchBody(null);

			expect(PartData.fromData).toHaveBeenCalledWith('encoded-body', '7BIT');
		});

		it('does not throw if the fetch errors after it ended', async () => {
			const fetch = await fetchBody('BASE64');

			expect(() => fetch.emit('error', new Error('late error'))).not.toThrow();
		});
	});

	describe('downloadText', () => {
		const textMessage = (struct: unknown) =>
			mock<Message>({ attributes: { uid: 1, struct } } as never);

		it('returns the body of the wanted subtype', async () => {
			const { connection, imap } = await connect();
			const fetch = drivenFetch(imap);
			const struct = [{ partID: '1', type: 'TEXT', subtype: 'plain', encoding: '7BIT' }];

			const downloading = connection.downloadText(textMessage(struct), 'plain');
			await deliver(fetch, 1, '1', 'hello');
			fetch.emit('end');

			await expect(downloading).resolves.toBe('decoded');
		});

		it('is empty when the message has no such part', async () => {
			const { connection } = await connect();
			const struct = [{ partID: '1', type: 'TEXT', subtype: 'html', encoding: '7BIT' }];

			await expect(connection.downloadText(textMessage(struct), 'plain')).resolves.toBe('');
		});

		it('is empty when the message has no structure at all', async () => {
			const { connection } = await connect();

			await expect(connection.downloadText(textMessage(undefined), 'plain')).resolves.toBe('');
		});

		it('is empty when the part cannot be fetched', async () => {
			const { connection, imap } = await connect();
			const fetch = drivenFetch(imap);
			const struct = [{ partID: '1', type: 'TEXT', subtype: 'plain', encoding: '7BIT' }];

			const downloading = connection.downloadText(textMessage(struct), 'plain');
			fetch.emit('error', new Error('gone'));

			await expect(downloading).resolves.toBe('');
		});
	});

	describe('downloadAttachments', () => {
		it('returns every attachment part with its filename', async () => {
			const { connection, imap } = await connect();
			const fetch = drivenFetch(imap);
			const struct = [
				{ partID: '1', type: 'TEXT', subtype: 'plain', encoding: '7BIT' },
				{
					partID: '2',
					type: 'APPLICATION',
					subtype: 'pdf',
					encoding: 'BASE64',
					disposition: { type: 'ATTACHMENT', params: { filename: 'report.pdf' } },
				},
			];

			const downloading = connection.downloadAttachments(
				mock<Message>({ attributes: { uid: 1, struct } } as never),
			);
			await deliver(fetch, 1, '2', 'payload');
			fetch.emit('end');

			await expect(downloading).resolves.toEqual([
				{ filename: 'report.pdf', content: Buffer.from('raw') },
			]);
		});

		it('is empty when the message has no structure at all', async () => {
			const { connection } = await connect();

			await expect(
				connection.downloadAttachments(mock<Message>({ attributes: { uid: 1 } } as never)),
			).resolves.toEqual([]);
		});
	});

	describe('openBox', () => {
		it('resolves with the opened mailbox', async () => {
			const { connection, imap } = await connect();
			imap.mailbox = box(4);

			await expect(connection.openBox('INBOX')).resolves.toEqual(box(4));
		});

		it('rejects on error', async () => {
			const { connection, imap } = await connect();
			imap.mailbox = new Error('nope');

			await expect(connection.openBox('INBOX')).rejects.toThrow('nope');
		});
	});

	describe('addFlags', () => {
		it('adds flags to the given messages', async () => {
			const { connection, imap } = await connect();
			imap.addFlags.mockImplementation((_uids, _flags, onAdd) => onAdd(null as unknown as Error));

			await expect(connection.addFlags([1, 2], ['\\Seen'])).resolves.toBeUndefined();
			expect(imap.addFlags).toHaveBeenCalledWith([1, 2], ['\\Seen'], expect.any(Function));
		});

		it('rejects on error', async () => {
			const { connection, imap } = await connect();
			imap.addFlags.mockImplementation((_uids, _flags, onAdd) => onAdd(new Error('refused')));

			await expect(connection.addFlags([1], '\\Seen')).rejects.toThrow('refused');
		});
	});

	describe('getBoxes', () => {
		it('resolves with the mailbox list', async () => {
			const { connection, imap } = await connect();
			// eslint-disable-next-line @typescript-eslint/naming-convention
			const boxes = mock<MailBoxes>({ INBOX: {}, Archive: {} });
			imap.getBoxes.mockImplementation((onBoxes) => onBoxes(null, boxes));

			await expect(connection.getBoxes()).resolves.toEqual(boxes);
		});

		it('rejects on error', async () => {
			const { connection, imap } = await connect();
			imap.getBoxes.mockImplementation((onBoxes) => onBoxes(new Error('getBoxes failed')));

			await expect(connection.getBoxes()).rejects.toThrow('getBoxes failed');
		});
	});
});
